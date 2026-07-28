import { Scene } from '../core/Scene.js';
import { VIEW_W, VIEW_H, PALETTE, TILE } from '../config/Constants.js';
import { Font } from '../ui/BitmapFont.js';
import { MenuList } from '../ui/MenuList.js';
import { Assets } from '../core/AssetManager.js';
import { Audio } from '../systems/AudioSystem.js';
import { Save } from '../systems/SaveSystem.js';
import { GameState } from '../core/GameState.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { t } from '../core/I18n.js';
import { GameScene } from './GameScene.js';
import { SettingsScene } from './SettingsScene.js';
import { SaveSlotScene } from './SaveSlotScene.js';

/**
 * Title screen.
 *
 * The one deliberate flourish: the logo is lit like a failing strip light —
 * it stutters on a noise curve and a horizontal sync band rolls down the
 * screen. Everything else stays quiet so that reads as the signature.
 */
export class MainMenuScene extends Scene {
  constructor(game) {
    super(game);
    this.phase = 0;
    this.scroll = 0;
    this.roll = -40;
    this.flicker = 1;
    this.particles = new ParticleSystem(120);
    this.fakeCamera = { renderX: 0, renderY: 0, x: 0, y: 0, viewW: VIEW_W, viewH: VIEW_H };
    this.menu = null;
    this.message = null;
  }

  enter() {
    Audio.playMusic('menu_theme', { fade: 2.2, volume: 0.9 });
    this.particles.setAmbient({ interval: 0.14, driftX: 5, driftY: 7, life: 6, color: '#8fb0a8', alpha: 0.28 });
    this.buildMenu();
  }

  buildMenu() {
    const hasSave = Save.hasAny();
    this.menu = new MenuList([
      { label: t('menu.newGame'), onSelect: () => this.newGame() },
      { label: t('menu.continue'), disabled: !hasSave, onSelect: () => this.continueGame() },
      { label: t('menu.settings'), onSelect: () => this.game.scenes.push(new SettingsScene(this.game)) },
      { label: t('menu.exit'), onSelect: () => this.exitGame() },
    ], { spacing: 17 });
  }

  newGame() {
    GameState.reset();
    this.game.scenes.change(new GameScene(this.game), { fresh: true });
  }

  continueGame() {
    this.game.scenes.push(new SaveSlotScene(this.game), {
      mode: 'load',
      onLoaded: () => this.game.scenes.change(new GameScene(this.game), { fromSave: true }),
    });
  }

  exitGame() {
    // Browsers only let a page close itself if it opened itself, so say so.
    window.close();
    this.message = t('menu.exitDone');
  }

  resume() { this.buildMenu(); }

  update(dt) {
    this.phase += dt;
    this.scroll += dt * 5;
    this.roll += dt * 34;
    if (this.roll > VIEW_H + 40) this.roll = -40;
    // Two detuned sines read as an unreliable tube; random() reads as static.
    const n = Math.sin(this.phase * 9.3) * 0.5 + Math.sin(this.phase * 23.7) * 0.5;
    this.flicker = 0.82 + 0.18 * n + (Math.random() < 0.012 ? -0.5 : 0);
    this.particles.update(dt, this.fakeCamera);
    this.menu.update(dt);
  }

  render(renderer) {
    const ctx = renderer.ctx;
    renderer.rect(0, 0, VIEW_W, VIEW_H, '#080b0d');

    // Slowly drifting floor pattern, kept far back with low alpha.
    const tileset = Assets.image('tileset');
    if (tileset) {
      ctx.save();
      ctx.globalAlpha = 0.16;
      const offset = Math.floor(this.scroll) % TILE;
      for (let y = -TILE; y < VIEW_H + TILE; y += TILE) {
        for (let x = -TILE; x < VIEW_W + TILE; x += TILE) {
          const variant = ((x + y) / TILE) % 3 === 0 ? 2 : 1;
          ctx.drawImage(tileset, (variant % 8) * TILE, Math.floor(variant / 8) * TILE, TILE, TILE,
            x + offset, y + offset, TILE, TILE);
        }
      }
      ctx.restore();
    }

    this.particles.render(ctx, this.fakeCamera);

    // Title
    const titleY = 44;
    ctx.save();
    ctx.globalAlpha = Math.max(0.15, this.flicker);
    Font.drawScaled(ctx, 'VESTIGE', VIEW_W / 2, titleY, 3, { color: PALETTE.bone, align: 'center' });
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.35 * this.flicker;
    Font.drawScaled(ctx, 'VESTIGE', VIEW_W / 2 + 1, titleY, 3, { color: PALETTE.glow, align: 'center' });
    ctx.restore();
    Font.draw(ctx, t('menu.subtitle'), VIEW_W / 2, titleY + 42, { color: PALETTE.dim, align: 'center' });

    // Sync band rolling down the screen
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const grad = ctx.createLinearGradient(0, this.roll - 18, 0, this.roll + 18);
    grad.addColorStop(0, 'rgba(127,224,168,0)');
    grad.addColorStop(0.5, 'rgba(127,224,168,0.055)');
    grad.addColorStop(1, 'rgba(127,224,168,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, this.roll - 18, VIEW_W, 36);
    ctx.restore();

    this.menu.render(renderer, VIEW_W / 2 - 34, 128, { width: 68 });

    if (this.message) Font.draw(ctx, this.message, VIEW_W / 2, VIEW_H - 30, { color: PALETTE.amber, align: 'center' });
    Font.draw(ctx, 'Z / ENTER', 8, VIEW_H - 14, { color: PALETTE.dim });
    Font.draw(ctx, 'F1 debug  F11 fullscreen', VIEW_W - 8, VIEW_H - 14, { color: PALETTE.dim, align: 'right' });

    renderer.vignette(0.55);
  }
}
