import { Assets } from '../core/AssetManager.js';
import { TileMap } from './TileMap.js';
import { NPC } from '../entities/npc/NPC.js';
import { Enemy } from '../entities/enemies/Enemy.js';
import { ItemPickup } from '../entities/items/ItemPickup.js';
import { Prop } from '../entities/Prop.js';
import { Trap } from '../entities/Trap.js';
import { Container } from '../entities/Container.js';
import { Phone } from '../entities/Phone.js';
import { Events } from '../core/EventBus.js';
import { GameState } from '../core/GameState.js';

/**
 * Turns map JSON into a live TileMap plus its entities.
 *
 * Adding a new entity type is one line in ENTITY_FACTORY — the maps, the
 * loader and the scene all stay untouched.
 */
const ENTITY_FACTORY = {
  npc: (def) => new NPC(def),
  enemy: (def) => new Enemy(def),
  item: (def) => new ItemPickup(def),
  prop: (def) => new Prop(def),
  trap: (def) => new Trap(def),
  container: (def) => new Container(def),
  phone: (def) => new Phone(def),
};

class MapManager {
  constructor() { this.cache = new Map(); }

  /** Maps are preloaded by the boot scene; this reads them back out. */
  getData(mapId) {
    const data = Assets.data('map:' + mapId);
    if (!data) console.error(`[Maps] "${mapId}" was never loaded — is it in config/manifest.js?`);
    return data;
  }

  load(mapId) {
    const data = this.getData(mapId);
    if (!data) return null;
    // Deep copy so runtime edits (opened doors, broken walls) never leak into
    // the cached JSON and survive a reload of the same map.
    const map = new TileMap(structuredClone(data));
    Events.emit('map:loaded', { mapId });
    return map;
  }

  buildEntities(map) {
    const entities = [];
    for (const def of map.data.entities || []) {
      const factory = ENTITY_FACTORY[def.type];
      if (!factory) { console.warn(`[Maps] unknown entity type "${def.type}"`); continue; }
      const entity = factory(def);
      if (!entity.dead) entities.push(entity);
    }

    // Player-dropped items (ui/InventoryUI.js `drop()`) live in GameState,
    // not the map JSON — rebuilt here the same way map-authored pickups are,
    // and pruned the moment they're picked back up so the list can't grow
    // forever across a long save.
    const drops = GameState.worldItems[map.id];
    if (drops?.length) {
      GameState.worldItems[map.id] = drops.filter((d) => !GameState.getFlag(`picked:${d.id}`, false));
      for (const drop of GameState.worldItems[map.id]) {
        entities.push(new ItemPickup({ id: drop.id, x: drop.x, y: drop.y, itemId: drop.itemId, qty: drop.qty, durability: drop.durability }));
      }
    }
    return entities;
  }
}

export const Maps = new MapManager();
