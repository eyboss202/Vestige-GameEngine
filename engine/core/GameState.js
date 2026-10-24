import { Events } from './EventBus.js';
import { SAVE_VERSION, FLASHLIGHT_MAX_BATTERY, FLASHLIGHT_RECHARGE_AMOUNT } from '../config/Constants.js';
import { Inventory, Equipment } from '../systems/InventorySystem.js';
import { Content } from './Content.js';

/**
 * The single mutable blob that defines a playthrough. Everything the save file
 * needs is reachable from here, so adding a system to the save format means
 * adding a field here and a line in serialize()/deserialize().
 */
class GameStateStore {
  constructor() {
    this.reset();
    // Equipping/unequipping anything can change the total armor bonus (vest,
    // helmet, ... any slot's `bonus.armor` counts) — recompute the pool's
    // ceiling and, only when that ceiling actually moved, top the current
    // pool back up. "Only when it moved" is what stops an unrelated change
    // (say, swapping weapons) from handing back armor a fight already spent.
    Events.on('equipment:changed', () => this.refreshArmor());
  }

  reset() {
    this.version = SAVE_VERSION;
    this.playtime = 0;                    // seconds
    this.currentMap = Content.config.startMap;
    this.spawn = Content.config.startSpawn;
    this.player = {
      x: null, y: null, facing: 'down',
      hp: 20, maxHp: 20,
      /** Depleting damage-mitigation pool — see refreshArmor()/Player.takeDamage().
       *  Distinct from GameState.derivedStat('armor'), which nothing reads for
       *  combat purposes anymore now that armor consumes itself as it's used. */
      armor: 0, maxArmor: 0,
      /** Charge left in the flashlight (game/data/items.js
       *  `flashlight`/`cell_battery`), 0..FLASHLIGHT_MAX_BATTERY. Persists
       *  independently of whether the flashlight is currently equipped —
       *  putting it away doesn't magically refill the cell, unlike armor's
       *  pool (refreshArmor()). Only drains while equipped on an interior
       *  map — see GameScene.update(). */
      flashlightBattery: FLASHLIGHT_MAX_BATTERY,
      stamina: 100, maxStamina: 100,
      hunger: 100, maxHunger: 100,
      thirst: 100, maxThirst: 100,
      /** { type, severity, remaining } — see systems/SurvivalSystem.js. */
      injuries: [],
      speed: 58,                          // pixels per second, walking
      // A game's `config.player.stats` overrides any of the defaults above.
      ...structuredClone(Content.config.player.stats),
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
    /** Which readable-note dialogue ids (see an item's `dialogueId`) have been opened. */
    this.collectedLogs = {};
    /** Rounds currently chambered per ranged weapon item id — see Player.attack()/reload()
     *  and game/data/weapons.js `magazineSize`. Missing entry means "full magazine, never fired". */
    this.weaponAmmo = {};
    /** Remaining durability per weapon/tool item id — see an item's `durability` and
     *  Player.attack()/reload(). Missing entry means "undamaged". Keyed by item id rather
     *  than instance, same simplification GameState.equipment already makes (stackSize 1). */
    this.itemDurability = {};
    /** Items dropped into the world, per map id: { [mapId]: [{ id, itemId, qty, x, y, durability }] }.
     *  Rebuilt into ItemPickup entities by world/MapManager.js on top of the map's own list. */
    this.worldItems = {};
    /** Remaining contents of opened containers, per container id: { [id]: { items: [{itemId,qty}] } }.
     *  Absent means "use the map-authored contents unchanged" — see entities/Container.js. */
    this.containers = {};
    /** Counter behind allocateDropId() — persisted so ids stay unique across a
     *  reload instead of restarting at 1 and colliding with items already on
     *  the ground. */
    this.nextDropId = 1;
    Events.emit('state:reset');
  }

  /** A stable id for a newly world-dropped item — see engine/ui/InventoryUI.js. */
  allocateDropId() { return `dropped_${this.nextDropId++}`; }

  getFlag(key, fallback = false) { return this.flags[key] ?? fallback; }

  /** Base player stat plus whatever's currently equipped adds to it. */
  derivedStat(key) {
    const base = this.player[key] ?? 0;
    return base + this.equipment.bonusFor(key);
  }

  /** Recomputes the armor pool's ceiling from equipped gear and, only when
   *  that ceiling changed, tops the current pool back up to it — fresh gear
   *  means fresh protection. Also what heals a save written before this pool
   *  existed: an old save's player.armor/maxArmor default to 0 (reset()),
   *  which almost never matches equipment.bonusFor('armor'), so this fires
   *  once on load and fills the pool in from whatever's equipped. */
  refreshArmor() {
    const max = this.equipment.bonusFor('armor');
    if (max === this.player.maxArmor) return;
    this.player.maxArmor = max;
    this.player.armor = max;
  }

  /** Tops the flashlight up by one cell_battery's worth. @returns false (so
   *  Inventory.use() leaves the item in the bag) when already full. */
  rechargeFlashlight(amount = FLASHLIGHT_RECHARGE_AMOUNT) {
    if (this.player.flashlightBattery >= FLASHLIGHT_MAX_BATTERY) return false;
    this.player.flashlightBattery = Math.min(FLASHLIGHT_MAX_BATTERY, this.player.flashlightBattery + amount);
    return true;
  }

  setFlag(key, value = true) {
    const previous = this.flags[key];
    this.flags[key] = value;
    if (previous !== value) Events.emit('flag:changed', { key, value, previous });
  }

  /** Current rounds chambered for a weapon item id, defaulting to a full magazine. */
  getWeaponAmmo(weaponItemId, magazineSize) {
    const value = this.weaponAmmo[weaponItemId];
    return value == null ? magazineSize : Math.min(value, magazineSize);
  }

  setWeaponAmmo(weaponItemId, value) { this.weaponAmmo[weaponItemId] = value; }

  /** Current durability for an item id, defaulting to full (undamaged). */
  getDurability(itemId, max) {
    const value = this.itemDurability[itemId];
    return value == null ? max : Math.min(value, max);
  }

  /** @returns { value, broke } — `broke` is true the instant it crosses zero. */
  damageDurability(itemId, amount, max) {
    const before = this.getDurability(itemId, max);
    const value = Math.max(0, before - amount);
    this.itemDurability[itemId] = value;
    return { value, broke: before > 0 && value <= 0 };
  }

  /** Remaining loot in a container, falling back to its map-authored contents
   *  the first time it's opened (nothing taken yet). */
  getContainerContents(id, fallbackItems) {
    const saved = this.containers[id];
    return saved ? saved.items : structuredClone(fallbackItems || []);
  }

  setContainerContents(id, items) { this.containers[id] = { items }; }

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
      weaponAmmo: { ...this.weaponAmmo },
      itemDurability: { ...this.itemDurability },
      worldItems: structuredClone(this.worldItems),
      containers: structuredClone(this.containers),
      nextDropId: this.nextDropId,
    };
  }

  deserialize(data) {
    this.reset();
    this.version = data.version ?? SAVE_VERSION;
    this.playtime = data.playtime ?? 0;
    this.currentMap = data.currentMap ?? Content.config.startMap;
    this.spawn = null;                       // saved games restore exact coords
    Object.assign(this.player, data.player || {});
    this.flags = { ...(data.flags || {}) };
    this.quests = structuredClone(data.quests || {});
    this.seenDialogue = { ...(data.seenDialogue || {}) };
    this.inventory.deserialize(data.inventory || []);
    this.equipment.deserialize(data.equipment || {});
    // Saves written before equipping stopped removing the item from the bag
    // would otherwise load with a slot pointing at an item the bag no longer
    // has — heal that by handing it back once, same as a fresh unequip would.
    for (const itemId of Object.values(this.equipment.slots)) {
      if (itemId && !this.inventory.has(itemId)) this.inventory.add(itemId, 1);
    }
    this.reputation = { ...(data.reputation || {}) };
    this.collectedLogs = { ...(data.collectedLogs || {}) };
    this.weaponAmmo = { ...(data.weaponAmmo || {}) };
    this.itemDurability = { ...(data.itemDurability || {}) };
    this.worldItems = structuredClone(data.worldItems || {});
    this.containers = structuredClone(data.containers || {});
    this.nextDropId = data.nextDropId ?? 1;
    this.refreshArmor();
    Events.emit('state:loaded');
  }
}

export const GameState = new GameStateStore();
