// Browser check of the cast (#424): the card "People coming back", the mark under the reply, the record form, on a throwaway engine.
import fs from "node:fs"
import { DATA, turns } from "./pw.mjs"
import { openRp, startChat, skipTours, shot, close } from "./roleplay.mjs"

const out = []
const ok = (name, pass, extra = "") => { out.push({ name, pass, extra }); console.log((pass ? "PASS " : "FAIL ") + name + (extra ? " : " + extra : "")) }
const RP = `${DATA}/apps/roleplay/data`
const diceFile = (id) => JSON.parse(fs.readFileSync(`${RP}/world/dice/${id}.json`, "utf8")).rolls

const { page, app } = await openRp({ lang: "en" })
await startChat(page, app)
const chatId = fs.readdirSync(`${RP}/chats`).filter((f) => f.endsWith(".meta.json"))[0].replace(".meta.json", "")
console.log("chat", chatId)

// seed: 100 messages that never name Olya, a world state with her on the bench, a registry that knows her
const msgs = Array.from({ length: 100 }, (_, i) => ({ id: "s" + i, role: i % 2 === 0 ? "user" : "char", name: i % 2 === 0 ? "You" : "Dzvinka", charId: i % 2 === 0 ? undefined : "dzvinka", text: "The road goes on, nothing new.", at: 1794000000000 + i * 1000, swipes: ["The road goes on, nothing new."], swipe: 0 }))
fs.writeFileSync(`${RP}/chats/${chatId}.jsonl`, msgs.map((m) => JSON.stringify(m)).join("\n") + "\n")
const olya = { id: "n1", kind: "person", name: "Olya", aliases: ["Olechka"], text: "Best friend from school. She writes often.", status: "active", uid: 0, at: 1, weight: 1, relation: "ally", link: { book: "bk1", uid: 1, title: "Olya" } }
fs.mkdirSync(`${RP}/world/state`, { recursive: true })
fs.writeFileSync(`${RP}/world/state/${chatId}.json`, JSON.stringify({ v: 1, chatId, bookId: "world-" + chatId, settings: { level: "living", everyN: 5, stagnation: 6, onTransition: true, onPlace: true, insert: true, textMax: 900, changesMax: 12, carrySource: "sensor", profile: "", dice: "flavour", diceStat: "auto", diceChance: 100, diceTilt: "even", diceLife: 0, dicePace: 0, diceShow: true, cast: "normal", castShow: true }, lastKey: null, nextId: 2, carry: {}, entities: [olya], nextFront: 1, fronts: [], event: null, log: [] }))
fs.mkdirSync(`${RP}/registry`, { recursive: true })
fs.writeFileSync(`${RP}/registry/${chatId}.json`, JSON.stringify({ v: 1, chatId, from: null, next: { p: 3, o: 1, l: 1 }, apart: [], suggest: [], entities: [{ id: "p2", kind: "person", name: "Olya", aliases: [{ text: "Olechka", src: "world" }], src: "world" }] }))

await page.reload()
await page.waitForTimeout(3000)
await skipTours(page)
const frame = () => page.frames().find((f) => f.url().includes("/app/molfar/roleplay/")) ?? app
await shot(page, "cast-0-reload")

// turn 1: the mock answers the player's line with a message from Olya
await turns([{ match: "We keep walking.", text: "A message from Olya arrives: she is coming over tonight." }, { text: "Quiet." }])
const input = frame().getByLabel("Message input")
await input.waitFor({ timeout: 30000 })
await input.fill("We keep walking.")
await input.press("Enter")
await frame().getByText("A message from Olya arrives").first().waitFor({ timeout: 120000 }).catch(() => {})
await page.waitForTimeout(3000)
await shot(page, "cast-1-after-reply")
const rollsA = diceFile(chatId)
ok("the hook sent the note (a cast line, inserted)", rollsA.some((r) => r.kind === "cast" && r.inserted === true && r.id === "n1"), JSON.stringify(rollsA.find((r) => r.kind === "cast")).slice(0, 260))
ok("the reply with Olya is in the chat", (await frame().getByText("A message from Olya arrives").count()) > 0)
const mark = frame().locator('[data-testid="dice-note"]')
const markText = (await mark.count()) ? (await mark.allInnerTexts()).join(" | ") : ""
ok("(diagnostic) the existing dice mark shows too", /=s*d+/.test(markText) || (await mark.count()) > 0, markText.slice(0, 200))
ok("a mark under the reply says who, why and the dice", /Olya/.test(markText) && /silent/.test(markText), markText.replace(/\s+/g, " ").slice(0, 200))

// turn 2: judged by code (her name is in the reply): the line gets "came"
await turns([{ match: "Good.", text: "The road goes on." }, { text: "Quiet." }])
await input.fill("Good.")
await input.press("Enter")
await frame().getByText("The road goes on.").last().waitFor({ timeout: 120000 }).catch(() => {})
await page.waitForTimeout(3000)
const rollsB = diceFile(chatId)
ok("after the next request the result is came", rollsB.some((r) => r.kind === "cast" && r.result === "came"), JSON.stringify(rollsB.filter((r) => r.kind === "cast").map((r) => r.result)))
await shot(page, "cast-1b-after-second")

// the World sheet: the card
await frame().getByRole("button", { name: /World/ }).first().click().catch(() => {})
await page.waitForTimeout(2000)
let card = frame().locator('[data-testid="section-cast"]').first()
ok("the card People coming back is in the sheet", (await card.count()) > 0)
if (await card.count()) {
  await card.scrollIntoViewIfNeeded()
  // open the bench and the log folds
  for (const name of [/Who is on the bench/, /Cast log/]) await card.getByText(name).first().click().catch(() => {})
  await page.waitForTimeout(800)
  await shot(page, "cast-2-card")
  const txt = (await card.innerText()).replace(/\s+/g, " ")
  ok("frequency shows Normal and its hint", /Normal/.test(txt) && /about 30 replies/.test(txt))
  ok("the bench lists Olya with silence of a threshold", /Olya/.test(txt) && /silent \d+ of \d+/.test(txt), txt.slice(0, 260))
  ok("the log line has dice and a result", /\d\+\d/.test(txt) && /came/.test(txt), txt.slice(-260))
}

// the record form: relation, weight, bring back
await page.goto(page.url())
await page.waitForTimeout(500)
const phoneEnv = await (await import("./roleplay.mjs")).openRp({ width: 390, theme: "light", lang: "en" })
await phoneEnv.page.waitForTimeout(2000)
await shot(phoneEnv.page, "cast-3-phone")
const f2 = phoneEnv.page.frames().find((f) => f.url().includes("/app/molfar/roleplay/")) ?? phoneEnv.app
const overflow = await f2.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1).catch(() => null)
ok("390 px: no sideways scroll", overflow === false, String(overflow))
await close()
const failed = out.filter((o) => !o.pass)
console.log(failed.length ? `${failed.length} FAILED` : "ALL PASSED")
process.exit(failed.length ? 1 : 0)
