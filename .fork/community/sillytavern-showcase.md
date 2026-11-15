# SillyTavern Discord, showcase channel: a series of five posts

English. Each post is a short main message plus one or two replies under it with the list of what's inside
(Discord's limit is 2,000 characters a message). Paste the text between the ``` fences.
One post every 2 to 3 days; each ends with a teaser (`-#` is Discord's small grey text).

The angle for this audience: ST compatibility, breadth of RP, local models, fast development, listening to
players. Not cheap models: that is the JanitorAI crowd's question, not ST's.

Before posting: read the channel's rules (how often, whether links or other Discord invites are allowed).
The posts link only GitHub; our Discord invite is left out on purpose.

Facts used (checked 2026-11-14): 107 engine releases since 0.1.0 on 2026-10-01; Roleplay at 4.121.0;
240 issues closed. The RPG addon is an idea with decisions (issue #123, `.fork/handoff/rpg-layer/IDEAS.md`),
nothing built: post 5 says so.

---

## Post 1: what it is

Picture: `.github/assets/screens/home.png` or `store.png`

Main message:
```
# 🧙 Molfar Vertep

Hi everyone! We'd like to show you **Molfar Vertep**: a home for roleplay that runs on your own machine, made for people who like their RP deep and their setup their own.

It's less one app and more a small platform. The Vertep is the base; on top of it live apps: **Roleplay** (the main one), **Social**, and more on the way. And inside all of it lives **Molfar**, an agent who can rebuild any of those apps when you ask him to.

If you come from ST, you'll feel at home. Your cards, chats, groups, personas, lorebooks, presets and regex come over in one zip, and ST presets work the way their authors made them.

It's free and open source (AGPL), and it moves fast: over a hundred releases since October, and much of what's inside started as someone saying "it would be nice if...".

In the next posts: Molfar, Roleplay, Social, and the RPG addon we're sketching right now.

https://github.com/MolfarWav/Molfar.Vertep
```

Reply:
```
**At a glance**
🏠 Runs locally on Windows, macOS, Linux, Android or Docker. Your data is plain files on your disk.
🔌 Any model: your own local server (anything OpenAI-compatible), the big providers, OpenRouter, NanoGPT, subscription sign-ins.
🖼️ Pictures from your own ComfyUI or A1111/Forge too.
🔁 Speaks ST: cards V2/V3 (PNG, JSON, charx), chats, world info, presets, regex, personas.
📱 On a phone: open it over Wi-Fi, or run the whole thing on Android. Sync between devices through a folder or Google Drive.
🧩 Apps and plugins run sandboxed: anything from someone else shows what it wants before you install it.
👥 Several accounts on one install, each with its own workspace.
🌍 14 interface languages.
👂 You get heard: bugs are fixed in a weekly batch, and ideas go straight onto the list.

-# Next: meet Molfar, the old sorcerer who rebuilds the place when you ask.
```

---

## Post 2: Molfar

Picture: `.github/assets/screens/molfar-rebuild.gif` (1.2 MB) or `molfar-feature.gif`

Main message:
```
# 🧙 Part 2: Molfar

Every app in the Vertep is a folder of plain files, and Molfar can read and change all of them. That's the whole idea: instead of hunting for a setting or waiting for someone to add a feature, you just tell him.

"Put a dice button in the chat header." "Make the chat read like a book page." "Show me who knows what about my character." He edits the code, the screen rebuilds a few seconds later, and you see the result right away.

By temper he's an old Carpathian sorcerer: a bit grumpy, careful with your things. A good part of the Roleplay app was built exactly this way: we asked him, looked, asked again.
```

Reply:
```
**Why it's safe to let him touch things**
↩️ Every run leaves a git checkpoint; one click brings the code back.
❓ A big or unclear request: he asks first, with options to pick.
🔒 Paths you mark as protected need your yes every time.
🔄 Your changes survive updates. A new version is merged with your edits; on a clash you choose: yours, theirs, or let Molfar merge.

**Making him yours**
📚 Skills: short instructions for one kind of task ("how I like my cards"). He can propose one after a job went well; nothing is saved without your yes.
🗂️ Projects, each with its own instructions, files, memory and default model.
🧠 Memory about you and your work, kept between chats, every note asked first.
🎭 Inside Roleplay, an "Ask Molfar" button opens him with your request already typed. He also does the chores: turning a pasted card from another site into a proper one, sorting a huge card into fields.

-# Next: Roleplay itself. There's a lot more in there than a chat window.
```

---

## Post 3: Roleplay

Picture: `.github/assets/screens/roleplay-tour.gif` (4.9 MB), or `chat.png` + `dashboard.png` + `prompt-board.png`

Main message:
```
# 🎭 Part 3: Roleplay

Roleplay is the main app, and the part that will feel most like home if you come from ST: cards, personas, groups, presets with a drag-and-drop prompt manager and every sampler, lorebooks, regex, macros, swipes, branches. The basics are all there.

What we kept building on top is everything around the chat: memory that knows who was in the room, a world that moves on its own, characters with a temper, groups that argue back, and a prompt you can see down to the last token. Each of these is a switch, so a cozy slice-of-life chat and a sprawling campaign each take only what they need.
```

Reply 1:
```
**Memory and the world**
📜 **Litopys**, the chronicler: a chapter for every scene, facts with who knows them, turning points kept nearly word for word. Old messages leave the prompt, the story stays, and you can read and fix all of it in the Library.
💞 **Dashboard**: after each reply it notes trust, mood, who learned what, where and when you are, and quests that close when the story settles them. Your own fantasy calendar if the world needs one.
🎲 **World DM**: a Dungeon Master with factions on clocks, an event deck and dice. Swipe a reply and the world rolls back with it.
🔗 **Stories across chats**: chats chained on a map; the next one inherits the earlier ones as backstory.
🔎 Lorebooks match by keyword or by meaning, with local embeddings if you like.
```

Reply 2:
```
**Characters, groups, the prompt**
🫀 **Soul**: each character's temper (how fast they warm up, what hurts them). **Profile**: a card split into fields you switch on and off. **How they changed**: what the story did to a character, kept apart from the card.
🗣️ **Groups** that interrupt, refuse your plan, pull the quiet one back in, and speak in their own voices.
⚙️ **Agents**: helpers you wire on a board. Ready ones catch repeated phrases, flag replies that contradict the card, keep the gold count honest.
🧾 **Prompt board**: every part of the request with its tokens; switch any of it off for one chat; "What fired" shows why something got in.
🖼️ Sprites with outfits, backgrounds, pictures drawn mid-scene, text to speech with free voices.
🛒 A card store inside: Chub, RisuRealm, CharaVault, Wyvern, Pygmalion, JannyAI.

-# Next: Social, for the evenings you're tired of "you walk into the tavern".
```

---

## Post 4: Social

Picture: take new (the messenger with a sticker, and a forum topic)

Main message:
```
# 💬 Part 4: Social

Sometimes you don't want another scene. You just want to see how your characters are doing.

**Social** is a second app: a small social network where your cast lives between stories. Pick characters from Roleplay and they move in as profiles. Then they start living a little on their own: texting you, talking to each other, posting on the forum, writing in their diaries. Drop in for two minutes or stay all evening; there's no scene to set up.
```

Reply:
```
**What's inside**
📱 **Messenger**: a chat with each character, phone style, and they can write first. Stickers, with an animated pack and a catalog of free ones.
🗨️ **Forum**: characters open topics, argue, gossip and run polls; a Moderator keeps order; you join in with an @.
📔 **Life**: a diary for each character, a week of their own, and an optional feed of outside news so they have something to talk about.
👯 Clubs, chatter between pairs, stories.
🎚️ Every one of these has its own switch and a daily cap, so you decide how lively it gets.
🪪 Your own persona page, a picture for each profile, a model per profile if you want.

And back in Roleplay there are **letters**: a character you haven't played with in a while may send you a short note in their own voice (off by default).

-# Next: what we're building now, an RPG addon.
```

---

## Post 5: the RPG addon (in design)

Picture: none yet; a rough sketch of the fight screen would help if one is drawn

Main message:
```
# ⚔️ Part 5: what's next, an RPG addon

Some stories want a slow burn. Others want a sword, a backpack and a goblin that hits back.

For the second kind we're designing an **RPG addon**: a separate, optional app next to Roleplay. It keeps the mechanics, Roleplay keeps the prose. Don't install it and nothing changes; install it and your story gets a character sheet and a fight screen.

It's early: this is the plan, not a release. Which makes now the best time to tell us what you'd want in it. A good part of the Vertep started exactly like that: the group chats that interrupt you came from a Reddit thread, and some of this addon came from players on our Discord.
```

Reply:
```
**What we're sketching**
📋 A character sheet: stats, HP, skills, inventory, gear, money. Characters from cards get their stats generated once, and you can correct them.
⚔️ Turn-based party fights: the party from the scene against whoever the scene produced. Pick where to strike and where to block, and both sides resolve at once. Play everyone, or just your hero while the rest act in character (the timid one may run).
🎲 Code rolls the dice, the model tells the story. The model proposes a goblin's stats, code checks them against the rules, so nobody meets a goblin with 9999 strength.
📖 One short result goes back to the chat, no round-by-round log, and the wounds show up on the Dashboard so the story knows you're hurt.
🎒 Later: a bigger inventory and maps. Found a sword in the prose? One tap to keep it.

What would you want in it? 🧙
Everything else: https://github.com/MolfarWav/Molfar.Vertep/releases/latest
```
