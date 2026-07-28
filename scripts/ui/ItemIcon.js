import { Assets } from '../core/AssetManager.js';
import { getItem, FALLBACK_ICON } from '../entities/items/ItemDatabase.js';
import { RARITIES } from '../data/rarity.js';

/**
 * Single place that draws an inventory/pickup/toast icon. The placeholder
 * sheet only has a handful of base shapes (assets/ui/items_placeholder.png),
 * so new items reuse one and set `iconTint` to stay visually distinct instead
 * of needing new art — same runtime-recolor trick Enemy.render() uses.
 * `rarity` (optional) draws a matching border around the cell.
 */
export function drawItemIcon(ctx, { icon = FALLBACK_ICON, iconTint = null, rarity = null } = {}, dx, dy, size = 16) {
  const sheet = Assets.image('ui_items');
  if (!sheet) return;
  ctx.drawImage(sheet, icon * 16, 0, 16, 16, dx, dy, size, size);
  if (iconTint) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = iconTint;
    ctx.fillRect(dx, dy, size, size);
    ctx.restore();
  }
  const color = RARITIES[rarity]?.color;
  if (color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(dx + 0.5, dy + 0.5, size - 1, size - 1);
  }
}

/** Convenience for call sites that only have an item id. */
export function drawItemIconFor(ctx, itemId, dx, dy, size = 16) {
  drawItemIcon(ctx, getItem(itemId) || {}, dx, dy, size);
}
