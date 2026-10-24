import { VIEW_W, VIEW_H, PALETTE } from '../config/Constants.js';
import { Font } from './BitmapFont.js';
import { panel } from './NineSlice.js';
import { GameState } from '../core/GameState.js';
import { Notifications } from '../systems/NotificationSystem.js';
import { t } from '../core/I18n.js';
import { Settings } from '../config/Settings.js';
import { drawItemIconFor } from './ItemIcon.js';
import { Assets } from '../core/AssetManager.js';
import { getItem, getWeapon } from '../core/Content.js';
import { localised } from '../core/I18n.js';

/** Segments per meter row — fixed regardless of the stat's actual max, same
 *  abstraction Minecraft's hearts use (10 hearts always, however much max
 *  health a mob has). Each icon covers maxValue/SEGMENTS of the stat. */
const SEGMENTS = 10;
const ICON = 8;
/** Row index into assets/ui/hud_icons_placeholder.png (see tools/gen_art.py
 *  build_hud_icons — 4 rows x 3 cols of 8x8, cols = empty/half/full). Row 3
 *  (armor) is drawn only in the inventory screen (ui/InventoryUI.js) — the
 *  gameplay HUD stays to hp/hunger/thirst so it doesn't duplicate a value
 *  that's already one keypress away. */
const METER_ROW = { hp: 0, hunger: 1, thirst: 2 };

/** How long a changed segment stays highlighted (bounce + white flash). */
const FLASH_TIME = 0.35;

/** Splits `value/max` into SEGMENTS discrete empty/half/full states. */
function segmentsFor(value, max) {
  const filled = Math.max(0, Math.min(SEGMENTS, (value / max) * SEGMENTS));
  const states = new Array(SEGMENTS);
  for (let i = 0; i < SEGMENTS; i++) {
    const remaining = filled - i;
    states[i] = remaining >= 1 ? 2 : remaining >= 0.5 ? 1 : 0;   // 0 empty, 1 half, 2 full
  }
  return states;
}

/** Health, stamina, segmented survival meters, area title, interaction
 *  prompt and toasts. */
export class HUD {
  constructor() {
    this.areaTitle = null;
    this.areaTimer = 0;
    this.phase = 0;

    // Previous segment states + per-icon flash timers, one set per meter —
    // see updateMeter(). Lets a heart/ration/droplet visibly pop exactly
    // when it fills or empties, instead of redrawing statically every frame.
    this.prevSegments = { hp: null, hunger: null, thirst: null };
    this.flash = {
      hp: new Array(SEGMENTS).fill(0),
      hunger: new Array(SEGMENTS).fill(0),
      thirst: new Array(SEGMENTS).fill(0),
    };
  }

  showArea(name, duration = 3.2) { this.areaTitle = name; this.areaTimer = duration; }

  /** Diffs one meter's segment states against last frame's and starts a
   *  flash on whichever icons actually changed. */
  updateMeter(key, value, max, dt) {
    const states = segmentsFor(value, max);
    const prev = this.prevSegments[key];
    const flash = this.flash[key];
    for (let i = 0; i < SEGMENTS; i++) {
      if (prev && prev[i] !== states[i]) flash[i] = FLASH_TIME;
      else flash[i] = Math.max(0, flash[i] - dt);
    }
    this.prevSegments[key] = states;
    return states;
  }

  update(dt) {
    this.phase += dt;
    if (this.areaTimer > 0) this.areaTimer -= dt;
    Notifications.update(dt);

    const stats = GameState.player;
    this.hpStates = this.updateMeter('hp', stats.hp, GameState.derivedStat('maxHp'), dt);
    this.hungerStates = this.updateMeter('hunger', stats.hunger, stats.maxHunger, dt);
    this.thirstStates = this.updateMeter('thirst', stats.thirst, stats.maxThirst, dt);
  }

  /** One row of segmented icons. `states`/`flash` are SEGMENTS-long arrays
   *  from updateMeter(); a flashing icon bounces up and flashes white. */
  drawMeter(ctx, sheet, row, x, y, states, flash) {
    if (!sheet) return;
    for (let i = 0; i < SEGMENTS; i++) {
      const flashT = flash[i] / FLASH_TIME;
      const bounce = flashT > 0 ? Math.sin(flashT * Math.PI) * 2 : 0;
      const dx = x + i * ICON;
      const dy = y - bounce;
      ctx.drawImage(sheet, states[i] * ICON, row * ICON, ICON, ICON, dx, Math.round(dy), ICON, ICON);
      if (flashT > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = flashT * 0.8;
        ctx.drawImage(sheet, states[i] * ICON, row * ICON, ICON, ICON, dx, Math.round(dy), ICON, ICON);
        ctx.restore();
      }
    }
  }

