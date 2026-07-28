import { SAVE_PREFIX, SAVE_SLOTS, SAVE_VERSION } from '../config/Constants.js';
import { GameState } from '../core/GameState.js';
import { Events } from '../core/EventBus.js';

/**
 * Slot-based persistence. The payload is whatever GameState.serialize() returns,
 * wrapped in a small envelope with a version number, so old saves can be
 * migrated instead of discarded when the format grows.
 */
class SaveSystem {
  key(slot) { return `${SAVE_PREFIX}${slot}`; }

  save(slot, extra = {}) {
    const payload = {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      preview: {
        map: GameState.currentMap,
        playtime: Math.round(GameState.playtime),
        hp: GameState.player.hp,
        maxHp: GameState.player.maxHp,
      },
      state: GameState.serialize(),
      ...extra,
    };
    try {
      localStorage.setItem(this.key(slot), JSON.stringify(payload));
      Events.emit('save:written', { slot });
      return true;
    } catch (err) {
      console.error('[Save] write failed', err);
      Events.emit('save:failed', { slot, err });
      return false;
    }
  }

  read(slot) {
    try {
      const raw = localStorage.getItem(this.key(slot));
      if (!raw) return null;
      return this.migrate(JSON.parse(raw));
    } catch (err) {
      console.warn('[Save] unreadable slot', slot, err);
      return null;
    }
  }

  load(slot) {
    const payload = this.read(slot);
    if (!payload) return false;
    GameState.deserialize(payload.state);
    Events.emit('save:loaded', { slot });
    return true;
  }

  /**
   * Brings older payloads up to the current format. Add a case per version bump
   * and never delete an old one — players keep their progress across updates.
   */
  migrate(payload) {
    let version = payload.version ?? 0;
    while (version < SAVE_VERSION) {
      switch (version) {
        case 1: {
          // v2 added survival meters, equipment, reputation and read-log tracking.
          // GameState.deserialize() already defaults anything missing here (it
          // resets first, then merges), so this just documents the shape change.
          const player = payload.state?.player;
          if (player) {
            player.hunger ??= 100; player.maxHunger ??= 100;
            player.thirst ??= 100; player.maxThirst ??= 100;
            player.injuries ??= [];
          }
          break;
        }
        default: break;
      }
      version++;
    }
    payload.version = SAVE_VERSION;
    return payload;
  }

  delete(slot) {
    localStorage.removeItem(this.key(slot));
    Events.emit('save:deleted', { slot });
  }

  /** Slot summaries for the menu, without loading the full state. */
  list() {
    const slots = [];
    for (let i = 0; i < SAVE_SLOTS; i++) {
      const payload = this.read(i);
      slots.push(payload ? { slot: i, empty: false, ...payload.preview, savedAt: payload.savedAt } : { slot: i, empty: true });
    }
    return slots;
  }

  hasAny() { return this.list().some((s) => !s.empty); }

  /** Index of the slot most recently written, or -1. */
  mostRecent() {
    let best = -1;
    let bestTime = -1;
    for (const s of this.list()) if (!s.empty && s.savedAt > bestTime) { bestTime = s.savedAt; best = s.slot; }
    return best;
  }
}

export const Save = new SaveSystem();
