# Extending VESTIGE

Recipes for the things you will actually want to do. Each one lists every file you have to touch —
if a recipe needs more than two or three, that is a design smell worth reporting.

---

## Add a map

1. Add an ASCII layout to `tools/gen_maps.py` (the `LEGEND` dict maps characters to tile + collision),
   or export JSON from Tiled in the same shape, and run `python3 tools/gen_maps.py`.
2. Register it in `scripts/config/manifest.js` under `maps`.
3. Connect it: add a `portal` trigger in an existing map pointing at the new `id`, and give the new
   map a matching entry in its `spawns` object.

Map JSON:

```jsonc
{
  "id": "lab_atrium",
  "displayName": "SUBLEVEL 2 - ATRIUM",   // shown as the area title
  "width": 40, "height": 32, "tileSize": 16,
  "ambient": { "music": "ambient_lab", "darkness": 0.78, "tint": "#08140f", "vignette": 0.55 },
  "layers": {
    "ground": [ /* width*height tile indices, row-major */ ],
    "decor":  [ /* -1 = nothing here */ ],
    "overhead": null                       // optional, drawn above entities
  },
  "collision": [ /* 0 or 1 per tile */ ],
  "lights":   [ { "x": 128, "y": 64, "radius": 62, "color": "#7fe0a8", "intensity": 0.9, "flicker": 0.1 } ],
  "entities": [ /* see below */ ],
  "triggers": [ { "type": "portal", "x": 288, "y": 480, "w": 16, "h": 16,
                  "target": "outside_courtyard", "spawn": "from_lab", "sfx": "door" } ],
  "spawns":   { "default": { "x": 312, "y": 456, "facing": "up" } }
}
```

Non-portal triggers are emitted on the event bus as `trigger:<type>` with the trigger and the scene,
so a cutscene or ambush zone is a listener, not an engine change.

---

## Add an entity type

1. Write the class in `scripts/entities/…`, extending `Entity`.
2. Register it in `ENTITY_FACTORY` in `scripts/world/MapManager.js`.
3. Use it from any map's `entities` array.

```js
// entities/Chest.js
import { Entity } from './Entity.js';

export class Chest extends Entity {
  constructor({ id, x, y, contents }) {
    super({ id, x, y });
    this.contents = contents;
    this.solid = true;
    this.interactable = true;
  }
  interact(scene) { /* ... */ }
}
```

Useful members: `hitbox {w,h,ox,oy}` (anchored at the feet), `solid`, `interactable`,
`interactRadius`, `depth` (override to force draw order), `update(dt, scene)`, `render(renderer, camera)`.

---

## Add an item

One entry in `scripts/entities/items/ItemDatabase.js`:

```js
rebreather: {
  id: 'rebreather', icon: 4, category: 'equipment', stackSize: 1, consumable: false,
  name: { en: 'Rebreather', pt: 'Respirador' },
  description: { en: '...', pt: '...' },
  onPickup: ({ state }) => state.setFlag('has_rebreather', true),
  onUse: ({ state, scene }) => { /* return false to refuse the use */ },
},
```

`icon` indexes `assets/ui/items_placeholder.png` (16×16 cells). Categories drive the inventory filter;
adding a new one means adding it to `CATEGORIES` in `ui/InventoryUI.js` and an
`inventory.cat.<name>` string to each locale.

Drop it into a map as `{ "type": "item", "id": "pickup_x", "itemId": "rebreather", "qty": 1, "x": …, "y": … }`.
Pickups remember they were taken via the world flag `picked:<id>`, so they stay taken across saves.

---

## Add an enemy

Add an archetype to `scripts/data/enemies.js` (hp, speeds, damage, detection radii, aura) and
reference it by key from a map: `{ "type": "enemy", "archetype": "stalker", "patrol": [[x,y],[x,y]] }`.

For different *behaviour*, subclass `Enemy` and add states to its switch — the base states
(`idle`, `patrol`, `chase`, `return`, `hurt`) are meant to be a floor, not a ceiling. A boss with
phases is a subclass that adds `phase1`/`phase2` states and overrides `takeDamage`. One behaviour
is already built in without subclassing: `behavior: 'ranged'` holds at `preferredRange` and fires a
`Projectile` instead of closing to melee (`Enemy.chaseRanged`).

Variety without new art: every archetype reuses the one placeholder sprite and is told apart by
data — `tint` (hex, recolors it), `scale` (resizes it), `armor` and `resistances: { melee, ranged }`
(both reduce incoming damage in `takeDamage`), `unique: true` (just a content marker), and
`lootTable` (a key into `data/lootTables.js`, rolled by `Enemy.die()`). Drop in a real sprite later
by adding a `sprite` key — nothing else about an archetype changes.

---

## Write dialogue

Add a tree to `scripts/data/dialogue.js` and point an NPC or prop at it by key
(`"dialogue": "npc_engineer"`).

