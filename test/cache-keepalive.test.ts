import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fauxAssistantMessage, fauxProvider } from "@earendil-works/pi-ai/providers/faux";
import { CacheKeepalive, type PingResult, type Timers } from "../src/cache-keepalive.js";
import { isClaudeModel, longCacheSupported, readCacheModes, writeCacheMode } from "../src/model-cache.js";
import { UserModelService } from "../src/models.js";
import { defaultInstanceConfig } from "../src/config.js";
import { bootstrapUserDir } from "../src/paths.js";

/** Timers a test fires by hand. */
function fakeTimers() {
  let next = 1;
  const pending = new Map<number, () => void>();
  const timers: Timers = {
    set: (fn) => {
      const id = next++;
      pending.set(id, fn);
      return id;
    },
    clear: (h) => void pending.delete(h as number),
  };
  const fire = async () => {
    const [id, fn] = [...pending][0] ?? [];
    if (id === undefined || !fn) throw new Error("no timer is waiting");
    pending.delete(id);
    fn();
    // the ping is async: let it settle
    await new Promise((r) => setTimeout(r, 0));
  };
  return { timers, fire, waiting: () => pending.size };
}

const read = (n: number): PingResult => ({ cacheRead: n, cacheWrite: 0, input: 5 });

describe("CacheKeepalive", () => {
  it("pings on the timer, keeps going while the cache is read, and stops after the cap", async () => {
    const t = fakeTimers();
    const ka = new CacheKeepalive(t.timers, 1000, 3);
    let sent = 0;
    ka.arm("chat|m/x", "m/x", async () => {
      sent++;
      return read(2000);
    });
    expect(t.waiting()).toBe(1);
    await t.fire();
    expect(sent).toBe(1);
    expect(ka.status("m/x")).toMatchObject({ sent: 1, lastRead: 2000, active: 1, stopped: null });
    await t.fire();
    await t.fire();
    // the third ping was the last: nothing is scheduled after the cap
    expect(sent).toBe(3);
    expect(t.waiting()).toBe(0);
    expect(ka.status("m/x").active).toBe(0);
  });

  it("a real request pauses it, and the reply that follows starts the count again", async () => {
    const t = fakeTimers();
    const ka = new CacheKeepalive(t.timers, 1000, 8);
    let sent = 0;
    const send = async () => {
      sent++;
      return read(100);
    };
    ka.arm("c|m/x", "m/x", send);
    await t.fire();
    ka.pause("c|m/x");
    expect(t.waiting()).toBe(0);
    ka.arm("c|m/x", "m/x", send);
    await t.fire();
    expect(sent).toBe(2);
    expect(ka.status("m/x").active).toBe(1);
  });

  it("a ping answered after a real request came is ignored", async () => {
    const t = fakeTimers();
    const ka = new CacheKeepalive(t.timers, 1000, 8);
    let release!: (r: PingResult) => void;
    ka.arm("c|m/x", "m/x", () => new Promise<PingResult>((r) => (release = r)));
    await t.fire();
    ka.pause("c|m/x");
    release(read(50));
    await new Promise((r) => setTimeout(r, 0));
    expect(ka.status("m/x")).toMatchObject({ sent: 0, active: 0 });
    expect(t.waiting()).toBe(0);
  });

  it("a ping that read nothing stops it for the model until the setting changes", async () => {
    const t = fakeTimers();
    const ka = new CacheKeepalive(t.timers, 1000, 8);
    ka.arm("c|m/x", "m/x", async () => read(0));
    await t.fire();
    expect(ka.status("m/x").stopped).toMatch(/did not read the cache/);
    expect(t.waiting()).toBe(0);
    // the next reply does not start it again
    ka.arm("c|m/x", "m/x", async () => read(0));
    expect(t.waiting()).toBe(0);
    // changing the setting forgets the block
    ka.reset("m/x");
    ka.arm("c|m/x", "m/x", async () => read(10));
    expect(t.waiting()).toBe(1);
    expect(ka.status("m/x").stopped).toBeNull();
  });

  it("a failed ping stops that chat and says why, without blocking the model", async () => {
    const t = fakeTimers();
    const ka = new CacheKeepalive(t.timers, 1000, 8);
    ka.arm("c|m/x", "m/x", async () => {
      throw new Error("429 too many requests");
    });
    await t.fire();
    expect(ka.status("m/x").stopped).toMatch(/429 too many requests/);
    expect(t.waiting()).toBe(0);
    ka.arm("c|m/x", "m/x", async () => read(10));
    expect(t.waiting()).toBe(1);
  });
});

