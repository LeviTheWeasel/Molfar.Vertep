# Task for the built-in agent (Molfar): after Roleplay 4.128.0 (#415, #416)

Paste this into the agent page once Roleplay has been updated.

---

Roleplay was updated: lorebook entries can now be secret, and Litopys facts can say who only suspects them.

1. Open `apps/roleplay/.skills/edit-large-card/SKILL.md` and `apps/roleplay/.skills/lorebook-craft/SKILL.md`.
   Each should now mention `secret: { knownBy, cover, reveal }` on a lorebook entry. If the update left a conflict
   in either file, keep the new version of those lines and tell me which file it was.
2. If you keep your own copy of either skill outside `apps/roleplay/` (in `skills/`), add the same lines there:
   - edit-large-card, under "Paths": a lorebook entry may be secret: `"secret": { "knownBy": [names], "cover": "what the
     others see", "reveal": [words] }`. A character who does not know it gets `cover` instead of `content` (nothing when
     `cover` is empty); a narrator gets the truth with a marker. Never write `lore-known/` files by hand.
   - lorebook-craft, under "Craft rules": a hidden truth a keyword would hand to everyone (a disguised person, an
     unidentified artifact) gets `secret`; `content` stays the truth, `cover` is what the others live with; `reveal`
     holds the true name only, not the common key.
3. Do not change any lorebook yet. Tell me what you found.
