import { Scene } from '../core/Scene.js';
import { VIEW_W, VIEW_H, PALETTE } from '../config/Constants.js';
import { Font } from '../ui/BitmapFont.js';
import { panel } from '../ui/NineSlice.js';
import { MenuList } from '../ui/MenuList.js';
import { t } from '../core/I18n.js';
import { GameState } from '../core/GameState.js';
import { SettingsScene } from './SettingsScene.js';
import { InventoryScene } from './InventoryScene.js';
import { formatTime } from './SaveSlotScene.js';
import { MainMenuScene } from './MainMenuScene.js';

/** Transparent overlay: the world keeps rendering, frozen, underneath. */
export class PauseScene extends Scene {
  constructor(game) {
    super(game);
    this.transparent = true;
    this.menu = null;
    this.confirmQuit = false;
  }

  enter() { this.build(); }
  resume() { this.build(); }

  build() {
    // No "Save" entry here on purpose — phones (entities/Phone.js) are the
    // only way to save, by design. Loading/quitting are unaffected.
    this.menu = new MenuList([
      { label: t('pause.resume'), onSelect: () => this.game.scenes.pop() },
      { label: t('pause.inventory'), onSelect: () => this.game.scenes.push(new InventoryScene(this.game)) },
      { label: t('pause.settings'), onSelect: () => this.game.scenes.push(new SettingsScene(this.game)) },
      { label: t('pause.quit'), onSelect: () => this.quit() },
    ], { spacing: 16, onCancel: () => this.game.scenes.pop() });
  }

  quit() {
    this.game.scenes.change(new MainMenuScene(this.game));
  }

  update(dt) { this.menu.update(dt); }

  render(renderer) {
    const ctx = renderer.ctx;
    ctx.fillStyle = 'rgba(7,9,11,0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    const w = 150;
    const h = this.menu.height + 44;
    const x = (VIEW_W - w) / 2;
    const y = (VIEW_H - h) / 2;
    panel(ctx, x, y, w, h);
    Font.draw(ctx, t('pause.title'), x + 12, y + 10, { color: PALETTE.glow });
    Font.draw(ctx, formatTime(GameState.playtime), x + w - 12, y + 10, { color: PALETTE.dim, align: 'right' });
    this.menu.render(renderer, x + 24, y + 30, { width: w - 48 });
    Font.draw(ctx, t('pause.quitConfirm'), VIEW_W / 2, y + h + 6, { color: PALETTE.dim, align: 'center' });
  }
}
