// How long a provider is asked to keep a model's prompt cache (#112). One setting per model, in
// <workspace>/model-cache.json, apart from model-params.json because it belongs to the model and not
// to whoever calls it (a chat, a plugin, the agent):
//   default   what the provider does by itself (about 5 minutes for Claude and GPT)
//   long      ask for the long lifetime: pi-ai sends `ttl: "1h"` in Anthropic's cache_control and
//             `prompt_cache_retention: "24h"` to OpenAI. No extra requests; a write costs more.
//   keepalive keep the default lifetime alive with a tiny request after each chat reply (see
//             cache-keepalive.ts). Extra requests, so it is only for a model with a known price.
// A model that is not in the file is on `default`.

import fs from "node:fs";
import path from "node:path";

export const MODEL_CACHE_FILE = "model-cache.json";
export const CACHE_MODES = ["default", "long", "keepalive"] as const;
export type CacheMode = (typeof CACHE_MODES)[number];

export class ModelCacheError extends Error {}

const VALID_REF = (ref: unknown): ref is string => typeof ref === "string" && ref.length <= 300 && ref.includes("/") && !/[\r\n]/.test(ref);

/** The modes as stored; only models that are not on `default` are in the table. A hand edit never breaks a generation. */
export function readCacheModes(root: string): Record<string, Exclude<CacheMode, "default">> {
  const out: Record<string, Exclude<CacheMode, "default">> = {};
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(root, MODEL_CACHE_FILE), "utf8")) as { models?: unknown };
    const models = raw && typeof raw === "object" ? raw.models : null;
    if (!models || typeof models !== "object") return out;
    for (const [ref, mode] of Object.entries(models as Record<string, unknown>)) {
      if (VALID_REF(ref) && (mode === "long" || mode === "keepalive")) out[ref] = mode;
    }
  } catch {
    // no file yet, or unreadable: every model is on default
  }
  return out;
}

/** Set one model's mode; `default` removes its entry. Throws ModelCacheError on bad input. */
export function writeCacheMode(root: string, ref: unknown, mode: unknown): Record<string, Exclude<CacheMode, "default">> {
  if (!VALID_REF(ref)) throw new ModelCacheError("model must be a provider/model ref");
  if (typeof mode !== "string" || !(CACHE_MODES as readonly string[]).includes(mode)) throw new ModelCacheError(`mode must be one of ${CACHE_MODES.join(", ")}`);
  const table = readCacheModes(root);
  if (mode === "default") delete table[ref];
  else table[ref] = mode as Exclude<CacheMode, "default">;
  fs.writeFileSync(path.join(root, MODEL_CACHE_FILE), JSON.stringify({ v: 1, models: table }, null, 2));
  return table;
}

interface CacheModelShape {
  api: string;
  id: string;
  baseUrl: string;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Where asking for the long lifetime does something. Measured with live requests (#112): through NanoGPT a
 * Claude model ignores the one-hour ttl (same price, cache gone after 7 minutes) and Argon answers 503 to the
 * `prompt_cache_key` that goes with it. So only the places that are known to honour it get it:
 * Anthropic itself, Claude through OpenRouter, and OpenAI. Everywhere else `long` is not sent.
 */
export function longCacheSupported(model: CacheModelShape): boolean {
  const host = hostOf(model.baseUrl);
  if (model.api === "anthropic-messages") return host === "api.anthropic.com";
  if (host === "api.openai.com") return true;
  return (host === "openrouter.ai" || host.endsWith(".openrouter.ai")) && model.id.startsWith("anthropic/");
}

/** A Claude model, however it is reached: its thinking needs a larger answer limit than a keep-alive request has. */
export function isClaudeModel(model: CacheModelShape): boolean {
  return model.api === "anthropic-messages" || /(^|\/)anthropic[/.]|(^|\/)claude-/i.test(model.id);
}
