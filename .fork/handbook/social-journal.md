# Social: the journal (posts, and stories that ran out)
Verified at: molfar.vertep-social 3dc882d (branch claude/journal-j1-444, not merged)

## What it does
Every profile and the user keep a journal of dated posts. In J1 a post comes from the user's own hand, or from a story that ran out after 24 hours. No model call. Characters writing posts, comments, subscriptions and friends-only reading are later phases (issue 444).

## Owners
- `plugins/journal/plugin.js`, `mirrorPass`: pure step that decides which stories are copied, dropped or filed.
- `plugins/journal/plugin.js`, `onTick`: reads the stories plugin's items file (read only), files posts, clears journals of deleted characters.
- `plugins/journal/plugin.js`, `cleanPost`, `readPosts`: every read goes through the cleaner; a damaged file reads as empty.
- `plugins/journal/plugin.js`, `handleRoute`: `/journal/feed|post|edit|remove|images|image`.
- `plugins/profiles/plugin.js`, `RESET_PARTS.journal`: Start over's "Journals" part; `community.storiesToJournal` is merged in the settings there.
- `src/screens/journal/`: the screen (`index.tsx`), calls (`api.ts`). `src/pictures/worker.ts`: draws pending pictures through `/journal/images`.
- `src/shell/app-shell.tsx`, `src/shell/nav.tsx`: the "journal" tab on desktop; on a phone `src/screens/settings/phone.tsx` has the row that opens it (More stays lit).

## Data
- `journal/<profileId|you>.json` {posts: [{id, at, title, text, image?, mood?, place?, tags, visible, from}]}. `from` is "you" or "story:<id>"; `visible` is stored for J4 and unused in J1; `place` is reserved for the City.
- `journal/mirror.json` {stories, done}: a copy of each live story, and the last 1000 story ids already filed or removed.

## When a model is called
Never. Pictures: a story filed with a pending picture is drawn by the Social page, as for stories.

## Flow
1. The stories plugin deletes a story at 24 h and a plugin writes only its own files, so every minute `onTick` copies live stories into the mirror.
2. A story that is a day old (in the stories file or only in the mirror), or gone from the stories file when the copy is 24 h less 5 minutes old, becomes a post `j-<story id>` of its author. A story gone while young was removed by the user: dropped.
3. `done` stops the same story from being filed again (also after the user removed its post while the stories file still held it).
4. With `community.storiesToJournal` off the mirror is cleared and nothing is filed.
5. The user writes, edits (own posts only) and removes (any post). The feed mixes all journals, newest first, 30 a page.

## If you change X, also touch Y
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
A real engine over a day boundary; a phone; the guide translations (stale until refreshed).
