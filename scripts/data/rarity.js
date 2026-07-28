/**
 * Loot rarity tiers. Items reference one by id via their `rarity` field
 * (default 'common' when unset); loot tables use `weight` to roll drops.
 * Purely cosmetic + drop-odds today — `statMultiplier` is a reserved seam for
 * scaling gear stats by rarity once real equipment math wants it.
 */
export const RARITIES = {
  common:    { id: 'common',    name: { en: 'Common',    pt: 'Comum' },     color: '#c7d1ce', weight: 100, statMultiplier: 1.0 },
  uncommon:  { id: 'uncommon',  name: { en: 'Uncommon',  pt: 'Invulgar' },  color: '#7fe0a8', weight: 45,  statMultiplier: 1.15 },
  rare:      { id: 'rare',      name: { en: 'Rare',      pt: 'Raro' },      color: '#5fa8d8', weight: 16,  statMultiplier: 1.35 },
  epic:      { id: 'epic',      name: { en: 'Epic',      pt: 'Epico' },     color: '#b285e0', weight: 5,   statMultiplier: 1.6 },
  legendary: { id: 'legendary', name: { en: 'Legendary', pt: 'Lendario' },  color: '#e0a458', weight: 1,   statMultiplier: 2.0 },
};

export function getRarity(id) { return RARITIES[id] || RARITIES.common; }

/** Rolls a rarity tier weighted by `weight`, optionally excluding some tiers. */
export function rollRarity(exclude = []) {
  const pool = Object.values(RARITIES).filter((r) => !exclude.includes(r.id));
  const total = pool.reduce((sum, r) => sum + r.weight, 0);
  let roll = Math.random() * total;
  for (const r of pool) { roll -= r.weight; if (roll <= 0) return r.id; }
  return pool[pool.length - 1]?.id ?? 'common';
}
