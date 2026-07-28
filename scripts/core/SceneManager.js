import { Scene } from './Scene.js';
import { Events } from './EventBus.js';

/**
 * Scene stack with built-in fade transitions. Every change is queued and runs
 * between frames, so a scene can safely ask to be replaced from inside its own
 * update without pulling the rug from under the loop.
 */
export class SceneManager {
  constructor(game) {
    this.game = game;
    this.stack = [];
    this.pending = null;
    this.fade = 0;          // 0 = clear, 1 = fully black
    this.fadeDir = 0;       // -1 fading in, +1 fading out
    this.fadeSpeed = 2.6;
    this.fadeColor = '#07090b';
    this.onFadeOut = null;
  }

  get current() { return this.stack[this.stack.length - 1] || null; }

  /** Replaces the whole stack, optionally behind a fade. */
  change(scene, params = {}, { fade = true, color = '#07090b' } = {}) {
    const apply = () => {
      for (const s of [...this.stack].reverse()) s.exit();
      this.stack = [];
      this.stack.push(scene);
      scene.enter(params);
      Events.emit('scene:changed', { scene: scene.constructor.name });
    };
    if (fade) this.transition(apply, color); else apply();
  }

  push(scene, params = {}) {
    this.current?.suspend();
    this.stack.push(scene);
    scene.enter(params);
    Events.emit('scene:pushed', { scene: scene.constructor.name });
  }

  pop() {
    const scene = this.stack.pop();
    scene?.exit();
    this.current?.resume();
    Events.emit('scene:popped', { scene: scene?.constructor.name });
    return scene;
  }

  /** Fades out, runs `fn`, fades back in. */
  transition(fn, color = '#07090b') {
    this.fadeColor = color;
    this.fadeDir = 1;
    this.onFadeOut = fn;
  }

  update(dt) {
    if (this.fadeDir !== 0) {
      this.fade += this.fadeDir * this.fadeSpeed * dt;
      if (this.fade >= 1 && this.fadeDir > 0) {
        this.fade = 1;
        this.fadeDir = -1;
        const fn = this.onFadeOut;
        this.onFadeOut = null;
        fn?.();
      } else if (this.fade <= 0 && this.fadeDir < 0) {
        this.fade = 0;
        this.fadeDir = 0;
      }
    }

    // Snapshot first: a scene is allowed to push or pop from inside update(),
    // and the loop must not trip over the stack changing underneath it.
    const snapshot = [...this.stack];
    for (let i = snapshot.length - 1; i >= 0; i--) {
      const isTop = i === snapshot.length - 1;
      if (isTop || snapshot[i + 1].updateBelow) snapshot[i].update(dt);
      else break;
    }
  }

  render(renderer) {
    // Find the deepest scene that still needs drawing (first opaque one from top).
    let start = this.stack.length - 1;
    while (start > 0 && this.stack[start].transparent) start--;
    for (let i = start; i < this.stack.length; i++) this.stack[i].render(renderer);
    if (this.fade > 0) renderer.flash(this.fadeColor, this.fade);
  }

  isTransitioning() { return this.fadeDir !== 0; }
}
