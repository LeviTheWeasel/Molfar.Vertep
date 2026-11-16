// Where a sandbox call's time went (#422): the worker's measurements, the host's waits, the log line and the
// sentence a time-limit error carries to the user.
import { describe, expect, it } from "bun:test";
import { PluginSandbox } from "../src/plugins/sandbox.js";
import { isTimeLimitError, type SandboxTiming, timingCause, timingLine, timingNote } from "../src/plugins/sandbox-timing.js";

const t = (over: Partial<SandboxTiming>): SandboxTiming => ({ startedAt: 0, runMs: 10_000, cpuMs: 9_500, pausedMs: 0, longestPauseMs: 0, overlap: 0, gateMs: 0, queueMs: 0, ...over });

describe("what ate the time", () => {
  it("the plugin's own work: CPU busy, the script hardly stood still", () => {
    expect(timingCause(t({}))).toContain("plugin's own work");
  });
  it("a device that gave the engine no CPU: little CPU, long pauses", () => {
    expect(timingCause(t({ cpuMs: 1_200, pausedMs: 8_000, longestPauseMs: 7_500 }))).toContain("little CPU");
  });
  it("another call in the same worker: CPU busy, long pauses, an overlap", () => {
    expect(timingCause(t({ cpuMs: 9_800, pausedMs: 6_000, overlap: 1 }))).toContain("same worker");
  });
  it("says nothing when the numbers are unclear", () => {
    expect(timingCause(t({ cpuMs: null, pausedMs: 6_000 }))).toBeNull();
  });
  it("the log line and the note carry the numbers", () => {
    const x = t({ runMs: 31_200, cpuMs: 3_900, pausedMs: 26_800, longestPauseMs: 25_000, gateMs: 100 });
    expect(timingLine(x)).toBe("31.3 s in all, waited 0.1 s for the data folder and 0.0 s for a worker (starting one included), ran 31.2 s, engine CPU 3.9 s, script stood still 26.8 s (longest 25.0 s), 0 other call(s) in the same worker");
    expect(timingNote(x)).toBe("(ran 31.2 s, engine CPU 3.9 s, script stood still 26.8 s: the device gave the engine little CPU during the call (a phone pausing the engine app in the background, or a computer busy with something else))");
  });
  it("knows a time-limit error", () => {
    expect(isTimeLimitError("The script execution has exceeded the maximum allowed time limit.")).toBe(true);
    expect(isTimeLimitError("QuickJSUnwrapError: interrupted")).toBe(true);
    expect(isTimeLimitError("text required")).toBe(false);
  });
});

describe("a real sandbox call", () => {
  it("reports its timing: a busy loop runs on the CPU and does not stand still", async () => {
    const box = new PluginSandbox();
    const src = "export function uiPanel() { const end = Date.now() + 400; let n = 0; while (Date.now() < end) n++; return { n }; }";
    const r = await box.eval({ source: src, hook: "uiPanel", ctx: {}, storeSnapshot: {} });
    expect(r.ok).toBe(true);
    const x = r.timing;
    if (!x) throw new Error("no timing on the answer");
    expect(x.runMs).toBeGreaterThanOrEqual(400);
    expect(x.pausedMs).toBeLessThan(250);
    expect(x.overlap).toBe(0);
    expect(x.gateMs).toBe(0);
    expect(x.queueMs).toBeGreaterThanOrEqual(0);
    if (x.cpuMs != null) expect(x.cpuMs).toBeGreaterThan(200);
  }, 30_000);
  it("a call that runs out of time says where the time went", async () => {
    const box = new PluginSandbox();
    const src = "export function uiPanel() { for (;;) {} }";
    const r = await box.eval({ source: src, hook: "uiPanel", ctx: {}, storeSnapshot: {}, label: "loop route GET /x", executionTimeoutMs: 1_000 });
    expect(r.ok).toBe(false);
    expect(isTimeLimitError(r.error)).toBe(true);
    expect(r.error).toMatch(/\(ran \d+\.\d s/);
    expect(r.error).toContain("the plugin's own work took this long");
  }, 30_000);
});