describe("model-cache.json", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "model-cache-"));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("stores only models that are not on default, and refuses bad input", () => {
    expect(readCacheModes(dir)).toEqual({});
    writeCacheMode(dir, "anthropic/claude-x", "long");
    writeCacheMode(dir, "openai/gpt-x", "keepalive");
    expect(readCacheModes(dir)).toEqual({ "anthropic/claude-x": "long", "openai/gpt-x": "keepalive" });
    writeCacheMode(dir, "anthropic/claude-x", "default");
    expect(readCacheModes(dir)).toEqual({ "openai/gpt-x": "keepalive" });
    expect(() => writeCacheMode(dir, "no-slash", "long")).toThrow(/provider\/model/);
    expect(() => writeCacheMode(dir, "a/b", "forever")).toThrow(/mode must be/);
    // a hand edit that is nonsense is ignored, never thrown
    fs.writeFileSync(path.join(dir, "model-cache.json"), JSON.stringify({ models: { "a/b": "forever", "c/d": "long", bad: "long" } }));
    expect(readCacheModes(dir)).toEqual({ "c/d": "long" });
  });
});

describe("cache settings on a model call", () => {
  let dataDir: string;
  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "cache-gen-"));
  });
  afterEach(() => fs.rmSync(dataDir, { recursive: true, force: true }));

  const service = (id: string, baseUrl = "https://faux.example/v1") => {
    const paths = bootstrapUserDir(dataDir, "alice");
    const svc = new UserModelService("alice", paths, defaultInstanceConfig());
    const handle = fauxProvider({ models: [{ id }] });
    // the faux model says localhost, and keep-alive never runs against a model on the user's own machine
    (handle.getModel(id) as { baseUrl: string }).baseUrl = baseUrl;
    svc.models.setProvider(handle.provider);
    return { svc, handle, root: paths.root };
  };

  it("long asks pi-ai for the long lifetime, and default does not", async () => {
    // a host that honours it (OpenAI's own)
    const { svc, handle } = service("faux-life", "https://api.openai.com/v1");
    const seen: Array<unknown> = [];
    const answer = (_c: unknown, options: unknown) => {
      seen.push((options as { cacheRetention?: string })?.cacheRetention);
      return fauxAssistantMessage("ok");
    };
    handle.setResponses([answer, answer]);
    await svc.generate({ model: "faux/faux-life", messages: [{ role: "user", content: "hi" }] });
    await svc.setCacheMode("faux/faux-life", "long");
    await svc.generate({ model: "faux/faux-life", messages: [{ role: "user", content: "hi" }] });
    expect(seen).toEqual([undefined, "long"]);
    const info = (await svc.available()).find((m) => m.modelId === "faux-life");
    expect(info).toMatchObject({ cache: "long", cacheLong: true });
  }, 20_000);

  it("long is refused, and never sent, where the connection does not honour it", async () => {
    const { svc, handle, root } = service("faux-gw");
    await expect(svc.setCacheMode("faux/faux-gw", "long")).rejects.toThrow(/does not honour/);
    expect((await svc.available()).find((m) => m.modelId === "faux-gw")?.cacheLong).toBe(false);
    // a value left in the file from before is not sent either
    writeCacheMode(root, "faux/faux-gw", "long");
    const seen: Array<unknown> = [];
    handle.setResponses([
      (_c: unknown, options: unknown) => {
        seen.push((options as { cacheRetention?: string })?.cacheRetention);
        return fauxAssistantMessage("ok");
      },
    ]);
    await svc.generate({ model: "faux/faux-gw", messages: [{ role: "user", content: "hi" }] });
    expect(seen).toEqual([undefined]);
  }, 20_000);

  it("keep-alive needs a price, then replays the reply's request with a tiny answer limit", async () => {
    const { svc, handle } = service("faux-keep");
    await expect(svc.setCacheMode("faux/faux-keep", "keepalive")).rejects.toThrow(/known price/);
    svc.setPricingOverride("faux/faux-keep", { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 });
    await svc.setCacheMode("faux/faux-keep", "keepalive");

    const t = fakeTimers();
    (svc as unknown as { keepalive: CacheKeepalive }).keepalive = new CacheKeepalive(t.timers, 1000, 8);
    const seen: Array<{ maxTokens?: number; sessionId?: string; text: string }> = [];
    const answer = (ctx: { messages: Array<{ content: unknown }> }, options: unknown) => {
      const o = options as { maxTokens?: number; sessionId?: string };
      seen.push({ ...(o.maxTokens !== undefined ? { maxTokens: o.maxTokens } : {}), sessionId: o.sessionId, text: JSON.stringify(ctx.messages[0]?.content) });
      return fauxAssistantMessage("ok");
    };
    handle.setResponses([answer, answer, answer]);
    const req = { model: "faux/faux-keep", sessionId: "chat-1", paramsKey: "reply", source: "app:roleplay/engine", messages: [{ role: "user" as const, content: "a long story so far" }], presetParams: { max_tokens: 900 } };
    await svc.generate(req);
    expect(t.waiting()).toBe(1);
    await t.fire();
    // the same chat, the same words, a 16-token answer
    expect(seen).toHaveLength(2);
    expect(seen[1]).toMatchObject({ maxTokens: 16, sessionId: "chat-1", text: seen[0]?.text });
    expect(svc.keepaliveStatus("faux/faux-keep")).toMatchObject({ sent: 1, active: 1 });
    expect(svc.keepaliveStatus("faux/faux-keep").lastRead).toBeGreaterThan(0);
    // a real request for the chat pauses it; the answer arms it again
    await svc.generate(req);
    expect(t.waiting()).toBe(1);
  }, 20_000);

  it("keep-alive leaves alone what is not a chat reply, and models left on default", async () => {
    const { svc, handle } = service("faux-other");
    svc.setPricingOverride("faux/faux-other", { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 });
    const t = fakeTimers();
    (svc as unknown as { keepalive: CacheKeepalive }).keepalive = new CacheKeepalive(t.timers, 1000, 8);
    handle.setResponses([fauxAssistantMessage("a"), fauxAssistantMessage("b"), fauxAssistantMessage("c")]);
    const base = { model: "faux/faux-other", sessionId: "c1", source: "app:roleplay/engine", messages: [{ role: "user" as const, content: "story" }] };
    // default mode: nothing is held
    await svc.generate({ ...base, paramsKey: "reply" });
    expect(t.waiting()).toBe(0);
    await svc.setCacheMode("faux/faux-other", "keepalive");
    // another request of the same chat (a sensor, a summary) is not the cache worth keeping
    await svc.generate({ ...base, paramsKey: "sensor" });
    expect(t.waiting()).toBe(0);
    expect(svc.keepaliveStatus("faux/faux-other").skipped).toBeNull();
    // tools cannot be replayed as they were, and the panel is told why
    await svc.generate({ ...base, paramsKey: "reply", tools: [{ name: "t", description: "d", parameters: { type: "object", properties: {} } } as never] });
    expect(t.waiting()).toBe(0);
  }, 20_000);

  it("says why a reply was not held, and lets a thinking model that is not Claude be kept", async () => {
    const { svc, handle, root } = service("faux-why");
    await svc.setCacheMode("faux/faux-why", "default");
    const t = fakeTimers();
    (svc as unknown as { keepalive: CacheKeepalive }).keepalive = new CacheKeepalive(t.timers, 1000, 8);
    handle.setResponses([fauxAssistantMessage("a"), fauxAssistantMessage("b"), fauxAssistantMessage("c")]);
    const req = { model: "faux/faux-why", sessionId: "c9", paramsKey: "reply", source: "app:roleplay/engine", messages: [{ role: "user" as const, content: "story" }], reasoning: "high" as const };
    // no price yet: set the mode by hand, since setCacheMode would refuse
    writeCacheMode(root, "faux/faux-why", "keepalive");
    await svc.generate(req);
    expect(svc.keepaliveStatus("faux/faux-why").skipped).toMatch(/no known price/);
    svc.setPricingOverride("faux/faux-why", { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 });
    await svc.generate(req);
    // a thinking model that is not Claude is held (the faux provider reports a cache read from the second reply on)
    expect(svc.keepaliveStatus("faux/faux-why").skipped).toBeNull();
    expect(t.waiting()).toBe(1);
  }, 20_000);
});

