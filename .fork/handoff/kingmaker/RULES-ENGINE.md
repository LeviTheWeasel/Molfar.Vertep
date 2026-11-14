# Kingmaker: the rules engine, step 1 (2026-11-14)

What exists: the rules of a reign as code, with tests and a balance simulator. No prose, no model call,
no routes, no screens yet.

## Where the code is
Repository `MolfarWav/Molfar.Vertep-Kingmaker`, PRIVATE on the owner's word (2026-11-14: nobody should
pull it before it plays properly), branch `main`. The working copy of that session is
`data/dev/kingmaker/` inside the engine folder (`data/` is gitignored in the engine repository); on
another machine clone it anywhere.

- `plugins/realm/plugin.js`: an ES module without imports (the plugin sandbox's rule); pure functions of
  the state and a seed. `RULES` at the top holds every balance number.
- `test/realm.test.ts`: 21 tests (`bun test`).
- `scripts/simulate.ts`: `bun scripts/simulate.ts 600 60`.

## What the rules do
- `cleanRealm(spec, seed)`: the only door for a world a model wrote. Names are cut, lists are cut, every
  number is clamped to a starting range, skills to a budget.
- `dawn(state)`: agreed incomes, what holdings give, what the force and the court cost, promises that
  fall due, wounds healing, ambition, front clocks (d6: 1-2 nothing, 3-4 one segment, 5-6 one and
  stirred; faster for strong fronts and for a ruler who stands high), then the turn's matters: what the
  state raises first (a front near its goal, a disloyal courtier, an emptying chest, hunger), the deck
  for the rest. Each matter has options from a closed list of effects, a price and, where uncertain, a
  check.
- `resolve(state, orders)`: 2d6 plus a modifier, four bands (miss up to 5, "no, but" 6-7, "yes, but" 8-10,
  full from 11). Through an office: the holder's skill (an empty or not yet open seat: minus one). In
  person (a scene, or a deed): the ruler's own skill, plus one with a loyal companion who knows the
  trade. A deed gives half again as much, wounds on a miss, and two fit in a turn. A third wound kills.
  A matter without an order is decided by the court, badly.
- `dusk(state)`: fronts that reached their goal (a hostile one takes a share of the force, wealth, sway,
  a holding, and comes back stronger), coups by office holders who had enough, the falls (killed,
  deposed at no sway, defeated at no force, a coup), names earned by repeated deeds (generous, harsh,
  cruel, bold, oathkeeper, oathbreaker; each changes numbers), the rise to the next rank and the world's
  answer to it.
- `heirs`, `succeed`: after a fall the world stays; a loyal courtier goes on a rank lower with half the
  chest. "A new person years later" is not built.
- At the bottom rank only the purse seat is open, so force, sway and intrigue go through the ruler in
  person: the RPG start the concept asks for comes from the rules, not from a mode.

## Balance, measured (600 reigns of 60 turns per bot)
| Bot | Alive at turn 20 / 40 / 60 | Fell by | Reached the top rank | Median turn of rank 2 / 3 / top |
| --- | --- | --- | --- | --- |
| random (picks anything, skips some matters) | 0% / 0% / 0% | deposed 86%, coup 14% (median turn 8) | 0% | none |
| cautious (best expected value, never in person) | 84% / 72% / 70% | defeated 24%, deposed 6% | 2% | 31 / 45 / 54 |
| greedy (best expected value) | 89% / 82% / 79% | defeated 15%, killed 5%, deposed 2% | 37% | 25 / 39 / 52 |
| bold (greedy, prefers deeds in person) | 83% / 79% / 76% | defeated 15%, killed 7%, deposed 2% | 47% | 23 / 36 / 51 |

Read: careless play ends within ten turns; a reign that weighs every option usually lasts, and reaches
the top in a third to a half of the cases around turn 50; never acting in person keeps the ruler alive
but almost never reaches the top. An heir is at hand in about 70% of the falls.
Six rounds of tuning led here (first run: the top by turn 16, everything capped at 400). The numbers
moved most with: what a hostile front's success costs, how often a claim comes up, sway fading each
turn, stipends for the court, no force price on a strike.

## Known and not done
- The bots are heuristics, not people. Whether 79% survival for a careful reign is "hard enough" is the
  owner's call; the dials are `strike`, `hardenEvery`, `swayFade`, `routAt` in `RULES`.
- Careful bots never earn the names generous, harsh or cruel and never meet a coup: those belong to
  choices a bot's arithmetic avoids. Only play will show whether people meet them.
- Survivors end rich (wealth and supply near 300 of 400): late-game sinks are thin.
- Not built: routes and files (`handleRoute`, saving a reign), personal quests of the inner circle,
  relics, the ruler's own thread, "a new person years later", the map and armies.
- Not checked: the file inside the engine's sandbox (the test only checks it has no imports, no Unicode
  property escapes, no clock or random calls); lint (the engine's linter ignores `data/`).

## Step 2: a world from a direction, and a reign through routes (2026-11-14)
Addon commit `2e908fe`. Still no screens and no prose of a turn.

- **`plugins/build/plugin.js`** (permissions routes, fs, llm). `POST /build/drafts { direction | answers, tone, lang }`
  makes a draft; a questionnaire's answers are joined into one direction, so both doors use one pipeline.
  `POST /build/drafts/<id>/step` runs the next of five steps (premise, fronts, court, seeds, book), one model
  call each (two-phase: pass A asks and writes nothing), each prompt carrying what the earlier steps
  wrote. An answer is read from `r.json` or from the outermost braces of the text, then cleaned (texts
  cut, numbers bounded, unknown kinds dropped). A failed, non-JSON or too thin answer changes nothing but
  `failed`; the caller may try again or send `{ plain: true }`, which fills the step with a plain default,
  so a whole world can be made with no model. `.../trim { drop }` removes fronts, people, seeds, lore
  entries (never below two powers, one of them open to talk). After each step code assembles `book` (a
  lorebook in Roleplay's format: the premise as a constant entry, one entry per power, person and lore
  entry) and `doc` (a Data Bank file of passages).
- **`plugins/realm/plugin.js` routes** (permissions routes, fs): `POST /realm/saves { draft }` (needs premise,
  fronts and court built; runs `cleanRealm`, writes `saves/<id>/realm.json`, `book.json`, `world.json`,
  removes the draft), `GET /realm/saves`, `GET /realm/saves/<id>` (the state plus what code can work out:
  per option whether it can be paid and the odds per mode, upkeep, yields, the next rank), `.../dawn`
  (opens a turn once), `.../dusk { orders }` (resolves, closes, writes the turn's record
  `saves/<id>/turns/<reign>-<turn>.json`: matters, results, facts; this is what the chronicle will be
  written from), `.../succeed { person }`, `DELETE`.
- **Checked:** 33 tests (`bun test`; the routes on a fake host that re-runs a route after each model call
  and asserts pass A wrote nothing). `scripts/sandbox-run.ts <engine checkout>` runs the same flow through
  the engine's real plugin runtime (QuickJS worker, the `host.fs` jail, two-phase calls) with a fake
  model: a draft in five calls, a reign, turns until a fall, the files, a delete. A route takes about
  50 to 110 ms there.
- **Not checked:** any real model (do small free models return usable JSON for these five prompts, in
  Ukrainian?); the app installed in a running engine (the manifest is a guess from the app-authoring
  skill, there is no UI to open); the build prompts' size (not measured with `estimateTextTokens`).
- **Not built:** the prose of a turn (report, chronicle, rumours, diaries: the court plugin), scenes,
  import (a lorebook, a document, Roleplay cards), any screen.

## The owner on the second mock (2026-11-14)
"Frankly weak, but it will do for a start." The front needs a real design pass later (the code-drawn
pictures and the layout did not convince); it is not the base to polish.
