import { LOCALES, LANGUAGES } from '../config/locales.js';
import { Settings } from '../config/Settings.js';
import { Content } from './Content.js';

/**
 * Every string shown to the player goes through t(). The engine ships its own
 * UI strings (config/locales.js); a game's `locales` (core/Content.js) are
 * checked first, so it can override any of them or add its own keys. Lookup
 * falls back to English, then to the key itself.
 */
export function t(key, params) {
  const lang = Settings.get('language') || 'en';
  let text = Content.locales[lang]?.[key] ?? LOCALES[lang]?.[key]
    ?? Content.locales.en?.[key] ?? LOCALES.en[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) text = text.replaceAll(`{${k}}`, v);
  return text;
}

/** Picks the right field out of a localised content object: { en, pt }. */
export function localised(value, fallback = '') {
  if (value == null) return fallback;
  if (typeof value === 'string') return value;
  const lang = Settings.get('language') || 'en';
  return value[lang] ?? value.en ?? fallback;
}

/** Languages the settings screen cycles through: the game's list if it gave one. */
export function languages() {
  return Content.languages.length ? Content.languages : LANGUAGES;
}
