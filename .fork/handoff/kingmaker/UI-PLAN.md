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

## Second pass: the front as an interactive story (2026-11-14, mock `mock2.html`)
The owner asked for a more visual front: portraits, pictures, closer to an interactive story. The first
layout (the chronicle column) is replaced for the Throne, the scene, Dusk and the fall; the rules and the
list of screens stay.

### Variants for the Throne
- **A. The stage (picked).** A picture of the place on top, the person who brings the matter standing in
  it with a portrait, their words in a dialogue box under it, the options as story choices. One matter at
  a time; a strip of portraits shows all matters of the turn, which are answered, and jumps to any of
  them, so the one-at-a-time flow costs no blind step. The report opens the turn on the same stage.
- B. Stage on the left, the list of matters on the right. Keeps the overview, loses the story.
- C. One card and two answers, swiped. Too thin for three or four options, an order in words, a scene
  and a deed in person.

### What changes
- **Throne:** beats on one stage: the report, then each matter (place picture, bringer's portrait, their
  line in first person, a narrator line, choices with price and roll), then "Your orders" with every
  answer and the one primary button. Resources sit over the picture's top edge.
- **Scene:** a visual novel: the place, the other person's portrait, a name plate, their words; the
  player answers by picking an approach (each names the skill it rolls and its risk) or writes a line.
  The roll is shown as two dice and the band in words. The stake box stays on top.
- **Dusk, the fall:** full-width plates: a picture, a title, prose; results carry the portrait of whoever
  the matter was about.
- **Court:** a gallery of portraits; the ruler's sheet opens with the ruler's portrait.
- **Factions:** each front has a crest.

### Pictures, cheapest first (nothing may depend on a drawn one)
1. Drawn by code, always there: a paper-cut portrait from a few parameters (field, hair, garment), a crest
   from two colours and a charge, a place from layered shapes. The mock shows only this tier.
2. The portrait of an imported Roleplay card.
3. A picture drawn by the engine's picture model, when the user has one; it replaces the code drawing in
   the same frame, so the layout does not change.
Text never sits on a picture without a scrim; pictures keep their own dark palette in both themes.

### States added
A person without any picture (tier 1 drawing), a place without a picture (tier 1), a picture still being
drawn (the tier 1 drawing stays until the new one is ready, no spinner over the stage), phone (picture
16:9 on top, the portrait overlaps its lower edge, choices under the thumb).
