/**
 * Shop pricing. Shops themselves are content (a game's `shops` table, see
 * core/Content.js):
 *
 *   { id, buyMultiplier, sellMultiplier, sells: [{ itemId, price, stock }], buysCategories: [...] }
 *
 * @param buying true = player buying from the shop, false = selling to it.
 * @param itemValue the item's base worth (its `value`), used as the sell-side
 *   price and as a fallback if a shop lists no explicit price.
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

/** Reserved seam for faction standing — always neutral today. Wire it to
 *  GameState.reputation once factions exist; priceFor() already calls it. */
export function reputationDiscount(/* shop */) { return 1; }
