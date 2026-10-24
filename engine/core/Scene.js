/**
 * Base class for every screen in the game. Scenes live on a stack: a pause menu
 * is simply a transparent scene pushed on top of the running world.
 */
export class Scene {
  constructor(game) {
    this.game = game;
    /** When true, the scene below keeps rendering underneath this one. */
    this.transparent = false;
    /** When true, the scene below keeps updating too (rarely wanted). */
    this.updateBelow = false;
  }

  /** Called when the scene becomes the top of the stack. */
  enter(params = {}) {}
  /** Called when the scene is removed from the stack. */
  exit() {}
  /** Called when another scene is pushed on top of this one. */
  suspend() {}
  /** Called when the scene above is popped and this one is on top again. */
  resume() {}

  update(dt) {}
  render(renderer) {}
}
