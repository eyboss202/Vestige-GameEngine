# VESTIGE — foundation build

A top-down pixel-art game skeleton in plain HTML, CSS and JavaScript (Canvas 2D, ES modules).
No build step, no framework, no dependencies.

This is **not a game**. It is the scaffolding a game gets built on: rendering, input, camera,
collision, maps, entities, dialogue, inventory, saves, audio, UI and menus, all wired together and
working, with placeholder content everywhere the story will eventually go.

**Nothing here defines the setting's plot.** The world reads as an abandoned research facility and
the grounds outside it; every line of text is explicitly marked as a placeholder.

---

## Running it

ES modules and `fetch()` do not work from `file://`. Serve the folder over HTTP:

```bash
cd vestige
python3 -m http.server 8080
# then open http://localhost:8080
```

Any static server works (`npx serve`, `php -S localhost:8080`, VS Code Live Server, nginx).

### Controls

| Action | Keys |
| --- | --- |
| Move | Arrows / WASD |
| Confirm | Z / Enter / Space |
| Cancel | X / Escape |
| Interact | E / Z / Enter |
| Sprint | Shift |
| Attack | J |
| Throw | K |
| Inventory | I / C |
| Pause | Escape / P |
| Debug overlay | F1 |
| Fullscreen | F11 |

All of these are rebindable in **Settings → Controls**. Audio only starts after the first key press
— browsers require a user gesture before a page may play sound.

---

## What is already working

- **Fixed-timestep loop** (60 Hz simulation, uncapped rendering) with delta time and tab-out protection.
- **Pixel-perfect renderer**: everything is drawn to a 384×216 buffer and upscaled with nearest-neighbour, so the pixel grid never breaks at any window size. Integer-scale and fill modes both supported.
- **Post-processing**: per-map darkness with radial light cut-outs, additive coloured lamp glow, flicker, vignette, and a scanline overlay.
- **Camera** that trails the player with frame-rate-independent smoothing, clamps to map bounds, shakes on impact and has a zoom hook.
- **Player controller**: acceleration/friction movement, four-direction animation, sprint with stamina, footstep audio and dust, damage with knockback and i-frames.
- **Tile maps** from JSON, with a collision grid, layered rendering, triggers, spawn points and per-map ambience. Three maps ship (lab, courtyard, a bunker reached from the courtyard), all connected by working, lockable doors.
- **Entities**: y-sorted drawing, feet-anchored collision, NPCs that wander, keep a schedule or talk, enemies with a patrol/chase/hurt state machine (plus a ranged variant), item pickups, examinable props, placeable traps, projectiles and thrown weapons. Seven enemy archetypes each have their own hand-drawn silhouette (`tools/gen_art.py`) — gaunt husks, a boil-studded mutant, a hunched bone-spiked brute, a spindly stalker, a bloated acid-sac spitter, a many-legged swarmling and a three-eyed boss sentinel — not one sprite recolored at runtime.
- **Dialogue**: data-driven trees with branching on world flags, player choices, portraits, speaker names, paging, a typewriter with inline `[shake]` `[wave]` `[c=#hex]` `[s=]` `[p=]` tags and a skip. The same machinery doubles as readable notes/logs/recordings and merchant shop openers.
- **Cutscenes**: a queued action runner (`wait`/`moveTo`/`camera`/`cameraFollow`/`dialogue`/`flag`/`emit`/`fade`/`sfx`/`music`/`anim`) that pauses play exactly like a conversation does. `scripts/cutscenes/intro.js` is a fully commented template, played once per save.
- **Survival**: hunger and thirst drain over time, punish neglect with HP loss and a movement penalty, and recover on their own once both are healthy; a generic injury list (bleeding, curable) sits alongside them. The HUD shows all three as Minecraft-style segmented icons (hearts/rations/droplets, original pixel art) that bounce and flash when a segment changes, not continuous bars.
- **Inventory**: stacking, categories (supplies/gear/materials/ammo/traps/records/keys/currency), weight (opt-in), use-effects defined per item, a grid UI with a detail pane, rarity-coloured names and icon borders.
- **Equipment**: weapon/armor/helmet/gloves/boots/accessory slots with passive stat bonuses, read through `GameState.derivedStat()`.
- **Combat**: melee, pistols, rifles, shotguns, throwables and four trap types, all built on one shared damage/targeting path (`core/Combat.js`) that traps, weapons and enemy attacks all share.
- **Trading**: per-merchant shops with their own stock and prices, buying and selling, built on a plain in-bag currency item.
- **Loot**: five rarity tiers and weighted drop tables rolled on enemy death.
- **Saves**: three slots in `localStorage`, versioned envelope with a migration hook, save/load from menu and pause.
- **Settings**: volumes, fullscreen, scaling mode, text speed, screen shake, FPS counter, language, and full key rebinding (including attack/throw) — all persisted immediately.
- **Localisation**: English and Portuguese, both for UI strings and dialogue content.
- **Menus**: animated title screen, slot picker, pause, settings, inventory, shop — all built from one reusable menu widget and a 9-slice panel.