describe("which connections get what", () => {
  const shape = (api: string, id: string, baseUrl: string) => ({ api, id, baseUrl });
  it("the long lifetime only where it was seen to work", () => {
    expect(longCacheSupported(shape("anthropic-messages", "claude-x", "https://api.anthropic.com"))).toBe(true);
    expect(longCacheSupported(shape("openai-completions", "anthropic/claude-x", "https://openrouter.ai/api/v1"))).toBe(true);
    expect(longCacheSupported(shape("openai-responses", "gpt-x", "https://api.openai.com/v1"))).toBe(true);
    // measured: the gateway ignores the Claude ttl, and a Gemini model refuses the cache key that goes with it
    expect(longCacheSupported(shape("openai-completions", "anthropic/claude-x", "https://nano-gpt.com/api/v1"))).toBe(false);
    expect(longCacheSupported(shape("openai-completions", "google/gemini-4-argon", "https://nano-gpt.com/api/v1"))).toBe(false);
    expect(longCacheSupported(shape("openai-completions", "openai/gpt-x", "https://openrouter.ai/api/v1"))).toBe(false);
    expect(longCacheSupported(shape("openai-completions", "x", "not a url"))).toBe(false);
  });
  it("tells Claude from the rest", () => {
    expect(isClaudeModel(shape("openai-completions", "anthropic/claude-haiku-5.5", "https://nano-gpt.com/api/v1"))).toBe(true);
    expect(isClaudeModel(shape("anthropic-messages", "x", "https://api.anthropic.com"))).toBe(true);
    expect(isClaudeModel(shape("openai-completions", "google/gemini-3.8-flash", "https://nano-gpt.com/api/v1"))).toBe(false);
  });
});
