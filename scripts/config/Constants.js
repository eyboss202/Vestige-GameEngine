/**
 * Global, never-changing values. Anything the player can change lives in
 * Settings.js instead; anything the designer tunes per-content lives in /data.
 */

/** Internal render resolution, in pixels. Everything is drawn here, then
 *  upscaled with nearest-neighbour so the pixel grid stays intact. */
export const VIEW_W = 384;
export const VIEW_H = 216;

export const TILE = 16;

/** Fixed simulation step (seconds). The loop can render faster than this. */
export const FIXED_STEP = 1 / 60;
/** Never simulate more than this much time in one frame (tab-out protection). */
export const MAX_FRAME_TIME = 0.25;

/** Draw order for everything inside a map. */
export const LAYER = Object.freeze({
  GROUND: 0,
  DECOR: 1,
  ENTITY: 2,
  OVERHEAD: 3,
  PARTICLE: 4,
  LIGHT: 5,
  UI: 6,
});

export const DIR = Object.freeze({ DOWN: 'down', LEFT: 'left', RIGHT: 'right', UP: 'up' });
/** Sprite-sheet row index per direction. Keep sheets in this order. */
export const DIR_ROW = Object.freeze({ down: 0, left: 1, right: 2, up: 3 });

export const SAVE_PREFIX = 'vestige.save.';
export const SETTINGS_KEY = 'vestige.settings';
export const SAVE_VERSION = 2;
export const SAVE_SLOTS = 3;

/** Seconds of played (non-dialogue) time per in-game day. Drives NPC
 *  schedules (see entities/npc/NPC.js) off GameState.playtime. */
export const DAY_LENGTH = 600;

export const PALETTE = Object.freeze({
  void: '#07090b',
  ash: '#14181c',
  concrete: '#333c40',
  concreteLight: '#4a5559',
  bone: '#dde5e2',
  glow: '#7fe0a8',
  amber: '#e0a458',
  rust: '#8a4b2a',
  danger: '#c4553f',
  dim: '#6b7876',
});

export const DEBUG = Object.freeze({
  /** Toggled at runtime with F1 — draws hitboxes, collision grid, entity ids. */
  enabled: false,
});
