import { VIEW_W, VIEW_H, PALETTE } from '../config/Constants.js';
import { Font } from './BitmapFont.js';
import { panel } from './NineSlice.js';
import { Input } from '../core/Input.js';
import { Audio } from '../systems/AudioSystem.js';
import { GameState } from '../core/GameState.js';
import { getItem } from '../entities/items/ItemDatabase.js';
import { t, localised } from '../core/I18n.js';
import { drawItemIcon } from './ItemIcon.js';
import { Notifications } from '../systems/NotificationSystem.js';

const ROW_H = 14;

/**
 * Loot-transfer list for entities/Container.js. Up/Down picks a stack,
 * confirm takes it whole into the player's existing inventory, a trailing
 * "take all" row sweeps everything, cancel walks away — whatever's left
 * stays in the container (GameState.containers persists it). Nothing here
 * touches ItemDatabase or Inventory beyond the add()/remove() it already has.
 */
export class ContainerUI {
  constructor(container) {
    this.container = container;
    this.index = 0;
  }

  /** Only stacks still holding something — already-taken entries drop out. */
  get rows() { return this.container.items.filter((s) => s.qty > 0); }

  open() { this.index = 0; }

  take(itemId, qty) {
    const added = GameState.inventory.add(itemId, qty);
    if (added <= 0) {
      Notifications.push(t('notify.full'));
      Audio.playSfx('ui_back', { volume: 0.6 });
      return;
    }
    const remaining = this.container.items
      .map((s) => (s.itemId === itemId ? { itemId, qty: s.qty - added } : s))
      .filter((s) => s.qty > 0);
    GameState.setContainerContents(this.container.id, remaining);
    const def = getItem(itemId);
    Notifications.push(t('notify.picked', { name: localised(def?.name, itemId), qty: added }), { itemId });
    Audio.playSfx('pickup', { variation: 0.05 });
  }

  takeAll() { for (const row of [...this.rows]) this.take(row.itemId, row.qty); }

  /** @returns true when the player asked to close. */
  update() {
    const rows = this.rows;
    const lastIndex = rows.length;   // one past the stacks = the "take all" row
    this.index = Math.min(this.index, lastIndex);

    if (Input.justPressed('down')) { this.index = Math.min(lastIndex, this.index + 1); Audio.playSfx('ui_move', { volume: 0.6 }); }
    if (Input.justPressed('up')) { this.index = Math.max(0, this.index - 1); Audio.playSfx('ui_move', { volume: 0.6 }); }

    if (Input.justPressed('confirm')) {
      if (this.index >= rows.length) { if (rows.length) this.takeAll(); }
      else { const row = rows[this.index]; if (row) this.take(row.itemId, row.qty); }
    }
    return Input.justPressed('cancel');
  }

  render(renderer) {
    const ctx = renderer.ctx;
    const rows = this.rows;
    const w = 150;
    const h = Math.max(1, rows.length + 1) * ROW_H + 30;
    const x = Math.round((VIEW_W - w) / 2);
    const y = Math.round((VIEW_H - h) / 2);

    ctx.fillStyle = 'rgba(7,9,11,0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    panel(ctx, x, y, w, h);
    Font.draw(ctx, this.container.label ? localised(this.container.label) : t('container.title'), x + 10, y + 8, { color: PALETTE.glow });

    if (!rows.length) {
      Font.draw(ctx, t('container.empty'), x + 10, y + 26, { color: PALETTE.dim });
    } else {
      rows.forEach((row, i) => {
        const ry = y + 24 + i * ROW_H;
        const selected = i === this.index;
        const def = getItem(row.itemId);
        drawItemIcon(ctx, def || {}, x + 8, ry - 1, 14);
        Font.draw(ctx, localised(def?.name, row.itemId), x + 26, ry, { color: selected ? PALETTE.glow : PALETTE.bone });
        Font.draw(ctx, `x${row.qty}`, x + w - 10, ry, { color: PALETTE.dim, align: 'right' });
        if (selected) Font.draw(ctx, '>', x + 1, ry, { color: PALETTE.glow });
      });
    }

    const allY = y + 24 + rows.length * ROW_H;
    const allSelected = this.index === rows.length;
    Font.draw(ctx, t('container.takeAll'), x + 26, allY, { color: !rows.length ? PALETTE.dim : allSelected ? PALETTE.glow : PALETTE.bone });
    if (allSelected) Font.draw(ctx, '>', x + 1, allY, { color: PALETTE.glow });
  }
}
