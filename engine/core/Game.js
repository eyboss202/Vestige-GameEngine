import { FIXED_STEP, MAX_FRAME_TIME, DEBUG } from '../config/Constants.js';
import { Renderer } from './Renderer.js';
import { SceneManager } from './SceneManager.js';
import { Input } from './Input.js';
import { Events } from './EventBus.js';
import { GameState } from './GameState.js';
import { Audio } from '../systems/AudioSystem.js';
import { Settings } from '../config/Settings.js';

/**
 * Ties the pieces together and runs the loop. Simulation is stepped at a fixed
 * rate and rendering happens once per animation frame, so physics stays
 * identical on a 60Hz laptop and a 240Hz monitor.
 */
export class Game {
  constructor(canvas) {
    this.renderer = new Renderer(canvas);
    this.scenes = new SceneManager(this);
    this.accumulator = 0;
    this.lastTime = 0;
    this.running = false;
    this.fps = 0;
    this.fpsTimer = 0;
    this.fpsFrames = 0;
    this.debug = DEBUG.enabled;

    Input.attach(window);
    this.installGlobalKeys();
    this.installFullscreenSync();
  }

  installGlobalKeys() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F1') { this.debug = !this.debug; e.preventDefault(); }
      if (e.code === 'F11') { e.preventDefault(); this.toggleFullscreen(); }
      // Browsers only allow audio after a real gesture — this is that gesture.
      Audio.unlock();
    }, { passive: false });
    window.addEventListener('pointerdown', () => Audio.unlock());
  }

  installFullscreenSync() {
    document.addEventListener('fullscreenchange', () => {
      Settings.set('fullscreen', !!document.fullscreenElement);
      this.renderer.resize();
    });
    Settings.onChange((key, value) => {
      if (key !== 'fullscreen') return;
      if (value && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
      if (!value && document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    });
  }

  toggleFullscreen() { Settings.set('fullscreen', !Settings.get('fullscreen')); }

  start(scene, params) {
    this.scenes.change(scene, params, { fade: false });
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  frame(now) {
    if (!this.running) return;
    let delta = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (delta > MAX_FRAME_TIME) delta = MAX_FRAME_TIME;   // tab was hidden

    this.accumulator += delta;
    let steps = 0;
    while (this.accumulator >= FIXED_STEP && steps < 5) {
      this.scenes.update(FIXED_STEP);
      GameState.playtime += FIXED_STEP;
      this.accumulator -= FIXED_STEP;
      steps++;
      Input.endFrame();
    }
    // If the machine cannot keep up, drop the backlog instead of spiralling.
    if (steps === 5) this.accumulator = 0;

    this.renderer.begin();
    this.scenes.render(this.renderer);
    this.renderer.end();

    this.fpsFrames++;
    this.fpsTimer += delta;
    if (this.fpsTimer >= 0.5) {
      this.fps = Math.round(this.fpsFrames / this.fpsTimer);
      this.fpsFrames = 0;
      this.fpsTimer = 0;
      Events.emit('debug:fps', this.fps);
    }

    requestAnimationFrame((t) => this.frame(t));
  }

  stop() { this.running = false; }
}
