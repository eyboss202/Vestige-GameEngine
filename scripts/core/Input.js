import { Settings } from '../config/Settings.js';
import { Events } from './EventBus.js';

/**
 * Turns raw key events into named actions ('up', 'interact', ...).
 * Nothing in the game logic ever reads a KeyboardEvent directly, which is what
 * makes rebinding — and, later, a gamepad layer — a config change instead of a
 * refactor.
 */
class InputManager {
  constructor() {
    this.down = new Set();        // actions currently held
    this.pressed = new Set();     // actions that went down this frame
    this.released = new Set();
    this.rawDown = new Set();     // physical key codes
    this.captureFn = null;        // set while the rebinding screen is open
    this.anyKeyThisFrame = false;
    this.map = new Map();
    this.rebuild();
    Settings.onChange((key) => { if (key === 'keybindings') this.rebuild(); });
  }

  /** Rebuilds the code -> action lookup from the current bindings. */
  rebuild() {
    this.map.clear();
    const bindings = Settings.get('keybindings') || {};
    for (const [action, codes] of Object.entries(bindings)) {
      for (const code of codes) {
        if (!this.map.has(code)) this.map.set(code, []);
        this.map.get(code).push(action);
      }
    }
  }

  attach(target = window) {
    target.addEventListener('keydown', (e) => this.onKeyDown(e));
    target.addEventListener('keyup', (e) => this.onKeyUp(e));
    // Holding a key while the tab loses focus would otherwise stick forever.
    window.addEventListener('blur', () => this.clear());
  }

  onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
    if (this.captureFn) {
      e.preventDefault();
      const fn = this.captureFn;
      this.captureFn = null;
      fn(e.code);
      return;
    }
    if (e.repeat) return;
    this.rawDown.add(e.code);
    this.anyKeyThisFrame = true;
    Events.emit('input:any');
    for (const action of this.map.get(e.code) || []) {
      if (!this.down.has(action)) this.pressed.add(action);
      this.down.add(action);
    }
  }

  onKeyUp(e) {
    this.rawDown.delete(e.code);
    for (const action of this.map.get(e.code) || []) {
      // Only release if no other bound key for this action is still held.
      const stillHeld = [...this.rawDown].some((code) => (this.map.get(code) || []).includes(action));
      if (!stillHeld) { this.down.delete(action); this.released.add(action); }
    }
  }

  /** Waits for the next physical key press and hands its code back. */
  captureNextKey(fn) { this.captureFn = fn; }

  isDown(action) { return this.down.has(action); }
  justPressed(action) { return this.pressed.has(action); }
  justReleased(action) { return this.released.has(action); }
  anyPressed() { return this.anyKeyThisFrame; }

  /** Normalised movement vector from the four direction actions. */
  axis() {
    let x = (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
    let y = (this.isDown('down') ? 1 : 0) - (this.isDown('up') ? 1 : 0);
    if (x && y) { const inv = Math.SQRT1_2; x *= inv; y *= inv; }
    return { x, y };
  }

  /** Called by the game loop after every frame. */
  endFrame() {
    this.pressed.clear();
    this.released.clear();
    this.anyKeyThisFrame = false;
  }

  clear() { this.down.clear(); this.rawDown.clear(); this.pressed.clear(); this.released.clear(); }
}

export const Input = new InputManager();
