import { VIEW_W, VIEW_H, PALETTE } from '../config/Constants.js';
import { Font } from './BitmapFont.js';
import { panel } from './NineSlice.js';
import { Input } from '../core/Input.js';
import { Audio } from '../systems/AudioSystem.js';
import { GameState } from '../core/GameState.js';
import { getItem } from '../entities/items/ItemDatabase.js';
import { t, localised } from '../core/I18n.js';
import { drawItemIcon } from './ItemIcon.js';
import { getRarity } from '../data/rarity.js';
import { Notifications } from '../systems/NotificationSystem.js';

const COLS = 6;
const ROWS = 4;
const CELL = 22;
const CATEGORIES = [null, 'consumable', 'equipment', 'material', 'ammo', 'trap', 'quest', 'key', 'currency'];

/**
 * Grid inventory with a category filter and a detail pane.
 * Arrows move, Z uses, I cycles the filter, X closes.
 */
export class InventoryUI {
  constructor() {
    this.index = 0;
    this.categoryIndex = 0;
    this.phase = 0;
  }

  get category() { return CATEGORIES[this.categoryIndex]; }

  get slots() {
    const all = GameState.inventory.slots;
    return this.category ? all.filter((s) => getItem(s.itemId)?.category === this.category) : all;
  }

  get selected() { return this.slots[this.index] || null; }

  open() { this.index = 0; }

  /** @param context optional { scene, entity } — items like traps need the live world to place themselves.
   *  @returns true when the player asked to close. */
  update(dt, context = {}) {
    this.phase += dt;
    const slots = this.slots;
    const max = Math.max(0, slots.length - 1);

    if (Input.justPressed('right')) this.index = Math.min(max, this.index + 1);
    if (Input.justPressed('left')) this.index = Math.max(0, this.index - 1);
    if (Input.justPressed('down')) this.index = Math.min(max, this.index + COLS);
    if (Input.justPressed('up')) this.index = Math.max(0, this.index - COLS);

    if (Input.justPressed('inventory')) {
      this.categoryIndex = (this.categoryIndex + 1) % CATEGORIES.length;
      this.index = 0;
      Audio.playSfx('ui_move');
    }

    if (Input.justPressed('confirm') && this.selected) {
      const itemId = this.selected.itemId;
      const def = getItem(itemId);
      if (def?.slot) {
        const wasEquipped = GameState.equipment.get(def.slot) === itemId;
        const ok = wasEquipped
          ? GameState.equipment.unequip(GameState.inventory, def.slot)
          : GameState.equipment.equip(GameState.inventory, itemId);
        Audio.playSfx(ok ? 'pickup' : 'ui_back', { volume: 0.7 });
        if (ok) Notifications.push(t(wasEquipped ? 'notify.unequipped' : 'notify.equipped', { name: localised(def.name) }));
      } else {
        const used = GameState.inventory.use(itemId, { state: GameState, scene: context.scene, entity: context.entity });
        Audio.playSfx(used ? 'pickup' : 'ui_back', { volume: 0.7 });
      }
      this.index = Math.min(this.index, Math.max(0, this.slots.length - 1));
    }

    return Input.justPressed('cancel');
  }

  render(renderer) {
    const ctx = renderer.ctx;
    const w = COLS * CELL + 20;
    const h = ROWS * CELL + 68;
    const x = Math.round((VIEW_W - w) / 2);
    const y = Math.round((VIEW_H - h) / 2) - 6;

    ctx.fillStyle = 'rgba(7,9,11,0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    panel(ctx, x, y, w, h);

    const totalWeight = GameState.inventory.totalWeight();
    const title = totalWeight > 0 ? `${t('inventory.title')} (${t('inventory.weight')} ${totalWeight})` : t('inventory.title');
    Font.draw(ctx, title, x + 10, y + 8, { color: PALETTE.glow });
    const catLabel = this.category ? t(`inventory.cat.${this.category}`) : '*';
    Font.draw(ctx, `[I] ${catLabel}`, x + w - 10, y + 8, { color: PALETTE.dim, align: 'right' });

    const gridX = x + 10;
    const gridY = y + 24;
    const slots = this.slots;

    for (let i = 0; i < COLS * ROWS; i++) {
      const cx = gridX + (i % COLS) * CELL;
      const cy = gridY + Math.floor(i / COLS) * CELL;
      const slot = slots[i];
      const selected = i === this.index;

      ctx.fillStyle = selected ? 'rgba(127,224,168,0.12)' : 'rgba(20,24,28,0.75)';
      ctx.fillRect(cx, cy, CELL - 2, CELL - 2);
      renderer.outline(cx, cy, CELL - 2, CELL - 2, selected ? PALETTE.glow : PALETTE.concrete);

      if (!slot) continue;
      const def = getItem(slot.itemId);
      drawItemIcon(ctx, def || {}, cx + 2, cy + 2, 16);
      if (def?.slot && GameState.equipment.get(def.slot) === slot.itemId) {
        Font.draw(ctx, 'E', cx + 1, cy + 1, { color: PALETTE.glow });
      }
      if (slot.qty > 1) Font.draw(ctx, String(slot.qty), cx + CELL - 4, cy + CELL - 12, { color: PALETTE.bone, align: 'right' });
    }

    // Detail pane
    const detailY = gridY + ROWS * CELL + 4;
    const def = this.selected ? getItem(this.selected.itemId) : null;
    if (def) {
      const nameColor = def.rarity && def.rarity !== 'common' ? getRarity(def.rarity).color : PALETTE.bone;
      Font.draw(ctx, localised(def.name), x + 10, detailY, { color: nameColor });
      if (def.weight) Font.draw(ctx, String(def.weight), x + w - 10, detailY, { color: PALETTE.dim, align: 'right' });
      Font.draw(ctx, localised(def.description), x + 10, detailY + 13, {
        color: PALETTE.dim, maxWidth: w - 20,
      });
    } else {
      Font.draw(ctx, t('inventory.empty'), x + 10, detailY, { color: PALETTE.dim });
    }
  }
}
