import { Events } from './EventBus.js';
import { SAVE_VERSION } from '../config/Constants.js';
import { Inventory, Equipment } from '../systems/InventorySystem.js';

/**
 * The single mutable blob that defines a playthrough. Everything the save file
 * needs is reachable from here, so adding a system to the save format means
 * adding a field here and a line in serialize()/deserialize().
 */
class GameStateStore {
  constructor() { this.reset(); }

  reset() {
    this.version = SAVE_VERSION;
    this.playtime = 0;                    // seconds
    this.currentMap = 'lab_atrium';
    this.spawn = 'default';
    this.player = {
      x: null, y: null, facing: 'down',
      hp: 20, maxHp: 20,
      stamina: 100, maxStamina: 100,
      hunger: 100, maxHunger: 100,
      thirst: 100, maxThirst: 100,
      /** { type, severity, remaining } — see systems/SurvivalSystem.js. */
      injuries: [],
      speed: 58,                          // pixels per second, walking
    };
    /** Free-form world booleans/numbers: doors opened, NPCs spoken to, etc.
     *  Quests and cutscenes should live on top of this, not beside it. */
    this.flags = {};
    /** Reserved for the quest system: { id: { stage, done } }. */
    this.quests = {};
    /** Dialogue nodes already seen — lets NPCs change what they say. */
    this.seenDialogue = {};
    this.inventory = new Inventory(20);
    this.equipment = new Equipment();
    /** Reserved for future faction standing: { factionId: number }. */
    this.reputation = {};
    /** Which readable-note dialogue ids (see ItemDatabase `dialogueId`) have been opened. */
    this.collectedLogs = {};
    Events.emit('state:reset');
  }

  getFlag(key, fallback = false) { return this.flags[key] ?? fallback; }

  /** Base player stat plus whatever's currently equipped adds to it. */
  derivedStat(key) {
    const base = this.player[key] ?? 0;
    return base + this.equipment.bonusFor(key);
  }

  setFlag(key, value = true) {
    const previous = this.flags[key];
    this.flags[key] = value;
    if (previous !== value) Events.emit('flag:changed', { key, value, previous });
  }

  markSeen(dialogueId) { this.seenDialogue[dialogueId] = (this.seenDialogue[dialogueId] || 0) + 1; }
  timesSeen(dialogueId) { return this.seenDialogue[dialogueId] || 0; }

  /** Plain object, ready for JSON. */
  serialize() {
    return {
      version: SAVE_VERSION,
      playtime: Math.round(this.playtime),
      currentMap: this.currentMap,
      player: structuredClone(this.player),
      flags: { ...this.flags },
      quests: structuredClone(this.quests),
      seenDialogue: { ...this.seenDialogue },
      inventory: this.inventory.serialize(),
      equipment: this.equipment.serialize(),
      reputation: { ...this.reputation },
      collectedLogs: { ...this.collectedLogs },
    };
  }

  deserialize(data) {
    this.reset();
    this.version = data.version ?? SAVE_VERSION;
    this.playtime = data.playtime ?? 0;
    this.currentMap = data.currentMap ?? 'lab_atrium';
    this.spawn = null;                       // saved games restore exact coords
    Object.assign(this.player, data.player || {});
    this.flags = { ...(data.flags || {}) };
    this.quests = structuredClone(data.quests || {});
    this.seenDialogue = { ...(data.seenDialogue || {}) };
    this.inventory.deserialize(data.inventory || []);
    this.equipment.deserialize(data.equipment || {});
    this.reputation = { ...(data.reputation || {}) };
    this.collectedLogs = { ...(data.collectedLogs || {}) };
    Events.emit('state:loaded');
  }
}

export const GameState = new GameStateStore();
