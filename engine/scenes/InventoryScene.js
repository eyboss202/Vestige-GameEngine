import { Scene } from '../core/Scene.js';
import { InventoryUI } from '../ui/InventoryUI.js';
import { Audio } from '../systems/AudioSystem.js';
import { Dialogue } from '../systems/DialogueSystem.js';

/** Thin scene wrapper around the inventory widget. */
export class InventoryScene extends Scene {
  constructor(game) {
    super(game);
    this.transparent = true;
    this.ui = new InventoryUI();
  }

  enter() { this.ui.open(); }

  update(dt) {
    // Items like traps need the live world (position, entity list) to place
    // themselves — find the running GameScene underneath this overlay.
    const world = this.game.scenes.stack.find((s) => s.player);
    const closed = this.ui.update(dt, { scene: world, entity: world?.player });
    if (closed) Audio.playSfx('ui_back');
    if (closed || Dialogue.active) this.game.scenes.pop();
    // A readable item (see systems/ItemEffects.js `readable()`) starts a dialogue
    // that only GameScene.update() advances — surface it even if this screen
    // was opened from Pause, so the conversation isn't left frozen underneath
    // another overlay.
    if (Dialogue.active && world) {
      while (this.game.scenes.stack.length > 1 && this.game.scenes.current !== world) this.game.scenes.pop();
    }
  }

  render(renderer) { this.ui.render(renderer); }
}
