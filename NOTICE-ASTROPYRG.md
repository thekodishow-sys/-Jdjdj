# AstroPryg GitHub Base

This Android test build packages the open-source game **Munch Jump** by Chip Jackson,
commit `58186ccbeca46cb3a9c7e260888c7437e22bd9cd`.

Original repository: https://github.com/chipjacks/munch-jump

The upstream project is MIT licensed (Copyright (c) 2024 Chip Jackson).
The game's own menu credits the artwork to Alison Ponce; that credit is intentionally preserved.

For this Android test only:
- the application label is changed to "АстроПрыг GitHub";
- p5.js and p5.sound.js are bundled locally for offline startup;
- device-tilt movement is disabled;
- touch-left / touch-right movement is added.

The gameplay, platform generation, character art, monsters, food art, music and main game loop
come from the upstream Munch Jump project rather than being reimplemented here.
