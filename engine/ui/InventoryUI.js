import { VIEW_W, VIEW_H, PALETTE } from '../config/Constants.js';
import { Font } from './BitmapFont.js';
import { panel } from './NineSlice.js';
import { Input } from '../core/Input.js';
import { Audio } from '../systems/AudioSystem.js';
import { GameState } from '../core/GameState.js';
import { getItem, getWeapon, getRarity } from '../core/Content.js';
import { t, localised } from '../core/I18n.js';
import { drawItemIcon } from './ItemIcon.js';
import { Notifications } from '../systems/NotificationSystem.js';
import { ItemPickup } from '../entities/items/ItemPickup.js';
import { Assets } from '../core/AssetManager.js';
import { FLASHLIGHT_MAX_BATTERY } from '../config/Constants.js';

// 7x3 = 21 cells: room for GameState's 20-slot bag while keeping the whole
// panel inside the 216px-tall view (a 6x4 grid made it overflow the screen).
const COLS = 7;
const ROWS = 3;
const CELL = 22;
const CATEGORIES = [null, 'consumable', 'equipment', 'material', 'ammo', 'trap', 'quest', 'key', 'currency'];

/** Armor meter — row 3 of assets/ui/hud_icons_placeholder.png (see
 *  tools/gen_art.py build_hud_icons), same empty/half/full segment icons
 *  HUD.js uses for hp/hunger/thirst. Each segment reads as 2 armor points;
 *  ARMOR_MAX is a display ceiling, not a hard cap on GameState.player.maxArmor. */
const ARMOR_ROW = 3;
const ARMOR_SEGMENTS = 5;
const ARMOR_MAX = ARMOR_SEGMENTS * 2;
const ARMOR_ICON = 8;
/** Flashlight battery meter — row 4 (last) of hud_icons_placeholder.png,
 *  same empty/half/full segment icons as everything else. Unlike armor's
 *  ARMOR_MAX (a display ceiling distinct from the real, gear-dependent
 *  maxArmor), FLASHLIGHT_MAX_BATTERY *is* the real max, so segments map to
 *  it directly. Shown unconditionally, same as the armor meter, even before
 *  the player has ever found a flashlight — see renderBatteryMeter(). */
const BATTERY_ROW = 4;
const BATTERY_SEGMENTS = 5;
const BATTERY_ICON = 8;
// Extra header space reserved above the item grid for the armor meter,
// battery meter and carried-weight rows (see render()) — all three live
// under the title/category line rather than crammed onto it, which at this
// panel's width used to make a long "Inventory (Weight 12)" title overlap
// the right-aligned category label.
const HEADER_H = 22 + 14 * 2;
/** Grid's offset from the panel top: the header rows plus a small gap. */
const GRID_TOP = HEADER_H + 18;

/** Sums of fractional weights pick up float noise (0.1 + 0.2 ...) — one decimal is plenty. */
const formatWeight = (value) => String(Math.round(value * 10) / 10);
/** Longest wrapped run a description is allowed before render() ellipsizes
 *  it — some item descriptions wrap to 5 lines at this panel's width,
 *  which used to run the text straight through the panel's own border. */