---

## Layout

```
vestige/
├── index.html              canvas + first-gesture hint, nothing else
├── styles/main.css         page chrome only; all UI is drawn on the canvas
├── assets/
│   ├── sprites/            character sheets (16×24, 4 columns × 4 direction rows)
│   ├── tiles/              16×16 tileset atlas
│   ├── ui/                 9-slice panel, caret, item icons, portraits
│   ├── fonts/              7×12 bitmap font atlas (ASCII 32–126)
│   └── audio/              music and SFX (.wav)
├── maps/                   map JSON (Tiled-shaped: flat, row-major arrays)
├── tools/                  Python generators for the placeholder assets
├── docs/EXTENDING.md       recipes for adding content and systems
└── scripts/
    ├── main.js             entry point
    ├── config/             constants, settings, keybindings, locales, asset manifest
    ├── core/               loop, renderer, camera, input, scenes, assets, events, state
    ├── systems/            audio, save, dialogue, inventory, lighting, particles, toasts
    ├── world/              tile map + map loading
    ├── entities/           base entity, player, enemies, npc, items, props, traps, projectiles
    ├── ui/                 bitmap font, 9-slice, menu list, dialogue box, HUD, inventory, item icons
    ├── scenes/             boot, main menu, settings, save slots, game, pause, inventory, shop
    ├── cutscenes/          scripted cutscenes (see intro.js) — a template per file, played via systems/CutsceneSystem.js
    └── data/               dialogue trees, item/weapon/enemy/shop/loot definitions, survival tuning
```

---

## How it fits together

**One loop, many scenes.** `Game` owns the loop and hands each tick to `SceneManager`, which keeps a
*stack* of scenes. Pausing pushes `PauseScene` on top of `GameScene` and marks itself transparent, so
the frozen world keeps rendering underneath. Fades between scenes are built into the manager.

**Systems talk through events, not references.** `Events` (a small pub/sub bus) carries things like
`inventory:changed`, `enemy:died`, `dialogue:end`, `map:loaded`. A system can be replaced wholesale as
long as it emits the same events.

**All mutable playthrough state lives in one object.** `GameState` holds the player's stats, the
current map, the world flags, the quest table and the inventory. `GameState.serialize()` *is* the save
format, so persisting a new system means adding a field there and a line in `deserialize()`.

**Content is data, code is generic.** Maps, dialogue trees, item definitions and enemy archetypes are
plain objects in `/maps` and `/scripts/data`. `MapManager.ENTITY_FACTORY` is the one place that maps a
JSON `type` onto a class.

**Position convention:** an entity's `(x, y)` is its **feet** — bottom-centre of the sprite. Depth
sorting, shadows and tile collision all follow from that, and every subclass assumes it.

**Rendering order** inside a map: ground → decor → entities (y-sorted) → particles → overhead →
lighting → vignette → dialogue → HUD → debug.

---

## Placeholder assets

Every asset is generated by the scripts in `tools/` and named `*_placeholder.*`. They exist so the
project runs and looks coherent, not because they are good.

```bash
cd vestige
python3 tools/gen_art.py      # tileset, characters, portraits, UI, bitmap font  (needs Pillow)
python3 tools/gen_audio.py    # music and SFX  (stdlib only)
python3 tools/gen_maps.py     # maps/*.json from readable ASCII layouts
```

To replace one: drop a new file in with the same dimensions, and update the path in
`scripts/config/manifest.js` if the filename changes. Nothing else refers to asset paths.

Sprite sheets are 4 columns × 4 rows of 16×24: columns are the walk cycle (idle, step, idle, step),
rows are the facing order **down, left, right, up** (`DIR_ROW` in `config/Constants.js`).

---

## Known limits (deliberate)

These are left as hooks rather than half-implementations:

- **No pathfinding.** Enemies (including ranged ones) steer straight at their target and nudge
  sideways when blocked. Swap `Enemy.moveToward` for A* over the collision grid when maps get complex.
- **Death respawns at the map's spawn point.** Replace `GameScene.respawn()` with a proper game-over
  scene when the story needs one.
- **Weapon mods, reputation/factions and quests** have their seats reserved (`weapon.mods`,
  `GameState.reputation`, `GameState.quests`) but no implementation — see "Things worth building
  next" in `docs/EXTENDING.md`.
- **Controller input** has its seat reserved (`Input`'s action layer) but no gamepad polling yet.

See `docs/EXTENDING.md` for step-by-step recipes.
