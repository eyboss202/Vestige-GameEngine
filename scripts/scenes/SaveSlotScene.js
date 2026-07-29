import { Scene } from '../core/Scene.js';
import { VIEW_W, VIEW_H, PALETTE, SAVE_SLOTS } from '../config/Constants.js';
import { Font } from '../ui/BitmapFont.js';
import { panel } from '../ui/NineSlice.js';
import { MenuList } from '../ui/MenuList.js';
import { Save } from '../systems/SaveSystem.js';
import { Notifications } from '../systems/NotificationSystem.js';
import { t } from '../core/I18n.js';

/** Shared slot picker for both loading and saving. */
export class SaveSlotScene extends Scene {
  constructor(game) {
    super(game);
    this.transparent = true;
    this.mode = 'load';
    this.onLoaded = null;
    this.menu = null;
  }

  enter({ mode = 'load', onLoaded = null } = {}) {
    this.mode = mode;
    this.onLoaded = onLoaded;
    this.confirmSlot = null;
    this.refresh();
  }

  refresh() {
    const slots = Save.list();
    const items = slots.map((slot) => ({
      label: `${t('menu.slot')} ${slot.slot + 1}`,
      value: slot.empty ? t('menu.empty') : `${formatTime(slot.playtime)}`,
      disabled: this.mode === 'load' && slot.empty,
      slot,
      onSelect: (item) => this.pick(item.slot),
    }));
    items.push({ label: t('menu.back'), onSelect: () => this.game.scenes.pop() });
    this.menu = new MenuList(items, { spacing: 18, onCancel: () => this.game.scenes.pop() });
  }

  pick(slot) {
    if (this.mode === 'save') {
      // An occupied slot needs a yes/no beat before it's overwritten; an
      // empty one (nothing to lose) writes immediately, same as before.
      if (!slot.empty) { this.confirm(slot); return; }
      this.write(slot);
      return;
    }
    if (Save.load(slot.slot)) {
      this.game.scenes.pop();
      this.onLoaded?.();
    }
  }

  /** Swaps the slot list for a small yes/no menu instead of writing straight
   *  away — see render()/update(), which dispatch to whichever is active. */
  confirm(slot) {
    this.confirmSlot = slot;
    this.confirmMenu = new MenuList([
      { label: t('common.yes'), onSelect: () => this.write(slot) },
      { label: t('common.no'), onSelect: () => { this.confirmSlot = null; } },
    ], { spacing: 18, onCancel: () => { this.confirmSlot = null; } });
  }

  write(slot) {
    Save.save(slot.slot);
    Notifications.push(t('notify.savedSlot', { slot: slot.slot + 1 }));
    this.confirmSlot = null;
    this.game.scenes.pop();
  }

  update(dt) {
    if (this.confirmSlot) this.confirmMenu.update(dt);
    else this.menu.update(dt);
  }

  render(renderer) {
    const ctx = renderer.ctx;
    ctx.fillStyle = 'rgba(7,9,11,0.78)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    const w = 200;
    const h = 40 + SAVE_SLOTS * 18 + 24;
    const x = (VIEW_W - w) / 2;
    const y = (VIEW_H - h) / 2;
    panel(ctx, x, y, w, h);
    if (this.confirmSlot) {
      Font.draw(ctx, t('menu.overwriteConfirm', { slot: this.confirmSlot.slot + 1 }), x + 12, y + 10, { color: PALETTE.amber });
      this.confirmMenu.render(renderer, x + 22, y + 30, { width: w - 44 });
    } else {
      Font.draw(ctx, t('menu.selectSlot'), x + 12, y + 10, { color: PALETTE.glow });
      this.menu.render(renderer, x + 22, y + 30, { width: w - 44 });
    }
  }
}

export function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
