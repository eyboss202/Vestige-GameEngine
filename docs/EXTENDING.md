# Extending Vestige Engine

Recipes for the things you will actually want to do. Each one lists every file you have to touch —
if a recipe needs more than two or three, that is a design smell worth reporting.

Paths below are relative to the repository root. **Content** recipes only touch `game/` (the sample
game, or your own game folder); **engine** recipes touch `engine/` and benefit every game built on it.
The two never import each other directly in that direction: `engine/` reads content only through
`engine/core/Content.js`, which `game/main.js` fills with `defineGame()`.

---

## Start a new game on the engine

1. Copy `game/` to a new folder (say `my-game/`) and point `index.html`'s `<script type="module">` at
   `my-game/main.js`.
2. In `my-game/main.js`, change `config` — at least `id` (the save/settings namespace), `title` and
   `startMap` — and replace the data tables with your own.
3. Replace `my-game/assets/` and `my-game/maps/`, keeping the keys in `my-game/manifest.js` in sync.

Every key `defineGame()` accepts, with its default, is documented in `engine/core/Content.js`.
Anything you leave out falls back to an engine default, so a game can start very small.

---

## Add a map

1. Add an ASCII layout to `tools/gen_maps.py` (the `LEGEND` dict maps characters to tile + collision),
   or export JSON from Tiled in the same shape, and run `python3 tools/gen_maps.py`.
2. Register it in `game/manifest.js` under `maps`.
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

1. Write the class in your game folder, extending `Entity`.
2. Register it from `game/main.js`: `Maps.registerEntityType('chest', (def) => new Chest(def))`.
   (Built-in types — `npc`, `enemy`, `item`, `prop`, `trap`, `container`, `phone` — live in
   `ENTITY_FACTORY` in `engine/world/MapManager.js`.)
3. Use it from any map's `entities` array.

```js
// game/entities/Chest.js
import { Entity } from '../../engine/index.js';

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
`promptKey` (a locale key, e.g. `'hud.take'`/`'hud.open'`/`'hud.talk'`) sets what the HUD's interact
prompt says instead of the generic `'hud.interact'` ("Examine") — see `ItemPickup`/`Container`/`NPC`.

---

## Add an item

One entry in `game/data/items.js`:

```js
rebreather: {
  id: 'rebreather', icon: 4, category: 'equipment', stackSize: 1, consumable: false,
  name: { en: 'Rebreather', pt: 'Respirador' },
  description: { en: '...', pt: '...' },
  onPickup: ({ state }) => state.setFlag('has_rebreather', true),
  onUse: ({ state, scene, itemId }) => { /* return false to refuse the use */ },
},
```

`icon` indexes `game/assets/ui/items_placeholder.png` (16×16 cells). Categories drive the inventory filter;
adding a new one means adding it to `CATEGORIES` in `engine/ui/InventoryUI.js` and an
`inventory.cat.<name>` string to each locale. `onUse` receives its own `itemId` too, for effects that
need to know which stack they came from (see `readable()` below).

Drop it into a map as `{ "type": "item", "id": "pickup_x", "itemId": "rebreather", "qty": 1, "x": …, "y": … }`.
Pickups remember they were taken via the world flag `picked:<id>`, so they stay taken across saves.

Give a weapon/tool item a `durability: { max: 80 }` and it wears down with use (`GameState.itemDurability`,
keyed by item id — see "Add a weapon" below) — `Player.attack()`/`reload()` refuse a broken one with a
`notify.broken` toast, and `engine/ui/InventoryUI.js` shows the remaining condition in the detail pane and a
small `X` over the grid icon once it hits zero. Leave `durability` off and the item never wears out.

Any item in the bag can be dropped back into the world with the `drop` action (bound to `G`) while it's
selected in the inventory screen — `engine/ui/InventoryUI.js`'s `drop()` spawns an `ItemPickup` at the player's
feet and records it in `GameState.worldItems[mapId]`, so it's still there after a map reload or a save/load,
and vanishes from that list the moment it's picked back up.

---

## Add a readable (letter/note/diary/book/document/photograph)

Give an item a `dialogueId` and an `onUse: readable('some_tree_id')` — exactly like the recipe for
"Write dialogue" below, except `readable()` (in `game/data/items.js`) starts the tree with `{ mode: 'read' }`,
which tells `engine/ui/DialogueBox.js` to render a centred, book-styled full page (title bar = the item's own
name, a page counter, no portrait/speaker/choices — a readable never branches) instead of the bottom
speech box. Multi-page text, the typewriter and the skip-to-reveal are the same machinery a conversation
already uses; cancel closes the book early. `state.collectedLogs[dialogueId]` marks it read either way.

```js
diary_page_1: {
  id: 'diary_page_1', icon: 9, category: 'quest', stackSize: 1, consumable: false,
  name: { en: 'Diary — page 1', pt: 'Diario — pagina 1' },
  description: { en: 'Water-damaged.', pt: 'Danificado pela agua.' },
  dialogueId: 'diary_page_1',
  onUse: readable('diary_page_1'),
},
```

`icon: 9` is the folded-letter shape in the items sheet (`8` is a key, for lock items — see below).

---

## Add a container (drawer, cabinet, locker, wardrobe, cupboard, chest, box, shelf, nightstand)

One map entity — no new class, `engine/entities/Container.js` is entirely data-driven by `containerType`:

```json
{ "type": "container", "id": "office_cabinet", "containerType": "cabinet",
  "x": 120, "y": 88,
  "contents": [ { "itemId": "bandage", "qty": 2 }, { "itemId": "scrap_metal", "qty": 3 } ] }
