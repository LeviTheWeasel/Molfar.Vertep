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

## Step 3: the words of a turn, and scenes (2026-11-15)
Still no screens. A reign can now be played and read end to end through routes.

- **`plugins/court/plugin.js`** (permissions routes, fs, llm). It decides nothing: it reads the realm
  plugin's state and turn records and asks a model to word them. The system prompt says the rules have
  already decided and forbids any outcome beyond the facts given. Every call has plain words in code
  (English), used when the model fails or the caller sends `{ plain: true }`; `{ again: true }` rewrites.
  - `POST /court/<save>/report`: one call after dawn. Returns the report of the turn and, per matter,
    the bringer's words in first person, a narrator line and each option in the world's words. Who brings
    a matter is picked by code (`bringerOf`: the treasurer for an empty chest, the spymaster or the most
    loyal person for a courtier who cannot be trusted, an envoy for a faction's offer), so the portrait
    and the voice never depend on a model. A seed of the same kind from the world's build is offered to
    the model. An answer that words only some ids keeps the plain words for the rest. Written once per
    turn to `saves/<id>/prose/<reign>-<turn>.json`.
  - `POST /court/<save>/chronicle`: one call after dusk, from the turn's record. The model is given, per
    matter, what it was, the ruler's answer in the label the player saw, how it was done, the band in
    words and what changed (`effectWords`, in the world's names for its resources), then the turn's
    facts. It returns a title, an outcome per matter, the chronicle, three rumours, a diary line of one
    courtier (picked by code, in turn) and an epitaph when the reign ended.
  - Scenes: `POST /court/<save>/scene { matter, opt, mode }` opens one on an option that may be played
    face to face or in person: the place, what is seen, the other side's first words, the stake in words,
    and three approaches, each its own skill (`approachesOf`: the option's own first). `.../talk { text }`
    is free talk, at most four exchanges, and settles nothing. The roll is the rules':
    `POST /realm/saves/<id>/act { matter, opt, mode, domain }`. `.../close` then words the ending to the
    band and the effects; closing before the roll is refused.
- **Realm plugin changes:** a result now lists the effects that were applied; `actOne` and the `act` route
  settle one matter at once (it leaves the turn's list, its result joins the record at dusk, it cannot be
  rolled twice); a scene may name another skill than the option's own, one harder; deeds in person are
  counted across the turn (`deedsLeft` in the view).
- **Calls of a turn:** report 1, chronicle 1, plus per scene 2 and one per exchange of talk.
- **Checked:** 47 tests; the whole flow (build, reign, report, scene with talk, act, close, dusk,
  chronicle) through the engine's real plugin runtime with a fake model; the balance simulation gives the
  same numbers as before. A test caught one real fault: options the model left unworded lost their plain
  label (fixed).
- **Not checked:** any real model: whether a small model keeps to the facts, returns every id, writes
  good prose in Ukrainian. Prompt sizes not measured. The plain fallback is English only.
- **Not built:** personal quests of the inner circle, relics, a scene's memory of earlier scenes with the
  same person (Social's note fold), diaries kept per person over turns (only the turn's line exists),
  import, any screen.

## Step 4: the prompts against real models (2026-11-15)
Addon commit `87f55fd`. `scripts/live-run.ts` builds a world from one Ukrainian direction and plays one
turn with a scene through the three plugins' routes, a real model answering every prompt (10 calls). The
models are reached through the `ask-model` script; per the repo's rule they are described here, not named
(the owner has the names in the session's reply). All text in Ukrainian.

| Model | World (5 steps) | Report | Scene | Chronicle | Time for 10 calls |
| --- | --- | --- | --- | --- | --- |
| A cheap fast model, the owner's usual test | all usable first time | every matter and option worded | open, talk, close worded | 2 or 3 of 3 outcomes worded, rumours, diary | about 80 s |
| An open 12B model | all usable first time | all worded | all worded | all worded | about 250 s |
| An older 12B model | one step needed a second try | all worded | all worded | all worded; wrong words, stray Latin tokens, the ruler's title wrong | about 245 s |
| Two models that think before they answer (one free) | most steps came back empty: the room for the answer was spent on thinking | plain fallback | partly worded | plain fallback | 4 to 9 minutes |
| Two free models from the skill's list | no longer offered (404) | plain fallback | plain fallback | plain fallback | seconds |

Every failure fell back to plain words and the turn went on: the fallback path is now proven on real
failures, not only on a fake host.

**What the first run showed and what was changed**
- A bringer promised things the option does not give ("an estate and a coat of arms" for an offer that
  pays a wage). The report prompt now lists what each option really does (its price and its effects in
  words) and tells the model that nobody offers anything beyond that.
- The chronicle retold a scene another way (another room, another ending). It now gets the place and the
  last lines of a closed scene and is told the outcome must match.
- The chronicle invented what factions did ("recalled its officer"). The stirred-front fact now says the
  front came closer to its goal and that how is not known; the prompt forbids invented deeds of factions.
- A diary confessed a new betrayal. The diary is now "what they saw and think; they did nothing new".
- Game terms in speech ("ten thalers for four turns"). Effects are worded in the world's time unit, and
  scenes forbid game terms. After the fix none of three models leaked a number or "turn" into prose.
- A secret matter was told about a courtier instead of the ruler. The matter's facts now carry the
  ruler's secret from the world's build.
- Answers with the last brace missing, or cut off mid-list: `looseJson` closes what was open and keeps
  every finished item.
- Models that think first returned nothing within 900 to 1400 tokens. Limits are now 2000 to 5000 and
  requests ask for light reasoning (`reasoning: "low"`). The harness cannot pass that setting, so whether
  it is enough for such models is NOT verified; in the harness they still ran out of room.
- A title came back in English from the weakest model: the language is now also stated as the last line
  of every prompt.

**Still true**
- The plain fallback is English; in a Ukrainian game a missed outcome shows an English line of facts.
- Small old models write poor Ukrainian; prompts cannot fix that. The 12B open model was acceptable.
- Mild inventions remain in colour (a letter nobody read, a diary's private plan); none changed a number.
- The largest prompt was about 4500 characters; nothing here needs a big window.
- Not measured: cost per turn in money; the same run in English; more than one turn (a later turn has
  more history in the state, but prompts do not grow with it).
- The skill's `free` chain names two models that no longer exist; fixed in the repo copy of
  `providers.json` (the desktop's personal copy needs the same change).
