# Social: the journal (posts, and stories that ran out)
Verified at: molfar.vertep-social 0c90546 (branch claude/journal-j4-444, stacked on J3, J2 and the city branch, not merged)

## What it does
Every profile and the user keep a journal of dated posts. A post comes from the user's own hand, from a story that ran out after 24 hours (J1, no model call), or from a character writing from its own diary of the day (J2, one model call a post, off by default). J3 adds comments (the user's, and characters' by a model, off by default) and the user's follows. J4 adds friends-only posts (issue 444).

## Owners
- `plugins/journal/plugin.js`, `mirrorPass`: pure step that decides which stories are copied, dropped or filed.
- `plugins/journal/plugin.js`, `onTick`: reads the stories plugin's items file (read only), files posts, clears journals of deleted characters.
- `plugins/journal/plugin.js`, `cleanPost`, `readPosts`: every read goes through the cleaner; a damaged file reads as empty.
- `plugins/journal/plugin.js`, `pickWriter`, `postSystem`, `fileWriterResult`, `readState`, `writeNow`: J2, a character writes from today's unused diary lines (read only); key `jp:<profile>`; state in the journal state file.
- `plugins/journal/plugin.js`, `pickCommenter`, `commentSystem`, `commentUser`, `fileCommentResult`, `readComments`, `readFollows`: J3; key `jc:<commenter>:<owner>:<post>`; `only: "owed"` finds the answers a character owes the user.
- `plugins/journal/plugin.js`, `canRead`, `readCtx`, `friendsOfUser`: J4, the one rule of who may read a post; `GET /journal/friends`.
- `plugins/journal/plugin.js`, `handleRoute`: `/journal/feed|post|edit|remove|images|image`.
- `plugins/profiles/plugin.js`, `RESET_PARTS.journal`: Start over's "Journals" part; `community.storiesToJournal` is merged in the settings there.
- `src/screens/journal/`: the screen (`index.tsx`), calls (`api.ts`). `src/pictures/worker.ts`: draws pending pictures through `/journal/images`.
- `src/shell/app-shell.tsx`, `src/shell/nav.tsx`: the "journal" tab on desktop; on a phone `src/screens/settings/phone.tsx` has the row that opens it (More stays lit).

## Data
- `journal/<profileId|you>.json` {posts: [{id, at, title, text, image?, mood?, place?, tags, visible, from}]}. `from` is "you" or "story:<id>"; `visible` is stored for J4 and unused in J1; `place` is reserved for the City.
- `journal/comments/<postId>.json` {comments: [{id, by, at, text}]} and `journal/follows.json` {you: [ids]}; `follows` is reserved too. The state file also holds `ccounts`, `cpending`, `cfailedAt`.
- The journal state file {day, counts, used, pending, failedAt} (J2); `mirror` and `state` are reserved names: not owner ids, not profile ids.
- `journal/mirror.json` {stories, done}: a copy of each live story, and the last 1000 story ids already filed or removed.

## When a model is called
Only for a character's own post (J2): `community.journalPosts` on (off by default), Life on, the character online or away, under `journalPerDay` (default 1, 0 to 5), an unused diary entry of today, 8% a tick; the forum model, the profile's own wins. A comment by a character (J3): `community.journalComments` on (off), Life on, awake, under `journalCommentsPerDay` (2, 0 to 10), a post of the last 3 days that it may read (`canRead`: all; friends = followed by the user and following the persona back, or each following the other between characters; me = nobody), not yet commented by it, under 4 comments by characters, by someone it follows or is close to in Life's list (read only); 8% a tick shared with posts, except an answer owed to the user's comment under its own post, which ignores the chance. Stories filed in the journal and the user's posts and comments never call one. Pictures: a story filed with a pending picture is drawn by the Social page, as for stories.

## Flow
1. The stories plugin deletes a story at 24 h and a plugin writes only its own files, so every minute `onTick` copies live stories into the mirror.
2. A story that is a day old (in the stories file or only in the mirror), or gone from the stories file when the copy is 24 h less 5 minutes old, becomes a post `j-<story id>` of its author. A story gone while young was removed by the user: dropped.
3. `done` stops the same story from being filed again (also after the user removed its post while the stories file still held it).
4. With `community.storiesToJournal` off the mirror is cleared and nothing is filed.
5. The user writes, edits (own posts only) and removes (any post). The feed mixes all journals, newest first, 30 a page.

## If you change X, also touch Y
- Anything that would show a journal post to a character (a prompt, a comment, a mention): ask `canRead` with the character that speaks. The user always sees everything.
- The story's life (`STORY_MS`, the sweep in `plugins/stories/plugin.js`): the mirror's 24 h and 5 minute slack in `plugins/journal/plugin.js`, `test/journal.test.ts`.
- A post field: `cleanPost`, `src/screens/journal/api.ts`, the guide page `journal`.
- Reset parts: `RESET_PARTS` and `RESET_WITH_PROFILES` in the profiles plugin, `src/screens/settings/reset-api.ts`, `test/reset.test.ts`.

## Traps
- Clearing the characters also clears the user's own posts (the part goes with the profiles so no journal waits under a reused id).
- The tick removes a journal whose profile is gone, but only when the profiles folder lists at least one profile.
- Stories that vanished before the journal shipped cannot be recovered.
- The user's key is "you", so a profile id "you" is refused.

## Tests that guard it
`test/journal.test.ts`, `test/reset.test.ts`, `test/stories.test.ts`.

## Not verified
The `fol` of a persona key as the Life plugin really writes it (J4 reads it from hand-made files in tests); A real model for J3 and the shape of Life's list in real data; A real model for J2 (voice, truth to the diary, valid JSON); A real engine over a day boundary; a phone; the guide translations (stale until refreshed).
