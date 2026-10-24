/**
 * Shared test fixtures. The engine runs in Node without a DOM — only rendering,
 * input and audio need a browser — so systems can be tested directly.
 *
 * Every test file runs in its own process (node --test), so the engine's
 * singletons (GameState, Dialogue, Settings...) start fresh per file.
 */
import { defineGame } from '../engine/index.js';

/** Minimal in-memory stand-in for window.localStorage. */
export function installMemoryStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
  return store;
}

/** A tiny, self-contained game — just enough content to exercise the systems. */
export const FIXTURE = {
  config: {
    id: 'test-game',
    title: 'TEST',
    startMap: 'room',
    currency: 'coin',
    player: { stats: { maxHp: 30, hp: 30 } },
  },
  items: {
    medkit: {
      id: 'medkit', category: 'consumable', stackSize: 5, consumable: true, value: 10,
      name: { en: 'Medkit', pt: 'Kit medico' },
      onUse: ({ state }) => {
        if (state.player.hp >= state.derivedStat('maxHp')) return false;
        state.player.hp = Math.min(state.derivedStat('maxHp'), state.player.hp + 10);
        return true;
      },
    },
    coin: { id: 'coin', category: 'currency', stackSize: 99, consumable: false, name: 'Coin' },
    rock: { id: 'rock', category: 'material', stackSize: 10, consumable: false, weight: 2, value: 3, name: 'Rock' },
    vest: { id: 'vest', category: 'equipment', stackSize: 1, slot: 'armor', bonus: { armor: 3, maxHp: 5 }, name: 'Vest' },
    hat: { id: 'hat', category: 'equipment', stackSize: 1, slot: 'helmet', bonus: { armor: 1 }, name: 'Hat' },
    gate_key: { id: 'gate_key', category: 'key', stackSize: 1, name: { en: 'Gate key', pt: 'Chave do portao' } },
    letter: { id: 'letter', category: 'quest', name: 'Letter' },   // no stackSize: defaults to 1
  },
  enemies: {
    slime: { id: 'slime', sprite: 'enemy_slime', hp: 5, lootTable: 'slime' },
    bat: { id: 'bat', sprite: 'enemy_bat', hp: 3 },
  },
  lootTables: {
    slime: { rolls: 2, entries: [{ itemId: null, weight: 1 }, { itemId: 'coin', weight: 1, qty: [2, 4] }] },
  },
  rarities: {
    common: { id: 'common', color: '#ffffff', weight: 90 },
    rare: { id: 'rare', color: '#5fa8d8', weight: 10 },
  },
  shops: {
    general: {
      id: 'general', buyMultiplier: 1.5, sellMultiplier: 0.5,
      sells: [{ itemId: 'medkit', price: 20, stock: 3 }], buysCategories: ['material'],
    },
  },
  dialogue: {
    guard: {
      branches: [{ ifFlag: 'met_guard', equals: true, next: 'again' }],
      start: 'hello',
      nodes: {
        hello: { text: { en: 'Halt.', pt: 'Alto.' }, set: { met_guard: true }, next: 'ask' },
        ask: {
          text: 'Business?',
          choices: [
            { text: 'Trade', next: null, emit: 'shop:open' },
            { text: 'Show pass', next: 'pass', requires: 'has_pass' },
            { text: 'Leave', next: null, set: { guard_annoyed: true } },
          ],
        },
        pass: { text: 'Go on.', next: null },
        again: { text: 'You again.', next: null },
      },
    },
  },
  survival: { hungerDepleteSeconds: 100 },
  locales: {
    en: { 'menu.subtitle': 'a test', 'menu.newGame': 'Begin' },
  },
};

/** Registers FIXTURE (optionally overridden) with the engine.
 *  @returns the in-memory storage backing localStorage, for inspection. */
export function setupGame(overrides = {}) {
  const storage = installMemoryStorage();
  defineGame({ ...FIXTURE, ...overrides });
  return storage;
}
