/**
 * One shop per merchant NPC (see the NPC `shop` field and engine/scenes/ShopScene.js).
 * `sells` lists stock with a price and an optional finite `stock` count that
 * depletes at runtime (not persisted — matches the rest of this placeholder
 * economy, which is about proving the pipeline, not a real save-safe ledger).
 * `buysCategories` decides what the shop will buy back from the player, at
 * `sellMultiplier` times the item's own `value` (data/items.js).
 *
 * Currency is just an item — `scrip` in data/items.js, named by `config.currency` — so buying and
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
