import { Input } from '../core/Input.js';
import { Font } from './BitmapFont.js';
import { Assets } from '../core/AssetManager.js';
import { Audio } from '../systems/AudioSystem.js';
import { PALETTE } from '../config/Constants.js';

/**
 * Reusable vertical menu: keyboard navigation, disabled entries, a value
 * column on the right (for sliders and toggles) and a caret. Every menu screen
 * in the game is one of these plus a background.
 *
 * item = { label, value?, disabled?, hint?, onSelect?, onLeft?, onRight? }
 */
export class MenuList {
  constructor(items = [], { onSelect = null, onCancel = null, spacing = 16, wrap = true } = {}) {
    this.items = items;
    this.index = 0;
    this.spacing = spacing;
    this.wrap = wrap;
    this.onSelect = onSelect;
    this.onCancel = onCancel;
    this.enabled = true;
    this.caretPhase = 0;
    this.moveCooldown = 0;
    this.ensureSelectable(1);
  }

  setItems(items, keepIndex = true) {
    this.items = items;
    if (!keepIndex) this.index = 0;
    this.index = Math.min(this.index, Math.max(0, items.length - 1));
    this.ensureSelectable(1);
  }

  get current() { return this.items[this.index] || null; }

  ensureSelectable(direction) {
    let guard = 0;
    while (this.items[this.index]?.disabled && guard++ < this.items.length) this.step(direction);
  }

  step(direction) {
    if (!this.items.length) return;
    this.index += direction;
    if (this.index < 0) this.index = this.wrap ? this.items.length - 1 : 0;
    if (this.index >= this.items.length) this.index = this.wrap ? 0 : this.items.length - 1;
  }

  move(direction) {
    const before = this.index;
    let guard = 0;
    do { this.step(direction); guard++; } while (this.items[this.index]?.disabled && guard <= this.items.length);
    if (this.index !== before) Audio.playSfx('ui_move', { volume: 0.7 });
  }

  update(dt) {
    this.caretPhase += dt;
    if (!this.enabled) return;
    if (this.moveCooldown > 0) this.moveCooldown -= dt;

    if (Input.justPressed('up')) { this.move(-1); this.moveCooldown = 0.28; }
    else if (Input.justPressed('down')) { this.move(1); this.moveCooldown = 0.28; }
    else if (this.moveCooldown <= 0 && (Input.isDown('up') || Input.isDown('down'))) {
      this.move(Input.isDown('up') ? -1 : 1);      // key-repeat while held
      this.moveCooldown = 0.09;
    }

    const item = this.current;
    if (Input.justPressed('left') && item?.onLeft) { item.onLeft(item); Audio.playSfx('ui_move', { volume: 0.5 }); }
    if (Input.justPressed('right') && item?.onRight) { item.onRight(item); Audio.playSfx('ui_move', { volume: 0.5 }); }

    if (Input.justPressed('confirm') && item && !item.disabled) {
      Audio.playSfx('ui_select');
      (item.onSelect || this.onSelect)?.(item, this.index);
    }
    if (Input.justPressed('cancel')) {
      if (this.onCancel) { Audio.playSfx('ui_back'); this.onCancel(); }
    }
  }

  /** @param options.width when set, `value` is right-aligned to x + width. */
  render(renderer, x, y, { width = 0, color = PALETTE.bone, dimColor = PALETTE.dim, selectedColor = PALETTE.glow } = {}) {
    const ctx = renderer.ctx;
    this.items.forEach((item, i) => {
      const iy = y + i * this.spacing;
      const selected = i === this.index;
      const tone = item.disabled ? dimColor : selected ? selectedColor : color;
      Font.draw(ctx, item.label, x, iy, { color: tone });
      if (item.value !== undefined && item.value !== null) {
        Font.draw(ctx, String(item.value), x + width, iy, { color: item.disabled ? dimColor : color, align: 'right' });
      }
      if (selected) {
        const caret = Assets.image('ui_caret');
        const bob = Math.sin(this.caretPhase * 6) > 0 ? 0 : 1;
        if (caret) ctx.drawImage(caret, Math.round(x - 10 - bob), Math.round(iy + 2));
      }
    });
  }

  /** Height the list occupies, for centring panels around it. */
  get height() { return this.items.length * this.spacing; }
}
