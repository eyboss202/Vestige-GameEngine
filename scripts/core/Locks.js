import { GameState } from './GameState.js';
import { getItem } from '../entities/items/ItemDatabase.js';
import { localised } from './I18n.js';

/**
 * Shared "is this locked, and can the player open it" check for portals,
 * doors and containers — one small module instead of three copies of the
 * same flag/key logic. A lock is a plain object:
 *
 *   { requiresFlag, requiresKey, consumeKey }
 *
 *   requiresFlag  world flag that must already be true — set by a story
 *                 event/cutscene, never by the player directly (see the
 *                 pre-existing `bunker` reveal trigger for the pattern).
 *   requiresKey   an inventory item id (see ItemDatabase.js `category: 'key'`)
 *                 the player must be carrying to open it themselves.
 *   consumeKey    if true, a successful unlock removes one key from the bag;
 *                 otherwise the same key can open every door/container it fits.
 *
 * `id` is whatever stable identifier the caller already has (a trigger's own
 * id, a container's entity id) — once a keyed lock is opened it's recorded as
 * world flag `unlocked:<id>` so the door/container stays open across saves
 * without re-checking the bag (or re-consuming the key) every time.
 */
export function isLocked(lock, id) {
  if (!lock) return false;
  if (id && GameState.getFlag(`unlocked:${id}`, false)) return false;
  if (lock.requiresFlag && !GameState.getFlag(lock.requiresFlag, false)) return true;
  if (lock.requiresKey && !GameState.inventory.has(lock.requiresKey, 1)) return true;
  return false;
}

/** Only meaningful for `requiresKey` locks — `requiresFlag` locks open on
 *  their own once the story sets the flag, there's nothing to "try".
 *  @returns true the instant it unlocks. */
export function tryUnlock(lock, id) {
  if (!lock?.requiresKey || !GameState.inventory.has(lock.requiresKey, 1)) return false;
  if (lock.consumeKey) GameState.inventory.remove(lock.requiresKey, 1);
  if (id) GameState.setFlag(`unlocked:${id}`, true);
  return true;
}

/** Localised name of whatever key a lock wants, for messages/prompts. */
export function keyName(lock) {
  const def = lock?.requiresKey && getItem(lock.requiresKey);
  return def ? localised(def.name) : '';
}