const DESC_MAX_LINES = 3;

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
        // Throwables (grenades) deliberately refuse onUse — they only do
        // anything on the dedicated throw key — but a silent "denial" sfx
        // with no explanation reads as "this item is broken". Say why.
        if (!used && def?.weaponId && getWeapon(def.weaponId)?.category === 'throwable') {
          Notifications.push(t('notify.throwOnly'));
        }
      }
      this.index = Math.min(this.index, Math.max(0, this.slots.length - 1));
    }

    if (Input.justPressed('drop') && this.selected) this.drop(context);

    return Input.justPressed('cancel');
  }

  /** Drops the whole selected stack at the player's feet — a live ItemPickup
   *  right away, plus a GameState.worldItems record so it survives a map
   *  reload/save (see world/MapManager.js buildEntities()). Durability, if
   *  the item has any, travels with it and is restored on pickup. Dropping a
   *  currently-equipped item unequips it first — an equipped item still lives
   *  in the bag (see systems/InventorySystem.js Equipment), so without this
   *  the player could throw away gear that stayed "equipped" in an empty slot. */
  drop(context) {
    const slot = this.selected;
    const def = getItem(slot.itemId);
    if (!def) return;
    if (def.slot && GameState.equipment.get(def.slot) === slot.itemId) {
      GameState.equipment.unequip(GameState.inventory, def.slot);
    }
    const entity = context.entity;
    const point = entity?.interactPoint ? entity.interactPoint(10) : { x: entity?.x ?? 0, y: entity?.y ?? 0 };
    const removed = GameState.inventory.remove(slot.itemId, slot.qty);
    if (removed <= 0) return;

    const durability = def.durability?.max ? GameState.getDurability(slot.itemId, def.durability.max) : null;
    const id = GameState.allocateDropId();
    const mapId = GameState.currentMap;
    GameState.worldItems[mapId] ??= [];
    GameState.worldItems[mapId].push({ id, itemId: slot.itemId, qty: removed, x: point.x, y: point.y, durability });
    context.scene?.entities.push(new ItemPickup({ id, x: point.x, y: point.y, itemId: slot.itemId, qty: removed, durability }));

    Notifications.push(t('inventory.dropped', { name: localised(def.name) }));
    Audio.playSfx('pickup', { rate: 0.7, volume: 0.6 });
    this.index = Math.min(this.index, Math.max(0, this.slots.length - 1));
  }

  /** Segmented shield meter (ARMOR_ROW of hud_icons) plus the raw number —
   *  reads the depleting GameState.player.armor pool (out of maxArmor, its
   *  equipped ceiling — see GameState.refreshArmor()), so it drains hit by
   *  hit and refills the instant new gear changes that ceiling. */
  renderArmorMeter(ctx, x, y) {
    const sheet = Assets.image('hud_icons');
    const { armor, maxArmor } = GameState.player;
    const filled = maxArmor > 0 ? Math.max(0, Math.min(ARMOR_SEGMENTS, (armor / ARMOR_MAX) * ARMOR_SEGMENTS)) : 0;
    if (sheet) {
      for (let i = 0; i < ARMOR_SEGMENTS; i++) {
        const remaining = filled - i;
        const state = remaining >= 1 ? 2 : remaining >= 0.5 ? 1 : 0;
        ctx.drawImage(sheet, state * ARMOR_ICON, ARMOR_ROW * ARMOR_ICON, ARMOR_ICON, ARMOR_ICON,
          x + i * ARMOR_ICON, y, ARMOR_ICON, ARMOR_ICON);
      }
    }
    Font.draw(ctx, `${t('inventory.armor')} ${armor}/${maxArmor}`, x + ARMOR_SEGMENTS * ARMOR_ICON + 6, y + 1, { color: PALETTE.dim });
  }

  /** Segmented battery meter (BATTERY_ROW of hud_icons) plus the raw number
   *  — same treatment as renderArmorMeter(). Reads
   *  GameState.player.flashlightBattery directly (see GameScene.update()'s
   *  drain and cell_battery's onUse) — this is the *only* place it's shown;
   *  the gameplay HUD never displays it. */
  renderBatteryMeter(ctx, x, y) {
    const sheet = Assets.image('hud_icons');
    const battery = GameState.player.flashlightBattery;
    const filled = Math.max(0, Math.min(BATTERY_SEGMENTS, (battery / FLASHLIGHT_MAX_BATTERY) * BATTERY_SEGMENTS));
    if (sheet) {
      for (let i = 0; i < BATTERY_SEGMENTS; i++) {
        const remaining = filled - i;
        const state = remaining >= 1 ? 2 : remaining >= 0.5 ? 1 : 0;
        ctx.drawImage(sheet, state * BATTERY_ICON, BATTERY_ROW * BATTERY_ICON, BATTERY_ICON, BATTERY_ICON,
          x + i * BATTERY_ICON, y, BATTERY_ICON, BATTERY_ICON);
      }
    }
    Font.draw(ctx, `${t('inventory.battery')} ${Math.round(battery)}/${FLASHLIGHT_MAX_BATTERY}`, x + BATTERY_SEGMENTS * BATTERY_ICON + 6, y + 1, { color: PALETTE.dim });
  }

  render(renderer) {
    const ctx = renderer.ctx;
    const w = COLS * CELL + 20;
    // Header, grid, then the detail pane (name line, durability line, up to
    // DESC_MAX_LINES of description and a little bottom padding) so the
    // longest (ellipsized) description still sits inside the panel border.
    const h = GRID_TOP + ROWS * CELL + 4 + 26 + DESC_MAX_LINES * Font.lineHeight() + 4;
    const x = Math.round((VIEW_W - w) / 2);
    const y = Math.max(2, Math.round((VIEW_H - h) / 2));

    ctx.fillStyle = 'rgba(7,9,11,0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    panel(ctx, x, y, w, h);

    Font.draw(ctx, t('inventory.title'), x + 10, y + 8, { color: PALETTE.glow });
    const catLabel = this.category ? t(`inventory.cat.${this.category}`) : '*';
    Font.draw(ctx, `[I] ${catLabel}`, x + w - 10, y + 8, { color: PALETTE.dim, align: 'right' });

    const armorRowY = y + 8 + Font.lineHeight() + 2;
    this.renderArmorMeter(ctx, x + 10, armorRowY);
    const batteryRowY = armorRowY + Font.lineHeight();
    this.renderBatteryMeter(ctx, x + 10, batteryRowY);

    // Own row below the meters — appending this to the title instead used
    // to overlap the right-aligned category label once the panel's narrow
    // width met a title long enough to include it.
    const totalWeight = GameState.inventory.totalWeight();
    if (totalWeight > 0) {
      Font.draw(ctx, `${t('inventory.weight')} ${formatWeight(totalWeight)}`, x + 10, batteryRowY + Font.lineHeight(), { color: PALETTE.dim });
    }

    const gridX = x + 10;
    const gridY = y + GRID_TOP;
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
      const broken = def?.durability?.max && GameState.getDurability(slot.itemId, def.durability.max) <= 0;
      ctx.save();
      if (broken) ctx.globalAlpha = 0.5;
      drawItemIcon(ctx, def || {}, cx + 2, cy + 2, 16);
      ctx.restore();
      if (def?.slot && GameState.equipment.get(def.slot) === slot.itemId) {
        Font.draw(ctx, 'E', cx + 1, cy + 1, { color: PALETTE.glow });
      }
      if (broken) Font.draw(ctx, 'X', cx + CELL - 10, cy + 1, { color: PALETTE.danger });
      if (slot.qty > 1) Font.draw(ctx, String(slot.qty), cx + CELL - 4, cy + CELL - 12, { color: PALETTE.bone, align: 'right' });
    }

    // Detail pane
    const detailY = gridY + ROWS * CELL + 4;
    const def = this.selected ? getItem(this.selected.itemId) : null;
    if (def) {
      const nameColor = def.rarity && def.rarity !== 'common' ? getRarity(def.rarity).color : PALETTE.bone;
      Font.draw(ctx, localised(def.name), x + 10, detailY, { color: nameColor });
      if (def.weight) Font.draw(ctx, String(def.weight), x + w - 10, detailY, { color: PALETTE.dim, align: 'right' });
      if (def.durability?.max) {
        const durability = GameState.getDurability(def.id, def.durability.max);
        const broken = durability <= 0;
        const label = broken ? t('inventory.broken') : `${t('inventory.durability')} ${Math.ceil((durability / def.durability.max) * 100)}%`;
        Font.draw(ctx, label, x + w - 10, detailY + 13, { color: broken ? PALETTE.danger : PALETTE.dim, align: 'right' });
      }
      // Pre-wrap and cap at DESC_MAX_LINES ourselves (rather than handing the
      // raw string to Font.draw's own maxWidth wrapping) so a long
      // description is ellipsized instead of running past the panel.
      const descLines = Font.wrap(localised(def.description), w - 20);
      if (descLines.length > DESC_MAX_LINES) {
        // '...' rather than a single '…' glyph — the bitmap atlas is ASCII
        // 32..126 only (ui/BitmapFont.js), so a real ellipsis character
        // would just fold to '?'.
        const maxChars = Math.max(1, Math.floor((w - 20) / Font.charWidth()));
        const last = descLines[DESC_MAX_LINES - 1];
        descLines[DESC_MAX_LINES - 1] = (last.length + 3 > maxChars ? last.slice(0, Math.max(0, maxChars - 3)) : last) + '...';
        descLines.length = DESC_MAX_LINES;
      }
      Font.draw(ctx, descLines.join('\n'), x + 10, detailY + (def.durability?.max ? 26 : 13), { color: PALETTE.dim });
    } else {
      Font.draw(ctx, t('inventory.empty'), x + 10, detailY, { color: PALETTE.dim });
    }
  }
}
