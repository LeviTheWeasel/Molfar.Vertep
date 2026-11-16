# Cast: secondary characters that come back and new ones the DM draws (design, 2026-11-16)

Status: design agreed in chat with the owner, no code. Code lands in the Roleplay repo (`plugins/world/plugin.js`, World UI);
the engine does not change, so no engine release.

## Problem
A best friend from a card's lorebook did not appear for almost 150 messages. Three causes (read in the code):

1. A lorebook entry enters the prompt only by its keys in the last `scanDepth` messages (default 4). If nobody names her,
   her entry never fires and the model does not know she exists (check: the "never fired" list of `chatBookReport`).
2. A present entry is not an appearance. The model answers the player; nothing says "it is time for her".
   The Dashboard `goal` is a wish, not a plan.
3. Someone off screen has no life (#378: "what the absent character was doing", still open). The Life die
   (`rollLife`, `lifeInsert`) is random and generic ("someone present acts on their own"); it never picks a person.

Past work that touches this: #378 (absent character's activity), #294 (attention weight in groups: only decays, never
raises the neglected), #405 (Should wording risks shouting matches), #415 (a far contact knows only what was sent),
#401 (director: unnamed NPCs are invisible to the sensor, 0-6% person_enter), #416 (secret lore entries).

## What the owner decided (2026-11-16)
- NPCs appear **almost automatically**. No manual "remind" button.
- The Life die goes further: it becomes cast-aware.
- The World DM builds, besides places and things, **factions with named NPCs**: a short card each (look, goals, character,
  5-10 sentences). A deck of characters, like the events deck. The DM draws from it and introduces them.
  A separate section and extra settings of how the DM builds the world.

## Design: one entrance mechanism, two sources
**Source 1, the bench:** people who already exist: lorebook people of the cards and the DM's own person records.
**Source 2, the cast deck:** invented NPC cards by faction, not yet in the story.
Both enter through the same code path: an *entrance*.