```js
npc_engineer: {
  branches: [{ ifFlag: 'engineer_helped', equals: true, next: 'after' }],  // tree-level entry choice
  start: 'intro',
  nodes: {
    intro: {
      speaker: { en: 'ENGINEER', pt: 'ENGENHEIRA' },
      portrait: 'survivor',            // key in PORTRAIT_INDEX (ui/DialogueBox.js)
      text: { en: 'Line one.', pt: 'Linha um.' },
      set: { met_engineer: true },     // flags written on entry
      next: 'ask',
    },
    ask: {
      text: { en: 'Well?', pt: 'Entao?' },
      choices: [
        { text: { en: 'Help her' }, next: 'thanks', set: { engineer_helped: true } },
        { text: { en: 'Refuse' }, next: null },              // null ends the conversation
        { text: { en: 'Show the keycard' }, next: 'card', requires: 'has_blue_keycard' },
      ],
    },
  },
},
```

Inline text tags: `[c=#7fe0a8]…[/c]`, `[shake]…[/shake]`, `[wave]…[/wave]`, `[s=0.5]` (type speed
from here on), `[p=0.4]` (pause in seconds). `\n` forces a line break; the box wraps and pages by itself.

Nodes can also carry `emit: 'event:name'` to fire a bus event — that is the seam for triggering
cutscenes, quest steps or shop screens from a conversation.

---

## Add a language

1. Add a table to `LOCALES` in `scripts/config/locales.js` and an entry to `LANGUAGES`.
2. Add the matching key to every `{ en, pt }` object in `data/dialogue.js` and `ItemDatabase.js`.

`t('key')` and `localised({ en, pt })` handle lookup and fall back to English for anything missing.

⚠ The placeholder font atlas only covers ASCII 32–126. Accented characters are folded to their base
letter (`ã` → `a`). For real Portuguese, regenerate `assets/fonts/` with a wider character range and
widen the atlas mapping in `ui/BitmapFont.js`.

---

## Save something new

`GameState` is the save format. To persist a new system:

```js
// core/GameState.js
reset()        { …; this.crafting = { known: [] }; }
serialize()    { return { …, crafting: structuredClone(this.crafting) }; }
deserialize(d) { …; this.crafting = structuredClone(d.crafting || { known: [] }); }
```

Then bump `SAVE_VERSION` in `config/Constants.js` and add a case to `SaveSystem.migrate()` so existing
saves gain the new field instead of breaking. Never delete an old migration case.

For quick state that is just "did this happen", use flags instead — `GameState.setFlag('door_open')` —
they are already saved and already usable as dialogue branch conditions.

---

## Add a survival effect

Hunger/thirst tick down in `systems/SurvivalSystem.js`, tuned entirely from `data/survival.js` — no
engine change to adjust pace. To add a consumable that restores one, give it an `onUse` that touches
`state.player.hunger`/`.thirst` directly (see `stale_bread`/`purified_water` in `ItemDatabase.js`).

Injuries are a generic `{ type, severity, remaining }` list — `Survival.addInjury('bleeding', 1, 20)`
adds one, `Survival.clearInjury('bleeding')` cures it (see `bandage`'s `onUse`). A new injury type is
a case in `SurvivalSystem.update()`'s per-injury loop; `bleeding` (drains HP) is the one example.

---

## Add equipment

Give an item a `slot` (one of `EQUIP_SLOTS` in `systems/InventorySystem.js`: `weapon`, `armor`,
`helmet`, `gloves`, `boots`, `accessory`) and it becomes equippable — selecting it in the inventory
screen calls `GameState.equipment.equip()`/`.unequip()` instead of `Inventory.use()`. Add a `bonus`
object for passive stats:

```js
plated_vest: { slot: 'armor', bonus: { armor: 3, maxHp: 5 }, /* … */ }
```

Anything that needs the *current* value of a bonusable stat reads `GameState.derivedStat('maxHp')`
etc. instead of `GameState.player.maxHp` directly — see `HUD.js` and `Player.js` for the pattern.
`armor` mitigates incoming damage in `Player.takeDamage()`.

---

## Add loot rarity

Give an item a `rarity` key from `data/rarity.js` (`common`…`legendary`, defaults to `common`) — the
inventory screen and pickup toasts color its name and icon border automatically
(`ui/ItemIcon.js`/`data/rarity.js` `getRarity()`). To make something drop it, add a weighted entry to
a table in `data/lootTables.js` and point an enemy archetype's `lootTable` at it; `Enemy.die()` rolls
it and spawns the pickups.

---

## Add a shop

Add an entry to `data/shops.js` (`sells`: `{ itemId, price, stock }`, `buysCategories`: which
categories the shop buys back). Give the merchant NPC a `shop: 'shopId'` and a dialogue tree whose
final choice has `emit: 'shop:open'` (see `npc_trader` in `data/dialogue.js`) — `GameScene` already
listens for that event and pushes `scenes/ShopScene.js`. Currency is just an item (`scrip`), so
buying/selling is plain `Inventory.add()`/`remove()`; nothing bespoke to wire up.

---

## Add a weapon

Add an archetype to `data/weapons.js` (`category`: `melee` | `pistol` | `rifle` | `shotgun` |
`throwable`, plus damage/cooldown/range or a `projectile`/throw config). Give an item `slot: 'weapon'`
and `weaponId` pointing at it (ranged ones also need an `ammoType` item id). `Player.attack()`
dispatches on `weapon.category` — melee swings a hitbox via `core/Combat.js` `hitEntitiesInBox`,
ranged spawns `entities/Projectile.js`, throwables go through the `throw` action and
`entities/Throwable.js`. `mods: []` on every weapon is a reserved, currently-unused seam for future
upgrades — nothing reads it yet.

---

## Add a trap

Add a `{ type: 'trap', trapType: 'spike' | 'electric' | 'explosive' | 'alarm', faction, … }` entry to
a map's entities (environmental) or give an item an `onUse` that spawns one at the player (see
`placeTrap()` in `ItemDatabase.js` — player-placed kits use this). `faction` decides who it hurts,
exactly like weapons (`core/Combat.js`): a player-placed trap (`faction: 'player'`) only hurts
enemies; a map-authored one (`faction: 'enemy'`) only hurts the player. `alarm` traps deal no damage
and instead alert nearby enemies (`Trap.alertNearby`) — a real, if simple, one-shot reaction that a
richer alert/investigate state can build on later.

