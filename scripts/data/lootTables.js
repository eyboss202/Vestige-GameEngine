/**
 * Named weighted drop tables. An enemy archetype (data/enemies.js) points at
 * one via `lootTable`; Enemy.die() rolls it and spawns ItemPickup entities.
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

function randInt(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }

function weightedPick(entries) {
  const total = entries.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * total;
  for (const entry of entries) { roll -= entry.weight; if (roll <= 0) return entry; }
  return entries[entries.length - 1];
}

/** @returns Array<{ itemId, qty }> — may be empty. */
export function rollLoot(tableId) {
  const table = LOOT_TABLES[tableId];
  if (!table) return [];
  const drops = [];
  for (let i = 0; i < (table.rolls ?? 1); i++) {
    const entry = weightedPick(table.entries);
    if (!entry?.itemId) continue;
    const qty = Array.isArray(entry.qty) ? randInt(entry.qty[0], entry.qty[1]) : (entry.qty ?? 1);
    drops.push({ itemId: entry.itemId, qty });
  }
  return drops;
}
