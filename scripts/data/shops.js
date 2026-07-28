/**
 * One shop per merchant NPC (see NPC `shop` field, ui/scenes/ShopScene.js).
 * `sells` lists stock with a price and an optional finite `stock` count that
 * depletes at runtime (not persisted — matches the rest of this placeholder
 * economy, which is about proving the pipeline, not a real save-safe ledger).
 * `buysCategories` decides what the shop will buy back from the player, at
 * `sellMultiplier` times the item's own `value` (ItemDatabase.js).
 *
 * Currency is just an item — see `scrip` in ItemDatabase.js — so buying and
 * selling are plain Inventory.add()/remove() calls, nothing bespoke.
 */
export const SHOPS = {
  wanderer_trades: {
    id: 'wanderer_trades',
    buyMultiplier: 1.0,     // scales the shop's listed price
    sellMultiplier: 0.5,    // scales what the player gets for selling
    sells: [
      { itemId: 'stim_syringe', price: 12, stock: 4 },
      { itemId: 'purified_water', price: 6, stock: 6 },
      { itemId: 'stale_bread', price: 5, stock: 6 },
      { itemId: 'bandage', price: 9, stock: 5 },
      { itemId: 'pistol_ammo', price: 2, stock: 40 },
    ],
    buysCategories: ['material', 'consumable', 'ammo'],
  },
  bunker_quartermaster: {
    id: 'bunker_quartermaster',
    buyMultiplier: 1.0,
    sellMultiplier: 0.55,
    sells: [
      { itemId: 'rifle_ammo', price: 2, stock: 60 },
      { itemId: 'shotgun_shell', price: 3, stock: 24 },
      { itemId: 'frag_grenade', price: 18, stock: 3 },
      { itemId: 'scavenger_helmet', price: 20, stock: 1 },
      { itemId: 'worn_boots', price: 22, stock: 1 },
    ],
    buysCategories: ['material', 'ammo', 'equipment'],
  },
};

export function getShop(id) { return SHOPS[id] || null; }

/**
 * @param buying true = player buying from the shop, false = selling to it.
 * @param itemValue the item's base worth (ItemDatabase `value`), used as the
 *   sell-side price and as a fallback if a shop lists no explicit price.
 * Reserved seam for the prompt's future reputation/discount/faction systems —
 * `reputationDiscount()` always returns 1 today; wire it to
 * GameState.reputation once factions exist. Nothing else needs to change.
 */
export function priceFor(shop, itemId, buying, itemValue = 0) {
  if (!shop) return itemValue;
  if (buying) {
    const entry = shop.sells.find((s) => s.itemId === itemId);
    const base = entry?.price ?? itemValue;
    return Math.max(1, Math.round(base * (shop.buyMultiplier ?? 1) * reputationDiscount(shop)));
  }
  return Math.max(0, Math.round(itemValue * (shop.sellMultiplier ?? 0.5)));
}

export function reputationDiscount(/* shop */) { return 1; }
