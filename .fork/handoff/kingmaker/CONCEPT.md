# Kingmaker: concept (draft 1, 2026-11-14)

Status: concept agreed in outline with the owner, nothing built. "Kingmaker" is a working name (see Risks).

## What it is
A separate optional addon (own repository, own releases, a Store entry, like Social). A shell, not a world:
a model builds any world, and the player rises in it as king, tyrant, mercenary captain, ship's captain,
guild master. A mix of RPG and strategy; never dry: every turn carries prose.

Owner's decisions (2026-11-14):
- Separate addon with its own game loop. #123 (battle, inventory) stays its own idea.
- Loop: turns that are periods (week, month, season) plus scenes (a short chat inside a turn).
- One abstract schema for every kind of ruler. The model fills it AND writes the world's lorebook and a
  general world document (like the Data Bank); both can also be imported. Creation has a questionnaire and
  a "do it for me" door that takes only a direction.
- First playable version: court and people, resources and decisions, factions and diplomacy. Map and
  armies later.
- Build on what already works in Roleplay and Social; do not invent again. Life outside the court's focus
  (diaries, gossip) is the Social model.

## The rule under everything
Code judges, the model proposes (the position from #123 and the Worldlines note there). Numbers, dice,
clocks, costs and limits are code. The model names things, writes prose and picks from closed lists; code
clamps every number it returns. A turn must finish without a model (template text), so a failed free model
never blocks play.

## The abstract schema
Code knows only these; the world gives them names.
- **Realm**: kind in words (kingdom, company, ship), the ruler's title, the period a turn covers, tone.
- **Resources**: four fixed roles with world names, `wealth`, `supply`, `force`, `sway` (gold / grain /
  levy / legitimacy, or pay chest / rations / blades / reputation), plus up to two custom ones. Each has a
  value, a cap, income and upkeep.
- **Holdings**: a list (province, ship, camp, guildhall) with yield, condition and upgrades. No map in v1.
- **Offices**: 4 to 6 seats named by the world (marshal, quartermaster, spymaster), each tied to a domain
  (force, wealth, sway, intrigue, lore). The holder's skill is the modifier of every action in that domain.
- **People**: name, office, traits, skills per domain, loyalty -10..10, an ambition, ties (family, work,
  rival, romance), secrets. Generated, or imported once from a Roleplay card.
- **Factions**: World DM fronts: a goal, a clock, power, stance to the player -10..10, what they want.
  Threats are fronts nobody can talk to.
- **The ladder**: 4 to 6 ranks from where the player starts to the top (captain, lord, prince, king), each
  with requirements code can check (holdings, sway, a faction's backing). This is the "becoming".
- **Deck**: event cards written for this world; promises and debts the player made.

## A turn
1. **Dawn** (code, no tokens): income and upkeep, front clocks tick (d6 per front), loyalty drifts,
   effects count down, 2 to 4 matters are picked: deck cards plus petitions the state itself raises (an
   empty chest, a disloyal marshal, a front at a late stage).
2. **Report** (one model call): a paragraph of what the period brought, and each matter worded for this
   world with 2 or 3 options. The model tags each option from a closed list of effects; code prices it.
3. **Orders** (the player): pick options, or write an order in words. A written order becomes a small
   record (domain, target, stake) by one model call; code checks it can be paid, rolls 2d6 plus the office
   holder's skill, and reads the band: miss, no but, yes but, full.
   Any time in the turn: open a **scene** with a person (audience, negotiation, confrontation). It is a
   chat; closing it makes one call that returns loyalty within plus or minus 2, promises and secrets.
4. **Dusk** (code applies, one model call): the chronicle of the turn in prose; the outcomes are given, the
   prose may not name a result the dice did not give. The same call writes 3 to 5 rumours and one or two
   diary lines of courtiers from facts code selected (a rift, a new closeness, a stirred front).

Two or three model calls a turn plus scenes; each returns small JSON. A finished turn is not undone (see
Losing); a snapshot per turn is still kept, for repair after a crash, not for the player.

## The RPG side (draft 2, proposed 2026-11-14 after the owner's "this reads as pure strategy"; not yet confirmed)
The ruler is a character the player plays, not a cursor over a realm.
- **The ruler's sheet.** Five skills, the same domains the offices use (force, wealth, sway, intrigue,
  lore), traits and flaws, wounds, age. Skills grow from deeds done in person, not from points.
- **A name earned.** Deeds leave marks ("the Cruel", "Oathbreaker", "the Open-Handed"): code adds a mark
  when a kind of deed repeats, and a mark changes how people and factions meet the ruler (loyalty and
  stance modifiers, new deck cards, lines in every prompt). This is the tyrant or the just king, grown
  from play instead of chosen in a menu.
- **Deeds in person.** Each turn the ruler has one or two personal deeds beside the orders: lead the
  assault, go out in disguise, fight the duel, court someone, question the prisoner. A personal deed is a
  played scene with a narrator, rolls on the ruler's own skill at uncertain moments, and personal risk:
  a wound, capture, death. An order sent through an office is safe and uses the holder's skill instead.
- **Scenes are episodes, not chats.** Code states the stake before the scene (what a full success, a
  partial one and a failure change), the scene is played in prose, checks are 2d6 inside it, and the
  closing call maps what happened to one of the stated outcomes. Kinds: audience, negotiation, intrigue,
  expedition, duel, council.
- **The inner circle.** Three to five companions with their own arc: a personal quest each (the Roleplay
  quests shape: steps, main or side), a bond with the ruler that opens or closes by what the ruler does,
  romance, and betrayal when loyalty and ambition cross. Courtiers beyond the circle stay lighter.
- **The ruler's own thread.** An origin, a nemesis, a secret that can come out, written at creation.
- **Relics, not an inventory.** A few named things (a crown, a sword, a seal) with an effect and a story.
- **The mix moves with the ladder.** At the bottom rank there is almost no realm: a handful of people, a
  purse, and the game is mostly scenes and personal deeds. Each rank adds offices, holdings and factions,
  and personal deeds become rarer and weightier. So the start is an RPG with a band, the top is strategy
  with RPG moments, and one schema serves both.

## Losing (owner, 2026-11-14: it exists, and it is hard)
- The ruler can die (wounds, a lost duel, an assassin, an execution after a lost war) and can be deposed
  (sway at zero, a coup by an office holder, a front whose clock filled).
- No undo of a finished turn. Inside a turn the player may take orders back until Dusk; Dusk is final. A
  scene cannot be re-rolled (seeded dice, no swipe to a better result).
- After the fall the world stays: the chronicle closes the reign with an epitaph, and the player may go
  on in the same world as an heir or a companion if one lives, or as a new person years later, with what
  the last ruler left behind. Several worlds can exist side by side, like chats.

## Prose (owner, 2026-11-14)
Medium length by default, and most of it goes to describing events (the report and the chronicle), less
to lists and numbers.

## What is reused, and from where
| Need | Taken from | How |
| --- | --- | --- |
| Building a world: interview or one direction, a draft built one step per call, the player trims and accepts | Roleplay World DM `startRoute`, `draftRoute`, `DraftPanel` | same pattern; steps: premise and resources, ladder, factions, court, deck, book |
| The world's lorebook | Roleplay lorebook format (`lorebooks/<id>.json`), World DM `writeBook` (one entry per record) | same file format, so a book moves between Roleplay and Kingmaker both ways; keyword scan picks entries for a prompt |
| The general world document | Roleplay Data Bank (`databank/<id>.json`, `searchDatabank`, optional vectors) | same chunk shape and word search; import a text or let the build write it |
| Factions that move by themselves | World DM fronts: `cleanFront`, `tickClocks`, `clockStep`, `clockStage` | one tick per turn instead of per N replies |
| Events | World DM deck: `cleanDeck`, `deckRoute` | refilled when it runs low |
| Checks | World DM `rollFate`, `diceOutcome` (2d6, four bands, seeded) | seeded per save and turn, so an undo re-rolls the same |
| Undo | World DM `pushSnap`, `undoFrom` | a snapshot per turn |
| Courtiers' own lives | Social Life: `dayDue`, `pickKind` (routine, win, trouble, seen, rest, plan), `fileDay` | one entry per turn, written inside the Dusk call, not one call per person |
| Who feels what about whom, ties, the relationship map, the family tree | Social Life `setRelation`, `autoIndex`, `graphView`, `familyOf`, `MapScreen` | dynasties and marriages come for free |
| Gossip and the voice of the street | Social Forum `gossipCandidates` (rift, close, sweet), `gossipSubject`; the Moderator's daily chronicle | the Rumours feed and the Chronicle |
| A scene with one person and its memory | Social Messenger: a chat per character, `fileFold` (a 1500 character note) | scenes per person, folded the same way |
| Roleplay cards as courtiers | Social Profiles `importRoute`, `buildMaterial`; manifest `reads` | a one-time digest after the user's grant; the card is not read again |
| Numbers a model may not break | Roleplay Ledger agent, the propose-verify-apply note in #123 | a registry of variables with ranges |
| Names that are not the model's defaults | #373 catalog, when it exists | optional |
| App skeleton | Social: plugins per concern, `onTick`, `src/screens`, strings en and uk, `.skills/guide`, a design preview on mock data | copied layout |

Plugins cannot import each other, so reused functions are copies (the Social way); each copy names its source.

## Shape of the addon
- Repository `MolfarWav/Molfar.Vertep-Kingmaker`, AGPL-3.0, listed in the Store, released on its own.
- Plugins: `realm` (state, the turn engine, fronts, deck, dice; no prose), `build` (creation and import),
  `court` (scenes, diaries, rumours, the chronicle).
- Data per save: `saves/<id>/realm.json`, `people/`, `turns/<n>.json`, `book.json`, `bank/`, `scenes/`.
- Screens: Throne (the turn), Court, Factions, Realm (resources, holdings, the ladder), Chronicle and
  Rumours, World (book and document). Phone first: bottom tabs.
- Engine changes expected: none for v1 (model calls from plugins, `reads` grants and official-source trust
  exist). Not verified against the code yet.

## Order of work
0. UI plan and a clickable mock of the Throne screen and of world creation (before any code).
1. Skeleton and the `realm` engine in code only, with a headless simulator: a bot plays 50 turns on a fake
   model, so balance is measured, not guessed.
2. World creation: "do it for me" and the questionnaire; the book and the document.
3. The turn with a model: report, orders, chronicle.
4. Court: scenes, diaries, rumours.
5. Diplomacy actions with factions.
6. Import: a lorebook, a document, Roleplay cards.
Later: map as a graph of regions, armies and campaigns, intrigue on "who knows what" (Litopys), pictures.

## Risks
- Scope: this is a game. Each step above must be playable alone.
- Balance decides whether it is fun; hence the simulator in step 1.
- Free models and JSON: every call has a code fallback; none is required for a turn to end.
- The name: "Kingmaker" is also the name of a published game. Decide the public name before the Store
  entry; nothing of that game (names, setting, rules) is used.

## Open questions for the owner
- The public name: later, something Ukrainian (owner, 2026-11-14).
- The RPG side above: confirm or change (start at the bottom rank by default? one or two personal deeds a
  turn? going on as an heir after a death?).
- Answered 2026-11-14: losing exists and is hard; prose is medium and mostly about events.
