import { Assets } from '../core/AssetManager.js';
import { TileMap } from './TileMap.js';
import { NPC } from '../entities/npc/NPC.js';
import { Enemy } from '../entities/enemies/Enemy.js';
import { ItemPickup } from '../entities/items/ItemPickup.js';
import { Prop } from '../entities/Prop.js';
import { Trap } from '../entities/Trap.js';
import { Events } from '../core/EventBus.js';

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
    return entities;
  }
}

export const Maps = new MapManager();
