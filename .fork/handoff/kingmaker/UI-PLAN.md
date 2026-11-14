# Kingmaker: UI plan for the first screens (2026-11-14)

Written before any code (skill `ux-review`, section 1). The clickable mock is `mock.html` beside this file
(sample world in Ukrainian, fixed dice, no engine). Compare the built screens with this plan before done.

## Where the player starts and the steps
- Launcher > Kingmaker > the last world opens on the Throne (the turn). No world yet: the creation screen.
- A turn, common path: read the report, answer each matter (one tap per matter), press "End the turn",
  confirm once, read the Dusk. Four kinds of action, each visible on the first screen.
- A new world: pick a door (one tap), type a direction or answer the questions, watch the draft build,
  trim, "Begin the reign".

## Layout of the Throne: variants
- **A. The chronicle column (picked).** One readable column: prose of the report, then the matters as
  cards inside the same column, the main button at the bottom. Resources are a slim strip under the
  header; the ruler's sheet is a side column on a wide screen and the Court tab on a phone. Prose leads,
  numbers stay in sight.
- B. A dashboard: resource tiles on top, matters in a grid, prose in a side panel. Strategy first; the
  owner asked for the opposite.
- C. A chat: report, matters and orders as messages. Familiar, but decisions and state scroll away.

## Screens
- **Throne.** Header: world, ruler's title and earned marks, turn and season, rank. Resource strip: four
  chips with the change per turn. Report (prose). Matters: a card each with where it came from (deck,
  the state, a front), options with their price and what is rolled, "your own order" as free text, and
  where it applies "do it in person" (marked with its risk) or "talk" (a scene). Counter of deeds in
  person left this turn. "End the turn" is the one primary button; it asks once, in the page, and says
  Dusk is final. Matters left open are named there ("the court decides, worse").
- **Scene.** The stake box first (full, partial, failure, and the risk to the ruler), prose, the player's
  line, a visible roll at the uncertain moment, "End the scene" maps to one stated outcome.
- **Dusk.** Per matter: the roll and its band in words and colour plus icon, then the chronicle prose,
  rumours, courtiers' diary lines, the resource changes. "Next turn".
- **Court.** The ruler's sheet (skills, traits, wounds, marks, relics, own thread), the inner circle
  (loyalty, bond, personal quest with steps), offices and holders.
- **Factions.** A card per front: goal, clock in segments with the stage in words, stance, what they want.
- **Realm.** The ladder with checkable requirements of the next rank; holdings.
- **Chronicle.** Past turns, the rumours feed.
- **The fall.** An epitaph and three ways on: heir, companion, a new person years later.
- **New world.** Three doors: "Do it for me" (one field and direction chips), Questionnaire, Import
  (lorebook, document, Roleplay cards). Then the draft: steps with their state, each part removable,
  "Begin the reign".

## States to build
Empty (no world; no matters this turn), loading (a draft step building; the report being written, with
the code-only fallback text when no model answers), error (a model call failed: the turn goes on with
template text and says so), default, changed (an option picked: the card shows the choice and "change"),
disabled with the reason in text (an option the chest cannot pay; no deeds in person left), phone.

## Components
New app, so nothing to reuse in place. Taken as patterns from Social (`src/screens/`): bottom tabs on a
phone, a rail on a wide screen, strings per screen in `en` and `uk`, a design preview on mock data.
Colours are the shell's tokens (`client/src/styles/tokens.css`): `cta` for the one primary button,
`warning` for risk, `danger` for the fall and failures, `success` for full successes; never colour alone.

## Phone
Bottom tabs (5), the primary button above them, targets 44 px, no hover-only controls, the ruler's sheet
moves to the Court tab, Ukrainian strings checked at 390 px.
