import { Scene } from '../core/Scene.js';
import { ContainerUI } from '../ui/ContainerUI.js';
import { Audio } from '../systems/AudioSystem.js';

/** Thin scene wrapper around the loot-transfer widget — same shape as
 *  InventoryScene/ShopScene: a transparent overlay pushed on top of the
 *  running GameScene, popped on cancel. */
export class ContainerScene extends Scene {
  constructor(game) {
    super(game);
    this.transparent = true;
    this.container = null;
    this.ui = null;
  }

  enter({ container }) {
    this.container = container;
    this.ui = new ContainerUI(container);
    this.ui.open();
  }

  update(dt) {
    const closed = this.ui.update(dt);
    if (closed) {
      Audio.playSfx('ui_back');
      this.container.close();
      this.game.scenes.pop();
    }
  }

  render(renderer) { this.ui.render(renderer); }
}