---

## Add a cutscene

`systems/CutsceneSystem.js` runs a queue of steps — `wait`, `moveTo`, `camera`, `cameraFollow`,
`dialogue`, `flag`, `emit` — pausing normal play the same way a conversation does. Fire one from any
event listener:

```js
Cutscene.play([
  { type: 'camera', x: 400, y: 300 },
  { type: 'wait', seconds: 1 },
  { type: 'dialogue', id: 'something_happens' },
  { type: 'cameraFollow', entityId: 'player' },
  { type: 'flag', key: 'seen_it', value: true },
]);
```

See the `reveal` trigger type and `trigger:reveal` listener in `GameScene.js` (used by
`maps/bunker.json`) for a worked example, including the "only once" flag-guard pattern.

---

## Add an NPC schedule

Give an NPC a `schedule: [{ startHour, x, y }, …]` (0–24, any order — sorted on load). Instead of
wandering, it walks to whichever waypoint's `startHour` the in-game clock has most recently passed;
the clock is just `GameState.playtime` modulo `DAY_LENGTH` (`config/Constants.js`). Omit `schedule`
and an NPC behaves exactly as before — it's opt-in per NPC.

---

## Add a screen

Extend `Scene`, then `game.scenes.push(new MyScene(game))` for an overlay or
`game.scenes.change(new MyScene(game))` to replace the stack (with a fade).

```js
export class ShopScene extends Scene {
  constructor(game) { super(game); this.transparent = true; }   // world keeps drawing underneath
  enter(params) {}
  update(dt) {}
  render(renderer) {}
}
```

Reuse `MenuList` for anything with options — it handles navigation, key-repeat, disabled entries, a
right-hand value column, `onLeft`/`onRight` for sliders, and the caret.

---

## Add audio

Drop the file in `assets/audio/`, add a key under `sounds` (SFX) or `music` in
`config/manifest.js`, then `Audio.playSfx('key', { volume, rate, variation })` or
`Audio.playMusic('key', { fade })`. Per-map ambience is just `ambient.music` in the map JSON.

`.wav` keeps the placeholders dependency-free; `.ogg`/`.mp3` work identically and are far smaller —
switch once you have real music.

---

## Things worth building next

Roughly in order of how much they unlock:

1. **Quest system** — `GameState.quests` is reserved; drive it from `dialogue emit` events and flags.
   `systems/CutsceneSystem.js` and the trading/combat/trap systems are all real seams for quest steps
   to hook into now (give something, kill something, reach somewhere, watch a scene).
2. **Weapon mods** — every weapon in `data/weapons.js` already carries an empty, unused `mods: []`;
   design what a mod changes (damage/cooldown/spread) and apply it when reading the weapon in
   `Player.attack()`.
3. **Reputation/factions** — `GameState.reputation` and `data/shops.js`'s `reputationDiscount()` are
   reserved and wired through `priceFor()`, but always neutral today.
4. **Tiled integration** — replace `tools/gen_maps.py` with a Tiled export; the JSON shape already matches.
5. **Gamepad** — add a poll in `Input.endFrame()` that folds button state into the same action sets.
   Nothing outside `Input` reads keys, so no other file changes.
6. **Save slots UI polish** — `Save.list()` already returns per-slot previews (map, playtime, HP).
7. **Pathfinding** — `Enemy.moveToward` still steers straight at its target; swap in A* over the
   collision grid once maps get more maze-like (this now matters more, with ranged/tank enemies).