### 1. The bench (people that exist)
- **Adopt:** the DM (a Start step, and a sweep when a card gets a new book) reads the cards' books and writes for each
  named secondary person a short *stub* record (kind `person`, 1-2 lines: who, how they stand to the player's character,
  aliases) into the chat's world book. The full lorebook entry stays and fires by key as before. This is the "two parts"
  trick done by code: the stub is `pinned`-like (always short in the prompt), so the model always knows she exists.
  Entries with `secret` (#416) are never adopted; a Records switch "do not bring back" per person.
- **Silence counter, code only:** replies since the name or an alias last occurred in a message or the person was in
  the Dashboard `present`. Names come from `namesOf(rec)` (World) and the registry; no model call.
- **Entrance due** when silence passes a threshold that depends on the Frequency setting, with jitter (seeded, so a swipe
  does not change it): Rare ~60, Normal ~30, Often ~15 replies.

### 2. The cast deck (people to be introduced)
- New state `cast`: `[{ id: "c1", name, faction, aliases, text }]`, at most 24, kept beside `deck`; carried and saved with
  the world (`carry`, library, `cleanWorld`), rewound on swipe (`CORE_KEYS`).
- `text` = look, character, goals, a hook for how they come in; 5-10 sentences, `CAST_MAX` about 1200 characters
  (the events deck's `EVENT_MAX` 400 is too small).
- **Build:** a new Start step `{ cast: true }` after the fronts (`startPlan`), driven by a recipe field
  `cast: { factions, perFaction, prompt }` (like `fronts`). Input: group records, fronts, the cards. Every NPC belongs to a
  faction (a `group` record or a front) and wants something from it or against it. One call for up to 4 factions; more
  factions split per faction.
- **What exists today (checked in the code, owner's correction 2026-11-16):** the events deck is built only by force: at
  Start when the profile option `deck` is on (off by default), or by `POST /world/deck` from the World window outside the
  chat (`deckRoute`, which replaces the whole deck). Nothing refills it during play. Without the option the DM model writes
  an event text on its own run. The writer then receives the event as `SOFT_EVENT` ("may come up in this reply if it fits");
  only the levels director, antagonist and chaos use `HARD_EVENT`. So the writing model decides, and it usually lets a
  soft hint pass. The cast must not copy this.
- **Refill is new and automatic:** after a DM run, when fewer than 3 cast cards are left, one background build call adds
  cards (merges, never replaces, and keeps the player's edits). A World-window button to rebuild stays as a manual way.
- **Draw:** a card becomes a `person` record (`by: "dm"`, active, with aliases) at the moment of the entrance. Before that
  it is not in the prompt (no keys, no budget, no leak). After it, keys and the Dashboard take it over.
- **Which card:** code picks by relevance: faction of a stirred or fuller front first, then a faction whose group record
  is tied to the scene's place, else random. When the DM model runs anyway it may name the card (`out.event.cast`) the way
  it names a deck event.

### 3. The entrance (one insert, both sources)
- Rides the existing `event` channel (`kind: "cast"`, `ref`): one shot, `delivered`/retry, `retryStale`, `eventLost`,
  rollback with `undoFrom` all apply unchanged. Text, for example:
  `[CAST: <name> (<line>) has not been around for <n> messages. Let them enter this reply in a way that fits the scene:
  a message, a call, an arrival, or someone present mentioning them. Never mention this note.]`
  A deck card adds its full text. The form depends on where the person is: far away (Dashboard place or contact) means
  message or call only, and then they know only what was sent (#415).
- **Firm wording, not the soft event note:** a hint that "may come up if it fits" is exactly what lets a model skip the
  person for 150 messages. The entrance says that the person enters in this reply, names the allowed forms, and only the
  *form* is left to the writer, not whether. Escalation ladder: first try is firm; if the name is absent from the reply,
  the retry is stricter ("they must appear in this reply; the shortest form is a message"). The soft wording stays only
  for a "rumour" entrance (the person is only mentioned).
- **Delivery check by code:** the person's name or alias occurs in the next reply. Still not delivered after the retry:
  the card goes back to the deck and the bench person keeps their counter (never burnt).
- **Guards:** not in combat or an explicit scene (same rule as events), not in the first replies of a chat, one pending
  entrance at a time, a minimum gap between entrances by Frequency, never someone already present, none while an event or
  Life from the DM is pending.

### 4. The Life die becomes cast-aware
When Life gates and the bench has someone overdue, the intrusion is that person instead of the abstract list:
minor = a message or a mention, notable = they arrive, major = a crisis they bring that the scene must answer.
Same seed, same swipe stability. Without a candidate the old text stays.

## Settings (World settings, a "Cast" group; the Start dialog gets a "Cast" step)
- Frequency: Off / Rare / Normal / Often (same dial pattern as group dynamics). Default Normal once the DM is on.
- Who: the bench, the deck, or both. Default both.
- Start: factions (default 3), NPCs per faction (default 2), card length (short / normal / long).
- Forms allowed: arrivals, messages and calls, rumours (messages are always allowed).
- Works at every level that has a state file; it does not need fronts or the event switch (open question below).

## UI plan (first draft, superseded by "UI plan v2" at the end)
- Settings dialog: one new "Cast" group beside Dice and Events; plain words, not rule names.
- Start: a Cast step with the three numbers, same look as the other steps; the draft lists factions with their NPCs, each
  card editable and removable like a record.
- Records tab: a "Cast deck" section (undrawn cards grouped by faction) and a "Bench" badge with a "do not bring back"
  switch on a person. Read-only "silent N" hint. **No** manual draw or remind button (owner decision).
- Fired / World runs panel: a line "Cast: <name> entered (silent 41)" so a player sees why someone appeared.
- Guide page for World DM and the settings text updated in the same change; the Roleplay guide has the format
  (`.fork/handoff/guide/FORMAT.md`).

## Data and docs to touch
- `docs/DATA-FORMATS.md` ("World DM"): state `cast`, recipe `cast`, the event `kind`.
- Handbook `roleplay-world-dm.md` (owners, data, flow, traps); `docs/COUPLINGS.md` for rollback keys.
- No change to the card or lorebook format in v1 (adopted stubs live in the world book), so the card skill needs no update.
- Tests (`test/rp-world*.test.ts`): silence counter, seeded draw and swipe stability, delivery by name, `cleanCast`
  bounds, `startPlan` with a cast step, a deck card never reaches the prompt before it is drawn, a `secret` entry is
  never adopted, rollback restores the deck.

## Phases
1. Bench and entrances: adopt stubs, silence counter, entrance insert, delivery check, cast-aware Life, Frequency.
2. Cast deck: state, recipe field, Start step, refill route, Records section, draw by relevance.
3. Later: groups get the mirror of #294 (a neglect bonus in `natural` turn order), a `cast_neglect` signal for the #401
   director, and "what the absent one is doing" (#378) feeding the entrance text.

## Risks
- Too many entrances turn the story into a procession, and "Should"-style wording can make everyone shout (#405):
  Frequency, a minimum gap and the "if it fits" wording are settings, tuned on real free models before release.
- A faction NPC that contradicts a card's lorebook: the build prompt says to use names and facts of the cards and never
  contradict them (the invent rules already do).
- An adopted stub for a person the lorebook hides on purpose: skip `secret` entries and offer the switch.

## Decided by the owner (2026-11-16, second round)
1. **Forms:** the full range (message, call, arrival, invitation and so on). The list is wide and the choice of form is the
   writing model's. The note is roughly: "<name> has not been around for a long time. Bring them into the story.
   (die) small or big event". The scale comes from a die: **2d6 plus a modifier**. The modifier grows with how long the
   person was silent and with how much they weigh in the story (a friend, a mother, family weigh more than an
   acquaintance): the longer the silence and the heavier the person, the more significant the event.
2. **Every level, always on.** Cast is on by default. The Frequency dial keeps an Off position for the rare player who wants
   it, but a new world starts on Normal.
3. **Both:** the bench is adopted automatically at Start, and on a button in the World window for chats that already exist.

### The die (replaces the "minor / notable / major" wording above for entrances)
- `roll = 2d6 + silenceMod + weightMod`, seeded (chat, last message, swipe) like the Fate die, so a swipe re-rolls the same.
- `silenceMod`: 0 at the threshold, +1 for each further half-threshold of silence, capped at +3.
- `weightMod`: from a per-person `weight` (0 acquaintance, +1 friend or rival, +2 family, partner or a central figure).
  The DM assigns it when it adopts the person (it reads the lorebook text), the player can change it in the Records tab.
- Bands: up to 6 small (a message, a mention, a short call), 7-9 medium (a call with a request, an invitation, a visit),
  10 and up big (arrives with news, a demand or a crisis the scene must answer). The band is written into the note; the
  form inside the band is the writer's.
- The same bands serve the cast-aware Life die and the cast deck draw (a new NPC enters small, medium or big).

## World book rework (part of the same change, owner: not a separate issue)
The world book is where bench stubs and drawn cards land, so it is reworked with them. Findings (code and the owner's
screenshots of a played chat: 80 records, 47 runs, one front):

- **It collects litter.** About 80 percent are `thing`. Two sources: the DM rule for things is vague ("bought, taken, given,
  hidden, left or used in a way that matters"), and `sweepCandidates` offers *every* object the Dashboard scene lists
  (up to `SWEEP_THINGS` = 8 per sweep), so a cup of instant noodles in a guard's hands becomes a record. Facts get pushed in too.
- **It never cleans.** The only exit is "retire when finished for good". A thing that played two turns stays for ever.
- **It duplicates the lorebook.** The DM is told not to record characters with their own cards, but people of the cards'
  lorebooks are not excluded, so the same NPC lives in the book twice (and both fire).
- **The look.** "Look at the world" is a read-only wall of long cards. The Records tab already has search, kind filters,
  add, edit, pin, retire, restore, delete and "fill keys"; it is the better base.
- **The double question.** `lookAtWorld` (`world-controls.tsx`) and `askShow` (`world-runs.tsx`) always ask the spoiler
  question, while the tabs honour `needsGate` (a world the DM wrote from the played story opens at once). The owner's
  earlier decision was "opens without a question", so the two buttons are a leftover.

What changes:
1. **Records are kinds that match how a player thinks:** People, Places, Factions, Things, Notes.
   Factions include friends, rivals and enemies as groups, not only organisations. Each person and faction carries a
   relation tag (ally, family, rival, enemy, neutral) used for colour and as the source of `weight`. Facts leave the main
   list: they go to Notes, or are folded into the person or place they belong to.
2. **Things are rare and have a reason.** The DM prompt says a thing needs a stated reason (clue, weapon, gift, promise,
   something people fight over, something a lorebook lists). The sweep stops offering ordinary scene objects; it offers
   only objects that were taken, given, hidden or left on purpose, and caps active things (about 15).
3. **A lifecycle, in code, no model call.** A record that is not pinned, not on the bench and not in the cast deck, and has
   not been named for N replies (a thing: fewer than a person) moves to "Archive" by itself. A thing whose holder and
   place did not change and that was not named for a few replies counts as played out. Nothing is deleted: the player can
   restore from the Archive. A per-kind soft cap archives the oldest first.
4. **One record per person.** Before the DM or an adoption writes a person, code compares the name and aliases with the
   chat's lorebook entries, the cards and the registry. A match becomes a *link* (the record points at the lorebook entry
   and keeps only what the story added: weight, relation, last seen), not a second copy. The DM prompt gets the list of
   lorebook people so it stops re-describing them. A bench stub is exactly such a link.
5. **UI.** The "So far" tiles split Records into People, Places, Factions, Things (Archive and Cast deck are counted too).
   "Look at the world" opens at once for a played chat (the question stays only for a world built by Start before the story,
   where the story has not shown the records yet). The World window gets larger, with tabs by kind, a search that covers
   names, aliases and text, filters (relation, source: DM / you / lorebook, active or archived), colour by kind and
   relation, compact cards with the text folded, inline edit, and bulk retire or delete. It extends `world-records.tsx`;
   it does not start again.
6. The Cast deck (undrawn cards by faction) and the Archive are two more tabs in the same window.

## Phases (updated)
1. Entrances and bench: stubs as links, silence counter, the 2d6 entrance with firm wording, delivery check,
   cast-aware Life, Frequency (default Normal), adopt at Start and by a button.
2. Cast deck: state, recipe field, Start step, automatic refill, draw by relevance.
3. World book rework: kinds and relation tags, stricter things and sweep, the code lifecycle with Archive, lorebook
   de-duplication, the "Look at the world" question, tiles, and the larger World window.
4. Later: groups neglect bonus, `cast_neglect` for #401, "what the absent one is doing" (#378).
Phases 1 and 3 touch each other (links, weight, relation tags): the data shape for a person record is decided once, in phase 1.

## To confirm with the owner
- Spoiler question: opens unconditionally for a played chat; kept only for a world built by Start before play.
- (Resolved 2026-11-16, see "Corrections v3": "things must go" meant that played-out things are removed from the book,
  not that things come from the lorebook.)

## UI plan v2 (2026-11-16, after reading the World window code; ux-review section 1)
Source of truth: Roleplay `src/components/world/` (copy of 4.127.0). Nothing here needs a new component family.

### Where things live today (inventory, kept as it is)
- World section: left pane (Chats | Worlds | Profiles, gear = World settings), right detail with six tabs
  (`world-tabs.tsx`, `WorldTabsList`: Overview, Places, World book = Records, Start, Backgrounds, Runs).
- Records tab (`world-records.tsx`, 512 lines) already has: search (names and keys), "+ Add", kind chips with counts
  and colours (`KIND_TONE`), the "fill keys" block with its cost note, the spoiler gate ("Show"), the add and edit form
  (name, kind radio, place size and "inside", thing "where" with place or holder, keys, members, text with length),
  and per card: name, kind chip, "retired" tag, "by you" tag, pin tag and hint, "no keys" warning, keys, members,
  space line, text, and four buttons Edit, Retire or Restore, Pin, Delete. Empty and no-match states.
- Chat side panel (`world-controls.tsx`): "So far" tiles (`world-so-far.tsx`), last run, scenario, New chat in this
  world, Save world, Look at the world (a read-only dialog; the source of the "wall of text").
- Options: profile editor `OptionsSection` (`world-profiles.tsx`) and the chat's World DM panel both use `DiceFields`
  (`dice-fields.tsx`): a segmented control with an explanation per choice, `SettingRow`, `Fold` (`ui/fold.tsx`).
- Start tab (`world-start.tsx`): the `start-deck` switch row, the step plan, the draft panel.

### Decisions
1. **Kinds stay chips inside the World book tab (variant A), not new tabs (variant B).** The tab row is already 6 wide
   (two rows of 3 on a phone), Places already owns a tab with backgrounds, and the chip row with counts and tones
   exists. Variant B adds 3 or more tabs and breaks the 6-column grid.
2. **Labels, not data:** the data kinds stay `person|place|group|thing|fact`; `group` is shown as "Factions" and `fact`
   as "Notes" (`world.kind.*` strings). No migration.
3. **"Look at the world" in the chat opens the same Records component in a sheet**, not its own read-only list: one
   pattern per job. It opens at once for a played chat (`needsGate`), `lookAtWorld` and `askShow` stop asking always.
4. **New chips:** Cast deck and Archive. Archive holds both finished (`past`, retired by hand) and resting (archived by
   code) records, told apart by a tag.
5. **Person and faction cards get three new fields in the edit form:** Relation (segmented: ally, family, rival, enemy,
   neutral), Weight (segmented: acquaintance, friend or rival, family or central) and a "bring back automatically"
   switch. Hidden for places, things and notes. A "linked to lorebook" tag and a read-only "silent N" hint on the card.
6. **Frequency is a segmented control** (Off, Rare, Normal, Often) with one sentence per choice, in the same card as
   Dice, on the profile and in the chat's World DM panel, built from `DiceFields`' pieces.
7. **Start gets a Cast switch row** beside the events deck switch; its numbers (factions, people per faction, card
   length) appear only when it is on; a second switch "adopt people from the cards' lorebooks".
8. **Text search covers the text too**, not only names and keys (`filterRecords`). Filters for relation and source are a
   second chip row; on a phone that row folds into one "Filters" button (a fold that looks like a fold).
9. **Cards fold their text** to two lines with a tap to open; the four buttons stay as they are (40 px on a phone).
10. **Bulk actions:** tick cards, then Retire or Delete for all. Delete asks first, as now.

### States to cover
Empty book, empty cast deck (says what goes there and how it fills), loading a draft, a build error with a retry,
a card being edited, a card linked to a lorebook entry that was later deleted (the link shows "entry missing" and the
record keeps its own text), a restored archived record, a long name, light and dark, 390 px and 1280 px, uk and ru strings.

### Mock
Clickable HTML mock shown in the session on 2026-11-16 (four screens: World book, chat panel, Cast settings, Start
step). It draws only what changes; everything in the inventory above that is not drawn stays as it is. New parts are
marked "new" in the mock.

## Order of work (decided to propose 2026-11-16)
The record shape is decided once, first, because the bench, the deck and the cleanup all read it:
`weight`, `relation`, `link` (lorebook entry ref), `status: "dormant"` (archived by code), `bench` switch; plus state
`cast`. After that, three Roleplay releases:

1. **Release 1: the pain.** Record shape, one record per person (link, not copy), silence counter, the 2d6 entrance with
   firm wording and the delivery check, cast-aware Life, Frequency (Normal by default), adopt the bench at Start and by a
   button, the fixed "Look at the world" question. UI: the Cast settings group, the three person fields, the tags.
   Why first: it fixes the friend who is silent for 150 messages without waiting for the rest.
2. **Release 2: the book.** Stricter things and sweep, the code lifecycle and Archive, kind labels and tag colours,
   split tiles, the search, filters, folded cards, bulk actions, the sheet that reuses Records.
3. **Release 3: the deck.** State `cast`, recipe field, Start step with its switch and numbers, automatic refill, the
   Cast deck chip, draw by relevance.
Release 3 is last because deck cards need the Factions label and the Archive chip from release 2, and its draw reuses
release 1's entrance. Each release ships on its own (addon rule); no engine release.

## Corrections v3 (2026-11-16, owner after the mock)
**The mock showed the wrong screen.** The owner's pain is the chat side panel ("So far", `world-so-far.tsx` and
`world-controls.tsx`), not the World window. The World book tab is already acceptable; it gets only small marks.
A second mock shows the panel (clickable).

### Chat panel: the tiles become types, coloured and clickable
- Today four tiles: Records (all 80), Retired, Fronts, Runs. Records is replaced by five type tiles in the type colours
  already used by `KIND_TONE`: People (pink), Places (teal), Factions (violet), Things (amber), Notes (sky). A second row
  holds the others: Archive (slate), Fronts, Cast deck (indigo), Runs.
- **Each type tile is a button** (`aria-label` "People, 12, open the list") that opens a sheet with only that type: search,
  the type chips (so there is no dead end), "+ Add", and the cards of that type with the existing form and the four
  buttons. This is the same `WorldRecords` component with a preset `kind`; "Look at the world" opens it with All.
  The sheet reuses the existing `Dialog` (full screen on a phone) and has "Open in World".
- Colour collisions fixed: Fronts leave pink (People owns it) and become orange; Runs lose their sky tone (Notes owns
  it) and become neutral. A type with no records stays visible but dimmed, so the layout does not jump; Archive and
  Cast deck are hidden at 0; Fronts keep their rule (only when the level has events).
- The "Look at the world" question is removed for a played chat (see above).

### World book tab: small marks only
Chips tinted by type all the time (today only the chosen one is), plural names (People, Places, Factions, Things, Notes),
two new chips (Cast deck, Archive), a left stripe in the type colour on a card, tinted key tags, the main button tinted.
Text search added. No re-layout.

### Things: the tidy-up rule (owner's words, replaces the vague lifecycle for things)
- Every 10 replies, in code, no model call: for each active thing count the replies of the last 10 in which its name or
  an alias occurs. If it was named fewer than 3 times **and** it does not belong to a named main or secondary character,
  it is removed from the book (moved to the Archive: out of the prompt, restorable, counted by the Archive tile).
- "Belongs to a named character" = held or worn by the user's character, a card character or an active person record
  (the Dashboard's carry and `holder`). Pinned things stay. A thing younger than 10 replies is not judged yet.
- The sweep stops offering ordinary scene objects, so the cup of noodles in an unnamed guard's hands never gets in.
- The count reads the chat text, not a stored counter, so a swipe or a delete cannot corrupt it.
- People, places and factions are never archived by this pass: the bench and the cast need them. Notes (facts) need their
  own rule because they are rarely named by their title: recommended, archive a note not updated for 40 replies unless
  pinned or tied to a person or place. To confirm.

## Corrections v4 (2026-11-16, owner: facts do not belong in the world book)
**Decision:** the World DM stops writing facts into the world book. Facts live in the Litopys (`facts[]` per chat with
`knownBy`, `subject`, `type`, `weight`, secrets and suspects from #416). This replaces the "Notes" type everywhere above:
there is no Notes tile, chip or kind, and the open question about a rule for Notes is closed.

What it means in code and UI (checked against the Roleplay copy of 4.127.0):
- The kinds written from now on are `person`, `place`, `group`, `thing`. The DM prompt says facts go to the Litopys, not
  here. `KINDS` in `plugins/world/plugin.js` and the web copy in `src/lib/world-records.ts` lose `fact` for writing; it is
  still read, so old records show up. **Trap to fix:** `cleanEntity` and `applyReport` turn an unknown kind into `fact`
  (lines 1261, 2623, 5036); an unknown kind must now be skipped, not become a note.
- Old `fact` records: a banner "N old notes belong in the Litopys. Move them" in the world book list and the dialog. Move =
  for each, the client calls `POST /litopys/facts` (`factRoute`, op `add`: `text` at most 300 characters, `subject` = the
  record's name, `knownBy` = "all") and then deletes the World record. A preview lists the ones longer than 300
  characters so they can be shortened first; nothing is cut silently. When none are left the banner and the "Old notes"
  tile are gone.
- The recipes (`from-cards`, `interview`) have sections whose kinds include `fact` (customs, history, a secret, a
  rumour, a danger). Those facts are not records any more: the draft shows them as "Story facts, they go to the Litopys"
  and the accept step writes them with `factRoute` (a secret gets its `knownBy` from the model's list when it gives
  one). To verify: that the accept step can call both routes, and that Litopys is on for the chat.
- Tiles in the chat panel: People, Places, Factions, Things in the first row (four, so each gets more room), "Old notes"
  only while any exist. The second row stays Archive, Cast deck, Fronts, Runs.
- The things tidy-up rule of v3 is unchanged. It is now the only automatic cleanup in the book.

### The opened world book in the chat (the dialog behind "Look at the world" and every tile)
Replaces the read-only "The world so far" wall. Mock shown in the session (desktop dialog and phone full screen).
- Title "World book" with the record count, "Open in World" and Close. One line of lead text, not two.
- Search over names, keys and text, and "+ Add".
- Type chips with counts, tinted by type: All, People, Places, Factions, Things, Cast deck, Archive. A tile click opens
  the dialog with its chip already chosen.
- Compact cards with a stripe in the type colour: name, type tag, relation tag, "linked to lorebook" or "silent N" tag,
  keys on one line, text clamped to two lines (tap to open), then Edit, Retire or Restore, Always in the prompt, Delete.
  Edit opens the existing form in place; people and factions also get Relation, Weight and "Bring back automatically".
- A banner for old notes while there are any.
- A phone shows it full screen with the same order; touch targets stay 40 px in the code.
- It is the existing `WorldRecords` component in a `Dialog` (the dialog of `world-controls.tsx`, lines near 627, loses its
  own list), so the World tab and the chat show the same thing. No second list.

## Corrections v5 (2026-11-16)
- **Dialog width (owner):** on a desktop the world book dialog is wider than today's, by at least 50 to 100 px. Today it is
  about 510 px; the new width is 580 to 620 px, because the cards are text to read and must not be squeezed. A phone stays
  full screen. The same width holds for the sheet that a type tile opens.

## Idea, not decided: the DM learns what this player does not want (owner's question, 2026-11-16)
Filed as its own issue (see the issue list); recorded here because it touches the book rework.
- Today a delete writes only `{ id, at }` into `state.dropped` (`DROPPED_MAX`): no name, kind or text. The DM learns nothing
  from it and may add the same thing again.
- Step 0, cheap and safe: store what was deleted, retired early, restored, pinned or added by hand (kind, name, a short
  text, who made it, age, time) in the chat's state. Use it narrowly: never re-add a record the player deleted by name.
  This belongs in release 2 of the book rework.
- Step 1: when enough similar signals gather (for example 5 deleted things), the next DM run gets them with its input and
  may propose 0 to 2 rules; the player confirms each (yes, only this chat, no), the way the built-in agent's memory
  asks. Confirmed rules go to a short "what this player prefers" block of the DM prompt (about 10 rules, about 600
  characters) with an editor in World settings ("What the DM learned": edit, delete, reset). Per chat or global; a global
  rule needs a second confirmation.
- Not a lorebook entry: entries fire by keys and cost the writer's tokens, and a meta rule about the player would confuse
  the story model.

## Corrections v6 (2026-11-16)
The learning idea has its own home: issue #425 holds the full design (decisions, storage, the DM tab, the Memory view, the
inventory of the Profiles editor that is kept). Owner decisions there: not in the world lorebook, a separate DM store next
to the prompt, the Profiles tab renamed to "DM". Only step 0 (remember what was deleted) stays in release 2 of this issue.

## Corrections v7 (2026-11-16, a review against the code of 4.132.0; owner: "записуй всі")
Also posted as comments on #424 and #425. Where a point contradicts the text above, this section wins.

### Corrections
1. **Things tidy-up (changes "Things: the tidy-up rule" of v3).** The 3-in-10 rule alone archives what the book exists for:
   a hidden letter, a key, a clue are silent on purpose, and `entryOf` disables a `dormant` entry, so the writer does not
   get it when it is named again.
   - A thing gets a field `why`: `clue`, `hidden`, `promise`, `gift`, `weapon`, `contested`, or none. The DM writes it,
     the player can change it in the form. `clue`, `hidden` and `promise` are exempt from the 3-in-10 rule.
   - Auto-wake: an archived (`dormant`) thing named in 2 replies of the last 10 becomes active again in the same code
     pass, with a log line. Every archive and every wake is logged (who, why, the counts).
2. **Mentioned is not on stage (repairs 4.131.0).** `judgeEntrance` counts "came" when the name occurs, and the silence
   resets on the name too, so a one-line message buys a whole threshold.
   - Two silences: `mentioned` (name or alias in the text) and `stage` (in the Dashboard's `present`, or a contact). Without
     the Dashboard only `mentioned` exists and the behaviour stays as today.
   - The judge's result is `came` (on stage) or `mentioned`; the log and the mark under the reply show which.
   - A medium or big entrance that ended as `mentioned`: half the usual gap before the next one, and its band is at
     least medium.
3. **Scene boundary (waits for the owner's live-model tests).** A due entrance waits up to 6 replies for a place change
   or a time jump and then fires anyway; a time jump of a day or more adds to the silence.
4. **World facts stay in the book (narrows v4).** A fact about the world (a custom, a law, history) is folded into the
   text of the place or faction it belongs to; only events and secrets go to the Litopys. The "old notes" banner offers
   both ways per note. Verify first whether a saved world and "New chat in this world" carry Litopys facts.
5. **The bench also reads the cards (after the live tests).** `benchEntries` reads only lorebooks; add each card's
   description and scenario to the same build call. A person found there is a record with no `link`.

### Additions
6. **A reason to come back.** When a bench person is within one DM cadence (`everyN`) of their threshold, the DM run's
   input lists them ("may come back soon: n3 Mira (silent 27)") and its output may carry `returns: [{ id, why }]`:
   what they were doing and what they want now, tied to a front or an open thread, at most 200 characters. Stored on the
   record as `hook { text, at }` and rewound with the core; `entranceInsert` uses it in place of the first sentence.
   No hook: today's note. Covers #378's "what the absent one was doing" only for those who return.
7. **The DM's input shrinks (repairs what is shipped).** `dmInput` sends every active record in full. Full text only for
   records named in the new part of the story, at the scene's place, pinned, or bench people who are due soon; every other
   record is one line `id · kind · name`. The DM can still update or retire by id. Measure the input with
   `estimateTextTokens` before and after on a state of about 80 records and put both numbers into the PR.
8. **Step 0 tells the DM.** The input carries "Do not record (the player removed): ..." (the newest 30 names) next to
   the code refusal.
9. **Deck cards are tied to someone.** A cast card names one existing person (`tie`: a name from the records or the
   cards) and its own want, besides the faction.
10. **#425:** the first proposals are settings raised by a code threshold, with no model; enough signals is a share of the
    DM's own records of a kind, not a count; a prose rule gets a small call of its own; rules do not travel with a saved
    world; a hand edit of a record's text is logged in step 0 (kind, length before and after).

### Order (replaces "Order of work" for what is left)
- **2.5, a small release first:** 7 and 2.
- **3, the book:** as planned, with 1, 4 and 8.
- **4, the deck:** as planned, with 6 and 9.
- **After the owner's live-model tests:** 3, then 5.
- **5, the DM tab and Memory (#425):** with 10.