```

Interacting opens `engine/scenes/ContainerScene.js` + `engine/ui/ContainerUI.js`: up/down picks a stack, confirm takes
it whole into the player's existing inventory (or leaves it — cancel just walks away), a trailing "take
all" row sweeps everything. Nothing here is a second item/inventory system — it's the same
`GameState.inventory.add()`/`remove()` every pickup already uses. Whatever's left is snapshotted into
`GameState.containers[id]` the moment anything is taken, so a partial loot survives a save. `containerType`
only picks the row in `game/assets/sprites/containers_placeholder.png` (`config.containerRows` in
`game/main.js`) — add a new type there and a matching row in `tools/gen_art.py`'s `build_containers()`.

---

## Lock a door or a container

`engine/core/Locks.js` is one small shared shape both a portal trigger and a container's `lock` field use:

```jsonc
"lock": { "requiresKey": "storage_key", "consumeKey": false }   // Container
// or, on a portal trigger:
{ "type": "portal", "id": "vault_gate", "requiresKey": "storage_key", "target": "vault", ... }
```

`requiresKey` is any ordinary inventory item id (give it `category: 'key'` in game/data/items.js — `icon: 8` is
the dedicated key shape). `requiresFlag` (portals only, pre-existing) gates on a world flag a story event
sets instead — the two can combine. A keyed lock only needs `id` (the trigger's own, or the container's,
which already has one) so `isLocked()`/`tryUnlock()` can remember it's been opened
(`unlocked:<id>`) without re-checking the bag — or re-consuming the key — every time. Locked-out feedback
(`notify.lockedNeeds` / `container.locked`) fills in the key's own localised name automatically.

---

## Add an enemy

Add an archetype to `game/data/enemies.js` (hp, speeds, damage, detection radii, aura) and
reference it by key from a map: `{ "type": "enemy", "archetype": "stalker", "patrol": [[x,y],[x,y]] }`.

For different *behaviour*, subclass `Enemy` and add states to its switch — the base states
(`idle`, `patrol`, `chase`, `return`, `hurt`) are meant to be a floor, not a ceiling. A boss with
phases is a subclass that adds `phase1`/`phase2` states and overrides `takeDamage`. One behaviour
is already built in without subclassing: `behavior: 'ranged'` holds at `preferredRange` and fires a
`Projectile` instead of closing to melee (`Enemy.chaseRanged`).

Every shipped archetype has its own hand-drawn sprite (`tools/gen_art.py` `draw_husk`/`draw_mutant`/
`draw_brute`/`draw_stalker`/`draw_spitter`/`draw_swarmling`/`draw_sentinel`) — a genuinely different
silhouette and palette per archetype, not one sheet recolored at runtime. A brand-new archetype can
still launch without new art the same way the originals did: point `sprite` at an existing key and
use `tint` (hex, recolors it) and `scale` (resizes it) to tell it apart, then swap in real art later
by adding a new `draw_*` function and `sprite` key — nothing else about the archetype changes.
`armor` and `resistances: { melee, ranged }` both reduce incoming damage in `takeDamage`,
`unique: true` is just a content marker, and `lootTable` is a key into `game/data/lootTables.js`, rolled
by `Enemy.die()`.

Every archetype also gets its own idle/alert/attack/death voice, played positionally (panned and
attenuated by distance to the player — `AudioSystem.playPositional`) rather than a shared combat sfx.
`Enemy.voice` defaults to the archetype id, which is also the sound-key prefix `game/manifest.js`
expects (`${id}_idle`/`_alert`/`_attack`/`_death`); add a row to `tools/gen_audio.py`'s `MONSTER_VOICES`
(and re-run it) and a matching id to `game/manifest.js`'s `MONSTER_VOICE_IDS`, and a brand-new archetype has
working, distinct sounds the same way it gets working art — point `sprite`/`voice` at an existing key
first, swap in real assets later.

---

## Write dialogue

Add a tree to `game/data/dialogue.js` and point an NPC or prop at it by key
(`"dialogue": "npc_engineer"`).

```js
npc_engineer: {
  branches: [{ ifFlag: 'engineer_helped', equals: true, next: 'after' }],  // tree-level entry choice
  start: 'intro',
  nodes: {
    intro: {
      speaker: { en: 'ENGINEER', pt: 'ENGENHEIRA' },
      portrait: 'survivor',            // key in config.portraits (game/main.js)
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

1. Engine UI strings: add a table to `LOCALES` in `engine/config/locales.js` and an entry to
   `LANGUAGES` — or, without touching the engine, pass them from your game:
   `defineGame({ locales: { fr: { 'menu.newGame': 'Nouvelle partie', … } }, languages: [...] })`.
2. Add the matching key to every `{ en, pt }` object in `game/data/dialogue.js` and `game/data/items.js`.

`t('key')` checks the game's strings first, then the engine's, then falls back to English;
`localised({ en, pt })` does the same for content objects.

⚠ The placeholder font atlas only covers ASCII 32–126. Accented characters are folded to their base
letter (`ã` → `a`). For real Portuguese, regenerate `game/assets/fonts/` with a wider character range and
widen the atlas mapping in `engine/ui/BitmapFont.js`.

---

## Save something new

`GameState` is the save format. To persist a new system:

```js
// engine/core/GameState.js
reset()        { …; this.crafting = { known: [] }; }
serialize()    { return { …, crafting: structuredClone(this.crafting) }; }
deserialize(d) { …; this.crafting = structuredClone(d.crafting || { known: [] }); }
```

Then bump `SAVE_VERSION` in `engine/config/Constants.js` and add a case to `SaveSystem.migrate()` so existing
saves gain the new field instead of breaking. Never delete an old migration case.

For quick state that is just "did this happen", use flags instead — `GameState.setFlag('door_open')` —
they are already saved and already usable as dialogue branch conditions.

---

## Add a survival effect

Hunger/thirst tick down in `engine/systems/SurvivalSystem.js`, tuned entirely from `game/data/survival.js` — no
engine change to adjust pace. To add a consumable that restores one, give it an `onUse` that touches
`state.player.hunger`/`.thirst` directly (see `stale_bread`/`purified_water` in `game/data/items.js`).

Injuries are a generic `{ type, severity, remaining }` list — `Survival.addInjury('bleeding', 1, 20)`
adds one, `Survival.clearInjury('bleeding')` cures it (see `bandage`'s `onUse`). A new injury type is
a case in `SurvivalSystem.update()`'s per-injury loop; `bleeding` (drains HP) is the one example.

---

## Add equipment

Give an item a `slot` (one of `EQUIP_SLOTS` in `engine/systems/InventorySystem.js`: `weapon`, `armor`,
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

Give an item a `rarity` key from `game/data/rarity.js` (`common`…`legendary`, defaults to `common`) — the
inventory screen and pickup toasts color its name and icon border automatically
(`engine/ui/ItemIcon.js`/`game/data/rarity.js` `getRarity()`). To make something drop it, add a weighted entry to
a table in `game/data/lootTables.js` and point an enemy archetype's `lootTable` at it; `Enemy.die()` rolls
it and spawns the pickups.

---

## Add a shop

Add an entry to `game/data/shops.js` (`sells`: `{ itemId, price, stock }`, `buysCategories`: which
categories the shop buys back). Give the merchant NPC a `shop: 'shopId'` and a dialogue tree whose
final choice has `emit: 'shop:open'` (see `npc_trader` in `game/data/dialogue.js`) — `GameScene` already
listens for that event and pushes `engine/scenes/ShopScene.js`. Currency is just an item (`config.currency`
in `game/main.js` — `scrip` in the sample game), so
buying/selling is plain `Inventory.add()`/`remove()`; nothing bespoke to wire up.

---

## Add a weapon

Add an archetype to `game/data/weapons.js` (`category`: `melee` | `pistol` | `rifle` | `shotgun` |
`throwable`, plus damage/cooldown/range or a `projectile`/throw config). Give an item `slot: 'weapon'`
and `weaponId` pointing at it (ranged ones also need an `ammoType` item id). `Player.attack()`
dispatches on `weapon.category` — melee swings a hitbox via `engine/core/Combat.js` `hitEntitiesInBox`,
ranged spawns `engine/entities/Projectile.js`, throwables go through the `throw` action and
`engine/entities/Throwable.js`. `mods: []` on every weapon is a reserved, currently-unused seam for future
upgrades — nothing reads it yet.

A ranged weapon also wants `magazineSize`/`reloadTime`: `Player.attack()` fires from the magazine
(`GameState.weaponAmmo`, keyed by the item id), and only the `reload` action (bound to `R`,
`Player.reload()`) pulls from the inventory's `ammoType` reserve to refill it — there is no infinite
magazine and no automatic reloading. Give the *item*, not the weapon archetype, a `durability: { max }`
(see "Add an item") if it should wear out — every swing/shot chips it, and a broken one refuses to fire
or reload until a future repair system exists.

A weapon category shows up in the player's hand when `config.player.weaponSprites` (`game/main.js`)
maps it to a sheet with that weapon drawn in — the shipped categories already have one, so a
same-category weapon (a second pistol, say) needs nothing extra; a genuinely new category needs a new
sheet (see `tools/gen_art.py`'s `build_player()`) and an entry there. Without one, the bare sheet is used.

---

## Add a trap

Add a `{ type: 'trap', trapType: 'spike' | 'electric' | 'explosive' | 'alarm', faction, … }` entry to
a map's entities (environmental) or give an item an `onUse` that spawns one at the player (see
`placeTrap()` in `game/data/items.js` — player-placed kits use this). `faction` decides who it hurts,
exactly like weapons (`engine/core/Combat.js`): a player-placed trap (`faction: 'player'`) only hurts
enemies; a map-authored one (`faction: 'enemy'`) only hurts the player. `alarm` traps deal no damage
and instead alert nearby enemies (`Trap.alertNearby`) — a real, if simple, one-shot reaction that a
richer alert/investigate state can build on later.

---

## Add a cutscene

`engine/systems/CutsceneSystem.js` runs a queue of steps — `wait`, `moveTo`, `camera`, `cameraFollow`,
`dialogue`, `flag`, `emit`, `fade`, `sfx`, `music`, `anim` — pausing normal play the same way a
conversation does. Fire one from any event listener:

```js
Cutscene.play([
  { type: 'fade', to: 1, seconds: 0 },        // cut to black instantly
  { type: 'camera', x: 400, y: 300 },
  { type: 'fade', to: 0, seconds: 1 },        // ...then lift it
  { type: 'wait', seconds: 1 },
  { type: 'sfx', key: 'door', volume: 0.6 },
  { type: 'dialogue', id: 'something_happens' },
  { type: 'anim', entityId: 'player', clip: 'idle_down' },
  { type: 'cameraFollow', entityId: 'player' },
  { type: 'flag', key: 'seen_it', value: true },
]);
```

`fade` ramps `Cutscene.fadeAlpha` toward `to` (0 clear..1 opaque) over `seconds`, drawn by
`GameScene.render()` on top of everything (independent of `SceneManager`'s own map-transition fade,
so both can stack). `sfx`/`music` are thin wrappers over `engine/systems/AudioSystem.js`. `anim` plays an
existing `Animator` clip on a named entity (or `'player'`) once — it does not invent new clips, so
the target sprite sheet needs the clip already registered (see `engine/entities/player/Player.js`'s
`addDirectional` calls).

See the `reveal` trigger type and `trigger:reveal` listener in `GameScene.js` (used by
`game/maps/bunker.json`) for a worked example, including the "only once" flag-guard pattern — and
`game/cutscenes/intro.js` (registered as `config.onNewGame` in `game/main.js`, played once per save) for a longer, fully
commented example exercising every step type above.

---

## Add an NPC schedule

Give an NPC a `schedule: [{ startHour, x, y }, …]` (0–24, any order — sorted on load). Instead of
wandering, it walks to whichever waypoint's `startHour` the in-game clock has most recently passed;
the clock is just `GameState.playtime` modulo `DAY_LENGTH` (`engine/config/Constants.js`). Omit `schedule`
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

Drop the file in `game/assets/audio/`, add a key under `sounds` (SFX) or `music` in
`game/manifest.js`, then `Audio.playSfx('key', { volume, rate, variation })` or
`Audio.playMusic('key', { fade })`. Per-map ambience is just `ambient.music` in the map JSON.

`.wav` keeps the placeholders dependency-free; `.ogg`/`.mp3` work identically and are far smaller —
switch once you have real music.

---

## Test your change

```bash
npm test          # unit tests for the engine + a content lint of the sample game
npm run check     # the same, plus the static import check CI runs
```

`tests/sample-game.test.js` catches broken content references (an item pointing at a missing weapon, a
portal to a map that doesn't exist, a manifest file that isn't on disk…) — copy it next to your own game.
`tools/check-imports.mjs` fails the build if anything under `engine/` imports from `game/`.

---

## Things worth building next

Roughly in order of how much they unlock:

1. **Quest system** — `GameState.quests` is reserved; drive it from `dialogue emit` events and flags.
   `engine/systems/CutsceneSystem.js` and the trading/combat/trap systems are all real seams for quest steps
   to hook into now (give something, kill something, reach somewhere, watch a scene).
2. **Weapon mods** — every weapon in `game/data/weapons.js` already carries an empty, unused `mods: []`;
   design what a mod changes (damage/cooldown/spread) and apply it when reading the weapon in
   `Player.attack()`.
3. **Reputation/factions** — `GameState.reputation` and `engine/systems/Economy.js`'s `reputationDiscount()` are
   reserved and wired through `priceFor()`, but always neutral today.
4. **Tiled integration** — replace `tools/gen_maps.py` with a Tiled export; the JSON shape already matches.
5. **Gamepad** — add a poll in `Input.endFrame()` that folds button state into the same action sets.
   Nothing outside `Input` reads keys, so no other file changes.
   Touch controls for mobile would plug into the same action layer.
6. **Save slots UI polish** — `Save.list()` already returns per-slot previews (map, playtime, HP).
7. **Pathfinding** — `Enemy.moveToward` still steers straight at its target; swap in A* over the
   collision grid once maps get more maze-like (this now matters more, with ranged/tank enemies).
8. **Item repair** — `GameState.damageDurability()`/`getDurability()` are the read/write seam; a repair
   kit item or a workbench prop just needs an `onUse`/`interact` that raises the equipped weapon's stored
   value back up, the same way healing items already raise `player.hp`.
