/**
 * Named weighted drop tables. An enemy archetype (data/enemies.js) points at
 * one via `lootTable`; Enemy.die() rolls it (engine/systems/LootSystem.js)
 * and spawns ItemPickup entities.
 * `itemId: null` is a valid entry — it's how "drops nothing" gets its own odds
 * instead of being a guaranteed roll.
 */
export const LOOT_TABLES = {
  husk_common: {
    rolls: 1,
    entries: [
      { itemId: null, weight: 35 },
      { itemId: 'scrap_metal', weight: 30, qty: [1, 3] },
      { itemId: 'stale_bread', weight: 15, qty: [1, 1] },
      { itemId: 'stim_syringe', weight: 10, qty: [1, 1] },
      { itemId: 'cell_battery', weight: 10, qty: [1, 1] },
    ],
  },
  mutant_common: {
    rolls: 1,
    entries: [
      { itemId: null, weight: 25 },
      { itemId: 'scrap_metal', weight: 30, qty: [2, 4] },
      { itemId: 'bandage', weight: 20, qty: [1, 2] },
      { itemId: 'purified_water', weight: 15, qty: [1, 1] },
      { itemId: 'scrip', weight: 10, qty: [3, 8] },
    ],
  },
  ranged_common: {
    rolls: 1,
    entries: [
      { itemId: null, weight: 30 },
      { itemId: 'pistol_ammo', weight: 35, qty: [3, 6] },
      { itemId: 'scrap_metal', weight: 20, qty: [1, 2] },
      { itemId: 'scrip', weight: 15, qty: [3, 6] },
    ],
  },
  swarm_common: {
    rolls: 1,
    entries: [
      { itemId: null, weight: 65 },
      { itemId: 'scrap_metal', weight: 30, qty: [1, 1] },
      { itemId: 'scrip', weight: 5, qty: [1, 2] },
    ],
  },
  elite: {
    rolls: 2,
    entries: [
      { itemId: 'scrip', weight: 30, qty: [10, 20] },
      { itemId: 'stim_syringe', weight: 20, qty: [1, 2] },
      { itemId: 'bandage', weight: 15, qty: [2, 3] },
      { itemId: 'combat_knife', weight: 10, qty: [1, 1] },
      { itemId: 'plated_vest', weight: 10, qty: [1, 1] },
      { itemId: 'pistol_ammo', weight: 15, qty: [6, 12] },
    ],
  },
};
