import { VIEW_W, VIEW_H, PALETTE } from '../config/Constants.js';
import { Font } from './BitmapFont.js';
import { panel } from './NineSlice.js';
import { GameState } from '../core/GameState.js';
import { Notifications } from '../systems/NotificationSystem.js';
import { t } from '../core/I18n.js';
import { Settings } from '../config/Settings.js';
import { drawItemIconFor } from './ItemIcon.js';

/** Health, stamina, area title, interaction prompt and toasts. */
export class HUD {
  constructor() {
    this.areaTitle = null;
    this.areaTimer = 0;
    this.phase = 0;
  }

  showArea(name, duration = 3.2) { this.areaTitle = name; this.areaTimer = duration; }

  update(dt) {
    this.phase += dt;
    if (this.areaTimer > 0) this.areaTimer -= dt;
    Notifications.update(dt);
  }

  render(renderer, scene) {
    const ctx = renderer.ctx;
    const stats = GameState.player;
    const maxHp = GameState.derivedStat('maxHp');
    const maxStamina = GameState.derivedStat('maxStamina');

    // --- vitals -----------------------------------------------------------
    const x = 8;
    const y = 8;
    const w = 58;
    ctx.fillStyle = 'rgba(7,9,11,0.7)';
    ctx.fillRect(x - 2, y - 2, w + 4, 12);
    renderer.outline(x - 2, y - 2, w + 4, 12, PALETTE.concreteLight);
    ctx.fillStyle = '#2a1b18';
    ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = stats.hp / maxHp < 0.3 ? PALETTE.danger : '#b8543f';
    ctx.fillRect(x, y, Math.round(w * (stats.hp / maxHp)), 4);
    ctx.fillStyle = '#1d2a26';
    ctx.fillRect(x, y + 5, w, 3);
    ctx.fillStyle = PALETTE.glow;
    ctx.fillRect(x, y + 5, Math.round(w * (stats.stamina / maxStamina)), 3);

    // --- survival meters ----------------------------------------------------
    const sy = y + 15;
    ctx.fillStyle = 'rgba(7,9,11,0.7)';
    ctx.fillRect(x - 2, sy - 2, w + 4, 9);
    renderer.outline(x - 2, sy - 2, w + 4, 9, PALETTE.concreteLight);
    ctx.fillStyle = '#2a2318';
    ctx.fillRect(x, sy, w, 3);
    ctx.fillStyle = stats.hunger <= 0 ? PALETTE.danger : PALETTE.amber;
    ctx.fillRect(x, sy, Math.round(w * (stats.hunger / stats.maxHunger)), 3);
    ctx.fillStyle = '#182430';
    ctx.fillRect(x, sy + 4, w, 3);
    ctx.fillStyle = stats.thirst <= 0 ? PALETTE.danger : '#5fa8d8';
    ctx.fillRect(x, sy + 4, Math.round(w * (stats.thirst / stats.maxThirst)), 3);

    // --- area title -------------------------------------------------------
    if (this.areaTimer > 0 && this.areaTitle) {
      const alpha = Math.min(1, this.areaTimer > 2.6 ? (3.2 - this.areaTimer) / 0.6 : Math.min(1, this.areaTimer / 0.8));
      ctx.save();
      ctx.globalAlpha = alpha;
      Font.draw(ctx, this.areaTitle, VIEW_W / 2, 18, { color: PALETTE.bone, align: 'center' });
      ctx.fillStyle = PALETTE.glow;
      ctx.fillRect(VIEW_W / 2 - 26, 32, 52, 1);
      ctx.restore();
    }

    // --- interaction prompt ----------------------------------------------
    const target = scene?.interactTarget;
    if (target && !scene.dialogueBox.active) {
      const label = t('hud.interact');
      const width = Font.measure(label) + 22;
      const px = Math.round(target.x - scene.camera.renderX - width / 2);
      const py = Math.round(target.y - scene.camera.renderY - (target.spriteH || 20) - 16 + Math.sin(this.phase * 4) * 1);
      panel(ctx, px, py, width, 18);
      Font.draw(ctx, 'Z', px + 6, py + 4, { color: PALETTE.glow });
      Font.draw(ctx, label, px + 16, py + 4, { color: PALETTE.bone });
    }

    // --- toasts -----------------------------------------------------------
    Notifications.queue.slice(-Notifications.maxVisible).forEach((note, i) => {
      const nw = Font.measure(note.text) + (note.itemId ? 26 : 14);
      const nx = VIEW_W - nw - 8;
      const ny = 8 + i * 22;
      const appear = Math.min(1, note.age * 6);
      const fade = Math.min(1, note.life * 2);
      ctx.save();
      ctx.globalAlpha = Math.min(appear, fade);
      panel(ctx, nx + (1 - appear) * 20, ny, nw, 18);
      let tx = nx + 7 + (1 - appear) * 20;
      if (note.itemId) { drawItemIconFor(ctx, note.itemId, tx - 2, ny + 1, 16); tx += 16; }
      Font.draw(ctx, note.text, tx, ny + 4, { color: note.color || PALETTE.bone });
      ctx.restore();
    });

    if (Settings.get('showFps')) {
      Font.draw(ctx, `${scene?.game?.fps ?? 0} FPS`, VIEW_W - 8, VIEW_H - 14, { color: PALETTE.dim, align: 'right' });
    }
  }
}
