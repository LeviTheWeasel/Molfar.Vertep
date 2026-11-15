#!/usr/bin/env node
// Rebuilds the three collected pages of the handbook (cross-engine.md, cross-roleplay.md, cross-social.md)
// from "If you change X, also touch Y" and "Traps" of every page. The collected pages are never edited by hand.
// Usage: node build-handbook-cross.mjs <handbook dir> [--check]
// --check writes nothing and exits 1 when a collected page differs from what the pages would give.
import fs from "node:fs";
import path from "node:path";

const [dir, ...flags] = process.argv.slice(2);
if (!dir) { console.error("usage: build-handbook-cross.mjs <handbook dir> [--check]"); process.exit(2); }
const check = flags.includes("--check");
const REPOS = { engine: "Engine", roleplay: "Roleplay", social: "Social" };

// The lines of one "## <title>" section: everything up to the next "## " heading, trailing blank lines dropped.
function section(lines, test) {
  const at = lines.findIndex((l) => l.startsWith("## ") && test(l));
  if (at < 0) return null;
  let end = lines.findIndex((l, i) => i > at && l.startsWith("## "));
  if (end < 0) end = lines.length;
  const body = lines.slice(at + 1, end);
  while (body.length && !body[body.length - 1].trim()) body.pop();
  while (body.length && !body[0].trim()) body.shift();
  return body.length ? body : null;
}

let differs = 0;
for (const [repo, label] of Object.entries(REPOS)) {
  const pages = fs.readdirSync(dir).filter((f) => f.startsWith(repo + "-") && f.endsWith(".md")).sort();
  let out = `# ${label}: traps and "change X, touch Y", collected from every page\n\n`
    + "Built by a script from the pages of this handbook; do not edit by hand. When a page changes,\n"
    + "rebuild this file. The page named in each heading has the detail.\n\n";
  for (const f of pages) {
    const lines = fs.readFileSync(path.join(dir, f), "utf8").split(/\r?\n/);
    const change = section(lines, (l) => /^## If you change/.test(l));
    const traps = section(lines, (l) => /^## Traps/.test(l));
    if (!change && !traps) continue;
    out += `\n## From \`${f}\`\n\n`;
    if (change) out += "Change X, touch Y:\n" + change.join("\n") + "\n\n";
    if (traps) out += "Traps:\n" + traps.join("\n") + "\n\n";
  }
  out = out.trimEnd() + "\n";
  const target = path.join(dir, `cross-${repo}.md`);
  const old = fs.existsSync(target) ? fs.readFileSync(target, "utf8").replace(/\r\n/g, "\n") : "";
  if (old === out) { console.log(`cross-${repo}.md: up to date`); continue; }
  differs++;
  if (check) { console.log(`cross-${repo}.md: differs from the pages`); continue; }
  fs.writeFileSync(target, out);
  console.log(`cross-${repo}.md: rebuilt`);
}
process.exit(check && differs ? 1 : 0);
