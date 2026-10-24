import { Scene } from '../core/Scene.js';
import { VIEW_W, VIEW_H, PALETTE } from '../config/Constants.js';
import { Font } from '../ui/BitmapFont.js';
import { MenuList } from '../ui/MenuList.js';
import { t } from '../core/I18n.js';
import { GameState } from '../core/GameState.js';
import { Audio } from '../systems/AudioSystem.js';
import { GameScene } from './GameScene.js';
import { MainMenuScene } from './MainMenuScene.js';
import { SaveSlotScene } from './SaveSlotScene.js';

/**
 * Full-stop game-over screen — replaces the entire scene stack (see
 * GameScene's `player:down` handler), so nothing from the failed run keeps
 * ticking underneath it. Exactly three options: load a save,
 * return to the title, or quit.
 */
export class DeathScene extends Scene {
  enter() {
    // Cross-fades from whatever the map was playing straight into the
    // somber drone (tools/gen_audio.py death_ambient()) rather than cutting
    // to silence — see AudioSystem.playMusic(), which handles the fade.
    Audio.playMusic('death_ambient', { fade: 2, volume: 0.8 });
    this.fade = 0;
    this.message = null;
    this.menu = new MenuList([
      { label: t('death.load'), onSelect: () => this.loadSave() },
      { label: t('death.menu'), onSelect: () => this.toMenu() },
      { label: t('death.quit'), onSelect: () => this.quit() },
    ], { spacing: 18 });
  }

  /** Same load flow MainMenuScene's "Continue" uses — GameState.deserialize()
   *  already resets before merging, so no leftover run state survives. */
  loadSave() {
    this.game.scenes.push(new SaveSlotScene(this.game), {
      mode: 'load',
      onLoaded: () => this.game.scenes.change(new GameScene(this.game), { fromSave: true }),
    });
  }

  toMenu() {
    GameState.reset();
    this.game.scenes.change(new MainMenuScene(this.game));
  }

  quit() {
    // Browsers only let a page close itself if it opened itself — same
    // best-effort pattern MainMenuScene.exitGame() uses.
    window.close();
    this.message = t('menu.exitDone');
  }

  update(dt) {
    this.fade = Math.min(1, this.fade + dt / 1.4);
    this.menu.update(dt);
  }

  render(renderer) {
    const ctx = renderer.ctx;
    ctx.fillStyle = `rgba(7,9,11,${0.92 * this.fade})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    ctx.save();
    ctx.globalAlpha = this.fade;
    Font.drawScaled(ctx, t('death.title'), VIEW_W / 2, VIEW_H / 2 - 56, 3, { color: PALETTE.danger, align: 'center' });
    this.menu.render(renderer, VIEW_W / 2 - 40, VIEW_H / 2 - 4, { width: 80 });
    if (this.message) Font.draw(ctx, this.message, VIEW_W / 2, VIEW_H - 30, { color: PALETTE.amber, align: 'center' });
    ctx.restore();
  }
}
