# Social: the city (places, homes, who is where)
Verified at: molfar.vertep-social a349f12 (branch claude/city-c1-445, stacked on the journal branch, not merged)

## What it does
A town the characters live in. By rules, with no model call, it gives every profile a flat and works out, once per 3-hour band, where each character is. The user can look, listen and walk in (issue 445, C1 and C2); own places, packs and other plugins reading the place are later phases.

## Owners
- `plugins/city/plugin.js`, `stockTown`: the neutral present-day town (districts, places with an 8 by 7 open grid, tags, seats).
- `plugins/city/plugin.js`, `readTown`: the places file as stored; a damaged file or a bad place falls back or is dropped.
- `plugins/city/plugin.js`, `assignHomes`, `readHomes`: one flat per profile, a new building when full, a leaver's flat freed.
- `plugins/city/plugin.js`, `placeAt`: where one profile is in a band (seeded draw, weights).
- `plugins/city/plugin.js`, `whereAll`: everyone in id order, so every reader gets the same answer.
- `plugins/city/plugin.js`, `cityView`, `handleRoute`: `GET /city`.
- `plugins/city/plugin.js`, `listenView`: `GET /city/listen`, the last 6 lines (3 days) of chatter pairs and clubs whose members are at the place, read only, never the user's.
- `plugins/clubs/plugin.js`, `roomRoute`, `presentAt`, `byAcquaintance`, `sweepRooms`, `bandOf`: `POST /clubs/room`, a club with `room: {place, until}`; the tick removes it at `until`.
- `src/screens/messenger/clubs.tsx`: the "Room" tag and "Leave the room" (`ClubHead`); `src/shell/nav.tsx` `openClub` carries the City to the Messenger.
- `plugins/city/plugin.js`, `onTick`: writes the stock town once, the flats, and the band's places once per band.
- `src/screens/city/index.tsx`, `strings.ts`: the screen; stock names and lines are translated by id there.
- `src/shell/app-shell.tsx`, `src/shell/nav.tsx`: the desktop tab; `src/screens/settings/phone.tsx` has the More row.

## Data
- `city/places.json` {districts, places}; `city/homes.json` {buildings, flats: {profileId: {b, n}}}; `city/now.json` {id: "day#band", at, where: {profileId: placeId | "home"}}.
- Read only from other plugins: profiles (`schedule`, `interests`, `life.on`, the reserved `workplace`), `life/people/<id>.json` (`fol`, `lvl`, the user's key `u:<persona>`), `you.json` (the active persona).

## When a model is called
Not by the city itself (a test uses a model that throws on any use). A room is a club: one model call a message, the club's own caps.

## Flow
1. The tick writes the stock town once, assigns flats (empty profile list: nothing assigned or freed), and when the band id differs from `now.json` writes everyone's place.
2. `placeAt`: life off or status off = home; na or dnd = the profile's `workplace` in work hours (Monday to Friday, bands 3 to 5) if open with room, else home; online or away = a seeded draw over home (weight 1.5) and the open places with a free seat (1, plus 2 per matching interest tag, plus 1.5 per close person already there, at most 3).
3. The view uses the stored band if it is the current one, else works the places out on the spot without writing.
4. A door is lit (home, awake), dark (home, status off) or out; where an absent character is shows only when the active persona is at least an acquaintance to them.

## If you change X, also touch Y
- Band or schedule shape: `bandNow`, `statusAt` here are copies of the stories plugin's; change every copy.
- The stock town: `src/screens/city/strings.ts` (names by id) and `test/city.test.ts`, `test/rooms.test.ts`.
- A place field: `cleanPlace`, `src/screens/city/api.ts`, the guide page `city`.

## Traps
- A room is a new club, so its daily caps start again every time the user walks in; it is outside `MAX_CLUBS`; one at a time; the room needs `city/now.json` to be of the current band (a stale file means "try again in a minute").
- `bandOf` in the clubs plugin and `bandId` here are copies; change both.
- Weights and the work hours are guesses.
- `workplace` is read but nothing writes it yet, so na and dnd mean home.
- Clearing all profiles leaves `city/` until a new profile appears (the tick does nothing on an empty list).
- The place plate is cosmetic: tiles show everyone in a place anyway.

## Tests that guard it
`test/city.test.ts`, `test/rooms.test.ts`.

## Not verified
A real engine across a band change; the room's header with "Leave the room" in a browser (the preview has no room); a real model in a room; a phone; how the weights feel with real profiles; the guide translations.
