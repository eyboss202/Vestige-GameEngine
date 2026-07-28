import { LOCALES } from '../config/locales.js';
import { Settings } from '../config/Settings.js';

/**
 * Every string shown to the player goes through t(). Adding a language means
 * adding an object to locales.js — no engine change.
 */
export function t(key, params) {
  const lang = Settings.get('language') || 'en';
  const table = LOCALES[lang] || LOCALES.en;
  let text = table[key] ?? LOCALES.en[key] ?? key;
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
