import { Content } from '../core/Content.js';

/**
 * Weighted drop rolls. Tables are content (a game's `lootTables`, see
 * core/Content.js); the rolling is engine logic shared by every table:
 *
 *   { rolls: 1, entries: [ { itemId: 'scrap', weight: 30, qty: [1, 3] }, { itemId: null, weight: 35 } ] }
 *
 * `itemId: null` is a valid entry — it's how "drops nothing" gets its own odds
 * instead of being a guaranteed roll. `qty` is a fixed number or a [min, max] range.
 */

function randInt(min, max, random) { return Math.floor(min + random() * (max - min + 1)); }

/** Picks one entry proportionally to its `weight`. */
export function weightedPick(entries, random = Math.random) {
  const total = entries.reduce((sum, e) => sum + e.weight, 0);
  let roll = random() * total;
  for (const entry of entries) { roll -= entry.weight; if (roll <= 0) return entry; }
  return entries[entries.length - 1];
}

/** @returns Array<{ itemId, qty }> — may be empty. `random` is injectable for tests. */
export function rollLoot(tableId, random = Math.random) {
  const table = Content.lootTables[tableId];
  if (!table) return [];
  const drops = [];
  for (let i = 0; i < (table.rolls ?? 1); i++) {
    const entry = weightedPick(table.entries, random);
    if (!entry?.itemId) continue;
    const qty = Array.isArray(entry.qty) ? randInt(entry.qty[0], entry.qty[1], random) : (entry.qty ?? 1);
    drops.push({ itemId: entry.itemId, qty });
  }
  return drops;
}

/** Rolls a rarity tier id weighted by each tier's `weight`, optionally excluding some tiers. */
export function rollRarity(exclude = [], random = Math.random) {
  const pool = Object.values(Content.rarities).filter((r) => !exclude.includes(r.id));
  if (!pool.length) return 'common';
  return weightedPick(pool, random).id;
}
