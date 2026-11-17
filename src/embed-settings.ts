/**
 * Which embeddings source this DEVICE uses (#431). The choice is a property of the device, not of the profile:
 * a computer may have a model of its own (the one downloaded in Settings > Memory, LM Studio, Ollama), a phone
 * usually has only an online connection. It used to sit in the workspace's settings.json, which a sync and a
 * backup carry between devices, so a computer's choice broke the phone's embeddings after every sync.
 *
 * It now lives in a file of its own in the credentials directory (`UserPaths.embed`), which neither a sync nor a
 * profile backup carries. The old keys in settings.json are read once as a starting point for a device that has
 * no file yet (what is not usable here is dropped), moved into the file and removed from settings.json.
 */
import fs from "node:fs";
import path from "node:path";
import type { UserPaths } from "./paths.js";
import { findLocalModel, type LocalModelId } from "./embed-local/catalog.js";

export interface EmbedSettings {
  /** null = the endpoint's default model */
  model: string | null;
  /** "auto" | "openrouter" | "local" | a custom connection id */
  provider: string;
  /** the model downloaded to this computer and connected, or null */
  local: LocalModelId | null;
}

/** The keys that used to live in settings.json. */
const LEGACY_KEYS = ["embedModel", "embedProvider", "embedLocal"] as const;

function readJson(file: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Plain values out of a stored object: bad or missing ones read as the default. */
function parse(raw: Record<string, unknown> | null): EmbedSettings {
  let model: string | null = null;
  let provider = "auto";
  let local: LocalModelId | null = null;
  if (raw) {
    if (typeof raw.embedModel === "string" && raw.embedModel.trim()) model = raw.embedModel.trim();
    if (typeof raw.embedProvider === "string" && raw.embedProvider.trim()) provider = raw.embedProvider.trim();
    if (findLocalModel(raw.embedLocal)) local = raw.embedLocal as LocalModelId;
  }
  return { model, provider, local };
}

function writeFileAtomic(file: string, data: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, data, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(tmp, file);
}

function stored(s: EmbedSettings): Record<string, string> {
  const out: Record<string, string> = {};
  if (s.model !== null) out.embedModel = s.model;
  if (s.provider !== "auto") out.embedProvider = s.provider;
  if (s.local !== null) out.embedLocal = s.local;
  return out;
}

/** Takes the three keys out of the workspace settings.json so a sync stops carrying them. Best effort. */
function stripLegacy(p: UserPaths): void {
  try {
    const st = readJson(p.settings);
    if (!st || !LEGACY_KEYS.some((k) => k in st)) return;
    for (const k of LEGACY_KEYS) delete st[k];
    fs.writeFileSync(p.settings, JSON.stringify(st, null, 2) + "\n", "utf8");
  } catch { /* the keys stay; they are ignored once this device has its own file */ }
}

/**
 * This device's embeddings choice. `localReady` says whether the downloaded model is usable on this device:
 * a choice that names one that is not here (a computer's choice pulled onto a phone) is dropped when the old
 * settings.json keys are taken over.
 */
export function readEmbedSettings(p: UserPaths, localReady: (id: LocalModelId) => boolean): EmbedSettings {
  const own = readJson(p.embed);
  if (own) return parse(own);
  const legacy = readJson(p.settings);
  if (!legacy || !LEGACY_KEYS.some((k) => k in legacy)) return parse(null);
  const s = parse(legacy);
  if (s.local && !localReady(s.local)) s.local = null;
  if (s.provider === "local" && !s.local) s.provider = "auto";
  try {
    writeFileAtomic(p.embed, JSON.stringify(stored(s), null, 2) + "\n");
    stripLegacy(p);
  } catch { /* read-only folder: the next read takes the same path */ }
  return s;
}

/** Changes this device's choice. A null value clears one setting. Never touches the synced settings.json. */
export function writeEmbedSettings(
  p: UserPaths,
  localReady: (id: LocalModelId) => boolean,
  patch: { model?: string | null; provider?: string; local?: LocalModelId | null },
): EmbedSettings {
  const cur = readEmbedSettings(p, localReady);
  const next: EmbedSettings = {
    model: patch.model !== undefined ? patch.model : cur.model,
    provider: patch.provider !== undefined ? patch.provider : cur.provider,
    local: patch.local !== undefined ? patch.local : cur.local,
  };
  writeFileAtomic(p.embed, JSON.stringify(stored(next), null, 2) + "\n");
  stripLegacy(p);
  return next;
}