  /** Clip/reserve for whatever's equipped, plus a "RELOADING" cue while
   *  Player.reloadTimer is running — see entities/player/Player.js reload(). */
  renderAmmo(ctx, scene, x, y) {
    const weaponItemId = GameState.equipment.get('weapon');
    const itemDef = weaponItemId && getItem(weaponItemId);
    const weapon = itemDef?.weaponId ? getWeapon(itemDef.weaponId) : null;
    if (!weapon?.ammoType) return;

    const clip = GameState.getWeaponAmmo(weaponItemId, weapon.magazineSize);
    const reserve = GameState.inventory.quantity(weapon.ammoType);
    const label = `${t('hud.ammo')} ${clip}/${weapon.magazineSize} (${reserve})`;
    Font.draw(ctx, label, x, y, { color: clip <= 0 ? PALETTE.danger : PALETTE.bone });

    const player = scene?.player;
    if (player?.reloadTimer > 0) {
      Font.draw(ctx, t('notify.reloading'), x, y + Font.lineHeight(), { color: PALETTE.amber });
    } else {
      const max = itemDef.durability?.max;
      if (max) {
        const durability = GameState.getDurability(weaponItemId, max);
        const broken = durability <= 0;
        const label2 = `${localised(itemDef.name)}: ${broken ? t('inventory.broken') : Math.ceil((durability / max) * 100) + '%'}`;
        Font.draw(ctx, label2, x, y + Font.lineHeight(), { color: broken ? PALETTE.danger : PALETTE.dim });
      }
    }
  }

  render(renderer, scene) {
    const ctx = renderer.ctx;
    const maxStamina = GameState.derivedStat('maxStamina');
    const stats = GameState.player;
    const sheet = Assets.image('hud_icons');

    // --- stamina (still a continuous bar — it recovers/drains too fast per
    // frame for segments to read cleanly) --------------------------------
    const x = 8;
    const y = 8;
    const barW = SEGMENTS * ICON;
    const weaponItemId = GameState.equipment.get('weapon');
    const hasRangedWeapon = !!getItem(weaponItemId)?.weaponId && !!getWeapon(getItem(weaponItemId).weaponId)?.ammoType;
    const panelH = ICON * 3 + 16 + (hasRangedWeapon ? Font.lineHeight() * 2 + 2 : 0);
    ctx.fillStyle = 'rgba(7,9,11,0.7)';
    ctx.fillRect(x - 2, y - 2, barW + 4, panelH);
    renderer.outline(x - 2, y - 2, barW + 4, panelH, PALETTE.concreteLight);

    const staminaY = y;
    ctx.fillStyle = '#1d2a26';
    ctx.fillRect(x, staminaY, barW, 3);
    ctx.fillStyle = PALETTE.glow;
    ctx.fillRect(x, staminaY, Math.round(barW * (stats.stamina / maxStamina)), 3);

    // --- segmented survival meters: hearts / rations / droplets ----------
    this.drawMeter(ctx, sheet, METER_ROW.hp, x, y + 6, this.hpStates || segmentsFor(stats.hp, GameState.derivedStat('maxHp')), this.flash.hp);
    this.drawMeter(ctx, sheet, METER_ROW.hunger, x, y + 6 + ICON + 2, this.hungerStates || segmentsFor(stats.hunger, stats.maxHunger), this.flash.hunger);
    this.drawMeter(ctx, sheet, METER_ROW.thirst, x, y + 6 + (ICON + 2) * 2, this.thirstStates || segmentsFor(stats.thirst, stats.maxThirst), this.flash.thirst);

    // --- ammo / reload readout, only while a ranged weapon is equipped ----
    // Armor is intentionally not shown here — see ui/InventoryUI.js
    // renderArmorMeter(), the only place it's displayed now.
    const nextRowY = y + 6 + (ICON + 2) * 3;
    this.renderAmmo(ctx, scene, x, nextRowY + 3);

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
      const label = t(target.promptKey || 'hud.interact');
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
