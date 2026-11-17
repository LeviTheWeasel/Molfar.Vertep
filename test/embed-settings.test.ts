/**
 * Which embeddings source a device uses is the device's own (#431): a computer with a model of its own and a
 * phone with an online connection sync the same profile, and the computer's choice must not reach the phone.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { bootstrapUserDir, type UserPaths } from "../src/paths.js";
import { readEmbedSettings, writeEmbedSettings } from "../src/embed-settings.js";
import { push, pull } from "../src/sync/engine.js";
import { FolderStore } from "../src/sync/store.js";
import { exportProfile } from "../src/profile-backup.js";
import { unzipSync } from "fflate";

let tmp: string;
const notHere = () => false;
const here = () => true;
const settingsJson = (p: UserPaths) => JSON.parse(fs.readFileSync(p.settings, "utf8")) as Record<string, unknown>;

beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), "embed-settings-")); });
afterEach(() => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* watcher races */ } });

describe("embeddings choice of one device", () => {
  it("defaults when nothing is stored", () => {
    const p = bootstrapUserDir(path.join(tmp, "d"), "mia");
    expect(readEmbedSettings(p, notHere)).toEqual({ model: null, provider: "auto", local: null });
    expect(fs.existsSync(p.embed)).toBe(false);
  });

  it("writing goes to the device file and never into settings.json", () => {
    const p = bootstrapUserDir(path.join(tmp, "d"), "mia");
    fs.writeFileSync(p.settings, JSON.stringify({ theme: "dark" }));
    writeEmbedSettings(p, here, { provider: "openrouter", model: "baai/bge-m3" });
    expect(readEmbedSettings(p, here)).toEqual({ model: "baai/bge-m3", provider: "openrouter", local: null });
    expect(settingsJson(p)).toEqual({ theme: "dark" });
    // a null clears one setting, the others stay
    writeEmbedSettings(p, here, { model: null });
    expect(readEmbedSettings(p, here)).toEqual({ model: null, provider: "openrouter", local: null });
  });

  it("an old install keeps its choice: the keys are taken over once and leave settings.json", () => {
    const p = bootstrapUserDir(path.join(tmp, "d"), "mia");
    fs.writeFileSync(p.settings, JSON.stringify({ theme: "dark", embedProvider: "openrouter", embedModel: "baai/bge-m3" }));
    expect(readEmbedSettings(p, notHere)).toEqual({ model: "baai/bge-m3", provider: "openrouter", local: null });
    expect(settingsJson(p)).toEqual({ theme: "dark" });
    expect(JSON.parse(fs.readFileSync(p.embed, "utf8"))).toEqual({ embedProvider: "openrouter", embedModel: "baai/bge-m3" });
  });

  it("a computer's model that is not on this device is dropped when the old keys are taken over", () => {
    const p = bootstrapUserDir(path.join(tmp, "phone"), "mia");
    fs.writeFileSync(p.settings, JSON.stringify({ embedProvider: "local", embedLocal: "bge-m3" }));
    // the phone has no downloaded model: it must not stay on "local", which would give no embeddings at all
    expect(readEmbedSettings(p, notHere)).toEqual({ model: null, provider: "auto", local: null });
    const q = bootstrapUserDir(path.join(tmp, "computer"), "mia");
    fs.writeFileSync(q.settings, JSON.stringify({ embedProvider: "local", embedLocal: "bge-m3" }));
    expect(readEmbedSettings(q, here)).toEqual({ model: null, provider: "local", local: "bge-m3" });
  });

  it("once the device has its own file, the keys of settings.json are ignored", () => {
    const p = bootstrapUserDir(path.join(tmp, "d"), "mia");
    writeEmbedSettings(p, here, { provider: "openrouter" });
    // a backup restored or a sync that still carries the old keys
    fs.writeFileSync(p.settings, JSON.stringify({ embedProvider: "local", embedLocal: "bge-m3", embedModel: "x" }));
    expect(readEmbedSettings(p, here)).toEqual({ model: null, provider: "openrouter", local: null });
  });
});

describe("a sync and a backup never carry it", () => {
  const ctx = (dataDir: string, p: UserPaths, store: FolderStore) => ({ dataDir, username: "mia", paths: p, engine: "1.1.0", store });

  it("the computer's choice does not reach the phone, and the phone's does not come back", async () => {
    const store = new FolderStore(path.join(tmp, "store"));
    const computer = path.join(tmp, "computer");
    const phone = path.join(tmp, "phone");
    const pc = bootstrapUserDir(computer, "mia");
    const ph = bootstrapUserDir(phone, "mia");
    // the computer: a model of its own, chosen by hand; the profile also holds an ordinary setting
    fs.writeFileSync(pc.settings, JSON.stringify({ theme: "dark" }));
    writeEmbedSettings(pc, here, { local: "bge-m3", provider: "local" });
    // the phone: online only
    writeEmbedSettings(ph, notHere, { provider: "openrouter", model: "qwen/qwen3-embedding-4b" });
    await push(ctx(computer, pc, store));
    await pull(ctx(phone, ph, store), { all: "theirs" });
    // the ordinary setting travelled, the embeddings choice did not
    expect(settingsJson(ph)).toEqual({ theme: "dark" });
    expect(readEmbedSettings(ph, notHere)).toEqual({ model: "qwen/qwen3-embedding-4b", provider: "openrouter", local: null });
    // and back: the phone changes something else, the computer keeps its own choice
    fs.writeFileSync(ph.settings, JSON.stringify({ theme: "light" }));
    await push(ctx(phone, ph, store));
    await pull(ctx(computer, pc, store), { all: "theirs" });
    expect(settingsJson(pc)).toEqual({ theme: "light" });
    expect(readEmbedSettings(pc, here)).toEqual({ model: null, provider: "local", local: "bge-m3" });
  });

  it("a computer that still has the old keys in settings.json takes them over before it pushes", async () => {
    const store = new FolderStore(path.join(tmp, "store"));
    const computer = path.join(tmp, "computer");
    const phone = path.join(tmp, "phone");
    const pc = bootstrapUserDir(computer, "mia");
    const ph = bootstrapUserDir(phone, "mia");
    fs.writeFileSync(pc.settings, JSON.stringify({ theme: "dark", embedLocal: "bge-m3", embedProvider: "local" }));
    // the first read after the update (any embeddings call or the Settings page) moves the keys out
    readEmbedSettings(pc, here);
    await push(ctx(computer, pc, store));
    await pull(ctx(phone, ph, store), { all: "theirs" });
    expect(settingsJson(ph)).toEqual({ theme: "dark" });
    expect(readEmbedSettings(ph, notHere)).toEqual({ model: null, provider: "auto", local: null });
    expect(readEmbedSettings(pc, here)).toEqual({ model: null, provider: "local", local: "bge-m3" });
  });

  it("a profile backup leaves the file out", async () => {
    const dataDir = path.join(tmp, "computer");
    const pc = bootstrapUserDir(dataDir, "mia");
    writeEmbedSettings(pc, here, { provider: "openrouter" });
    const names = Object.keys(unzipSync(await exportProfile(dataDir, "mia", { engine: "test" })));
    expect(names.length).toBeGreaterThan(0);
    expect(names.some((n) => n.includes("embeddings"))).toBe(false);
  });
});
