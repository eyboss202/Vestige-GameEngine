import { Scene } from '../core/Scene.js';
import { Assets } from '../core/AssetManager.js';
import { MANIFEST } from '../config/manifest.js';
import { VIEW_W, VIEW_H, PALETTE } from '../config/Constants.js';
import { MainMenuScene } from './MainMenuScene.js';
import { Font } from '../ui/BitmapFont.js';
import { t } from '../core/I18n.js';

/** Preloads everything in the manifest behind a progress bar. */
export class BootScene extends Scene {
  constructor(game) {
    super(game);
    this.progress = 0;
    this.displayProgress = 0;
    this.done = false;
    this.holdTimer = 0.4;
    this.phase = 0;
  }

  enter() {
    Assets.loadManifest(MANIFEST, (p) => { this.progress = p; })
      .then(() => { this.done = true; })
      .catch((err) => { console.error('[Boot] asset load failed', err); this.done = true; });
  }

  update(dt) {
    this.phase += dt;
    // Ease the bar so a burst of fast loads still reads as motion.
    this.displayProgress += (this.progress - this.displayProgress) * Math.min(1, dt * 6);
    if (!this.done) return;
    this.holdTimer -= dt;
    if (this.holdTimer <= 0 && !this.game.scenes.isTransitioning()) {
      this.game.scenes.change(new MainMenuScene(this.game));
    }
  }

  render(renderer) {
    const ctx = renderer.ctx;
    renderer.rect(0, 0, VIEW_W, VIEW_H, PALETTE.void);

    const w = 120;
    const x = (VIEW_W - w) / 2;
    const y = VIEW_H / 2;
    renderer.rect(x, y, w, 3, '#1c2226');
    renderer.rect(x, y, Math.round(w * this.displayProgress), 3, PALETTE.glow);
    renderer.rect(x - 2, y - 2, 1, 7, PALETTE.concreteLight);
    renderer.rect(x + w + 1, y - 2, 1, 7, PALETTE.concreteLight);

    if (Assets.image('font_main')) {
      Font.draw(ctx, t('boot.loading') + '.'.repeat(1 + Math.floor(this.phase * 2) % 3), VIEW_W / 2, y - 20, {
        color: PALETTE.dim, align: 'center',
      });
    }
    renderer.vignette(0.6);
  }
}
