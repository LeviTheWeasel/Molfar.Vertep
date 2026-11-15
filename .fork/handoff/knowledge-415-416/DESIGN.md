# #415 + #416: who perceives and who knows (design, 2026-11-15)

Owner's picks (all the recommended options): #415 = a note next to the player's messages plus a check after the
reply; secret lorebook entries learned by reveal words plus a manual button; a narrator gets the truth with a marker;
"suspects" and "secret" on facts are set by the Litopys worker. Roleplay version 4.128.0, branch
`claude/knowledge-415-416` in Roleplay and here. No engine code change.

## 1. #415 Remote contact (Litopys + Dashboard)

**Note (code, Litopys `llmRequest`, `remoteNotesFor`).** For each player message still raw in the request whose
scene had someone in touch from elsewhere, a system line right after it:
- text/letter: `[Yae Miko is elsewhere, in touch by text: of this message Yae Miko gets only the text Vladyslav sends; what Vladyslav does or says aloud there, Yae Miko does not see or hear.]`
- call: `... on a call: hears only Vladyslav's voice and the sounds near the phone, nothing done in silence.`
- video: `... on a video call: sees only what is in Vladyslav's camera and hears what is near it.`

The scene of a player message = the snapshot of the reply that answers it; the newest message (no answer yet) takes
the latest snapshot. Several far characters of one kind share one line. At most the last 8 player messages get a
note. Runs after the presence cut, on its output (messages are found by the `hist` hashes, so a cut message is simply
not found). Setting `remoteNote` (Litopys config, default on), no per-chat switch. Trace: `remote: n` in the insert
file, shown in the memory trace parts.

**Check (Dashboard sensor, P3 frame).** When the base snapshot has a far character, candidates are built in code:
one per far character, holding the player's text of the remote run that went before the new reply (the player
messages of the last 3 turns of that run, each cut to 1500 characters, newest first, at most 3500 in all).
`factId = "remote:<msgId>"` (the newest player message of the run). The sensor's leak block gets a second kind of line:
`L2: Yae Miko is elsewhere (by text). Yae Miko does not know what Vladyslav did or said aloud there, only the text he sent. His messages: «...»`.
`cleanLeaks` keeps it like any other. Fast mode makes its small call in that case too (a remote scene is enough;
P3's code step A cannot filter here). UI: the leak note shows "{who} reacted to something {user} did not send",
no "found out" button for `remote:` hits (Regenerate, Not a leak).

## 2. Secret lorebook entries (engine plugin + Dashboard data)

**Format** (entry field, rides `extra` in old clients): `secret: { knownBy: string[], cover: string, reveal: string[] }`.
An entry is secret when `secret` is an object (an empty `knownBy` = nobody knows at the start).

**Who knows, per chat, computed at every scan** (`loreKnowers`, engine plugin, never stored except the manual part):
1. `secret.knownBy` (from the start);
2. heard: a message on the active line whose text matches a reveal word (the same key matcher as the scan,
   `keyMatchDirect`) teaches everyone present for it: the Dashboard snapshot of that reply (`present`), or for a
   player message the snapshot of the reply that answers it (the newest: the latest snapshot), plus the message's
   author; no snapshot = the author only. The pending player text counts as the newest message.
3. manual: `lore-known/<chatId>.json` `{v:1, add:{"<bookId>#<uid>":[names]}, remove:{...}}`; `remove` beats 1 and 2.
Name match: lower case, the card's names (card name, `data.name`, soul character keys) or a knower that is a whole-word
part of the speaker name ("Yae Miko" in "Sugar Mommy | Yae Miko").

**What the prompt gets** (one point, `textOf` and the recursion text):
- one voice (a card with one name, not narrating, not a roster turn): a knower gets the content; anyone else gets
  `cover` (empty cover = the entry is held back, blocked reason `secret`);
- impersonate: the persona is the speaker;
- several voices (group narrator, roster/append turn, a card with several names): the content plus
  `[Secret: only A and B know this. Everyone else knows it as: <cover>]` (or `... knows nothing of it.`).
The fired record carries `secret: "known" | "cover" | "marked"` and the knowers.

**Routes:** `GET /lore-known?chatId=` the chat's secret entries (in scope) with knowers `{name, how: start|heard|manual, word?}`;
`POST /lore-known {chatId, entry, who, op: add|remove}`.

## 3. Facts: suspects and secret (Litopys)
- Fact fields: `suspectedBy: string[]` (never overlaps `knownBy`; a name that comes to know leaves it), `secret: true`.
- Worker prompt: two more fields; `factOps`/`applyWorkerResult` read them; the fact routes accept them.
- Prompt: for one voice, a fact the speaker only suspects goes in as `- (only a suspicion) ...`; the who-knows brief
  says `Only A knows (B suspects; A keeps it secret)`. The leak check does not flag a suspect.
- Not carried: the far digest and snapshot books keep `knownBy` only (a suspect there counts as not knowing).

## 4. Invariant tests
`test/rp-knowledge-invariants.test.ts`: a fact is not known by someone absent; a chapter without cast (the known trap,
written as is); a suspect is not a knower; a secret lore entry: knower, cover, marker, held back; reveal teaches only
those present; manual remove wins; remote note on the newest message and on an older one; a cut message gets no note.

## UI plan (ux-review section 1)

| Where | What | Components |
| --- | --- | --- |
| Lorebooks > book > entry editor | New fold **Secret** after "Only when": switch "Not everyone knows this"; when on: "Who knows from the start" (name chips), "What the others see" (textarea, placeholder "e.g. An old dagger with strange runes."; hint "Empty: the entry stays out for those who do not know."), "They learn it when they hear" (key chips, hint "Anyone in the scene when one of these words is said learns the truth."). Closed summary: "Off" / "2 know · cover · 1 word". | `ui/fold.tsx`, `lore/key-chips.tsx`, `entry-folds.tsx` row helpers, `Textarea` |
| Entry list rows | A lock icon (with aria-label) on secret entries | `entry-row-head.tsx` |
| Chat > What fired > Lorebooks | Fired row of a secret entry: a chip "Secret: cover shown" / "known" / "marked for the narrator". A fold **Secrets in this chat** (only when the chat has secret entries): per entry the knowers as chips with how they learned ("from the start", "heard «word»", "added by you"); × on each (manual remove, or undo a manual add); "Add who knows" = a small input with the present names as suggestions. Empty state: "Nobody knows yet." | `ui/fold.tsx`, `fired-tabs.tsx`, `Chip`/`Badge`, `Input` |
| Chat leak note | Remote hit: title "{who} reacted to something {user} did not send", line "Only the text you send reaches {who}." No "found out" button. | `chat/leak-note.tsx` |
| Library > Litopys settings | Switch "Remote contact note" next to the presence cut, hint "When someone is in touch by text or call, a short line after your message says what reaches them." | existing settings rows |
| Litopys fact editor | "Suspected by" name chips and a "Secret" switch; fact rows show "suspects: B" and a lock | existing fact editor |

States: off/on, empty lists, a book in the chat with no secret entries (the fold is absent), phone 390 px (folds
full width, 40 px targets), dark and light. Variants considered for the per-chat knowers: (a) a fold in What fired
(picked: it is where one sees what the reply got); (b) a Dashboard tab (one more tab for a rare job); (c) a chat
picker in the entry editor (the editor is per book, not per chat).
