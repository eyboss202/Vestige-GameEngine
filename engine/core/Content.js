import { PALETTE } from '../config/Constants.js';
import { Settings } from '../config/Settings.js';
import { Assets } from './AssetManager.js';

/**
 * The one seam between the engine and a game built on it.
 *
 * Nothing under engine/ imports anything under game/. Instead a game calls
 * defineGame() once, before `new Game()`, handing over its data tables and a
 * small config object; every engine module reads content back out of here
 * (getItem(), getArchetype(), Content.dialogue, ...). Swapping the game means
 * swapping what is passed in, never editing the engine.
 */

/** Used for any rarity id a game doesn't define, so items always have a colour. */
const DEFAULT_RARITY = Object.freeze({ id: 'common', name: 'Common', color: '#c7d1ce', weight: 100, statMultiplier: 1 });

/** Survival tuning used when a game omits `survival` (or some of its keys). */
const DEFAULT_SURVIVAL = Object.freeze({
  hungerDepleteSeconds: 60 * 14,
  thirstDepleteSeconds: 60 * 9,
  starveDamagePerSecond: 0.35,
  dehydrateDamagePerSecond: 0.55,
  exhaustedSpeedMultiplier: 0.72,
  regenThreshold: 40,
  passiveRegenPerSecond: 0.12,
  bleedDamagePerSecond: 0.5,
  respawnMeterFloor: 30,
});

function defaultConfig() {
  return {
    /** Namespace for localStorage keys (`<id>.save.N`, `<id>.settings`), so two
     *  games served from the same origin never read each other's saves. */
    id: 'game',
    title: 'UNTITLED',
    /** Map id a new game starts on, and the spawn point name inside it. */
    startMap: null,
    startSpawn: 'default',
    /** Music keys (manifest `music`) — null plays nothing. */
    menuMusic: null,
    chaseMusic: null,
    player: {
      /** Image keys (manifest `images`) for the player's 16x24 4x4 sheets. */
      sprite: 'player',
      deadSprite: null,
      /** Weapon category -> sheet with that weapon drawn in hand. */
      weaponSprites: {},
      /** Merged over GameState's default player block on every new game. */
      stats: {},
    },
    /** Portrait key -> column in the 32x32 `portraits` sheet (see DialogueBox). */
    portraits: {},
    /** Container type -> row in the 16x16 `containers` sheet (see Container). */
    containerRows: {},
    /** Item id treated as money by shops. */
    currency: null,
    /** Called with the GameScene right after a brand-new game starts —
     *  the place for an intro cutscene. Not called when loading a save. */
    onNewGame: null,
  };
}

export const Content = {
  config: defaultConfig(),
  manifest: { images: {}, sounds: {}, music: {}, maps: {} },
  items: {},
  weapons: {},
  enemies: {},
  dialogue: {},
  lootTables: {},
  rarities: {},
  shops: {},
  survival: { ...DEFAULT_SURVIVAL },
  /** Extra/override UI strings, merged over engine/config/locales.js per language. */
  locales: {},
  /** [{ code, label }] — replaces the engine's language list when non-empty. */
  languages: [],
};

/**
 * Registers a game with the engine. Call it once, before `new Game(canvas)`.
 *
 * @param {object} def
 * @param {string|URL} [def.baseUrl] where manifest paths are resolved from —
 *   usually `new URL('./', import.meta.url)` from the game's own entry module.
 * @param {object} [def.config] see defaultConfig() above for every key.
 * @param {object} [def.palette] colour overrides for the engine's UI theme.
 * @returns {typeof Content}
 */
export function defineGame(def = {}) {
  const base = defaultConfig();
  Content.config = {
    ...base,
    ...def.config,
    player: { ...base.player, ...def.config?.player },
  };
  for (const key of ['manifest', 'items', 'weapons', 'enemies', 'dialogue', 'lootTables', 'rarities', 'shops', 'locales']) {
    if (def[key]) Content[key] = def[key];
  }
  if (def.languages) Content.languages = def.languages;
  Content.survival = { ...DEFAULT_SURVIVAL, ...def.survival };
  if (def.palette) Object.assign(PALETTE, def.palette);
  if (def.baseUrl) {
    const url = String(def.baseUrl);
    Assets.basePath = url.endsWith('/') ? url : url + '/';
  }
  // Settings are namespaced per game, so they can only be read once we know which game this is.
  Settings.storageKey = storageKey('settings');
  Settings.load();
  return Content;
}

// -------------------------------------------------------------- lookups

/** Icon cell drawn for an item that doesn't name one. */
export const FALLBACK_ICON = 7;

export function getItem(id) { return Content.items[id] || null; }
export function allItems() { return Object.values(Content.items); }
export function getWeapon(id) { return Content.weapons[id] || null; }
export function getShop(id) { return Content.shops[id] || null; }
export function getDialogue(id) { return Content.dialogue[id] || null; }

/** Unknown ids fall back to the first archetype defined, so a typo in a map
 *  still spawns *something* (and says so) instead of crashing the load. */
export function getArchetype(id) {
  const def = Content.enemies[id];
  if (def) return def;
  const fallback = Object.values(Content.enemies)[0] || null;
  console.warn(`[Content] unknown enemy archetype "${id}"${fallback ? `, using "${fallback.id}"` : ''}`);
  return fallback;
}

export function getRarity(id) { return Content.rarities[id] || Content.rarities.common || DEFAULT_RARITY; }

/** Namespaced localStorage key for this game, e.g. `storageKey('settings')`. */
export function storageKey(suffix) { return `${Content.config.id}.${suffix}`; }
