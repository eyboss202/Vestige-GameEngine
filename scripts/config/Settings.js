import { SETTINGS_KEY } from './Constants.js';
import { DEFAULT_BINDINGS } from './Keybindings.js';

const DEFAULTS = {
  musicVolume: 0.7,
  sfxVolume: 0.8,
  masterVolume: 1.0,
  fullscreen: false,
  /** 'integer' keeps pixels perfectly square; 'fit' fills the window. */
  scaleMode: 'integer',
  /** Manual upscale factor, or 0 for "as large as the window allows". */
  scaleFactor: 0,
  language: 'en',
  showFps: false,
  screenShake: true,
  textSpeed: 1.0,
  keybindings: null, // filled from DEFAULT_BINDINGS on first run
};

/**
 * Player-facing options. Persisted to localStorage on every change so the
 * settings screen never needs an explicit "apply".
 */
class SettingsStore {
  constructor() {
    this.values = { ...DEFAULTS, keybindings: structuredClone(DEFAULT_BINDINGS) };
    this.listeners = new Set();
    this.load();
  }

  get(key) { return this.values[key]; }

  set(key, value) {
    if (this.values[key] === value) return;
    this.values[key] = value;
    this.save();
    for (const fn of this.listeners) fn(key, value);
  }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  load() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      // Merge rather than replace: new options added in a later build keep
      // their defaults instead of coming back undefined.
      this.values = { ...this.values, ...parsed };
      this.values.keybindings = { ...structuredClone(DEFAULT_BINDINGS), ...(parsed.keybindings || {}) };
    } catch (err) {
      console.warn('[Settings] could not read stored settings, using defaults', err);
    }
  }

  save() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.values));
    } catch (err) {
      console.warn('[Settings] could not persist settings', err);
    }
  }

  resetKeybindings() {
    this.values.keybindings = structuredClone(DEFAULT_BINDINGS);
    this.save();
    for (const fn of this.listeners) fn('keybindings', this.values.keybindings);
  }
}

export const Settings = new SettingsStore();
