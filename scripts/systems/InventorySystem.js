import { Events } from '../core/EventBus.js';
import { getItem } from '../entities/items/ItemDatabase.js';

/**
 * Slot-based inventory with stacking. Knows nothing about UI — it emits events
 * and the inventory screen listens.
 */
export class Inventory {
  /** @param capacityWeight optional total-weight cap; Infinity (default) means unused. */
  constructor(capacity = 20, capacityWeight = Infinity) {
    this.capacity = capacity;
    this.capacityWeight = capacityWeight;
    this.slots = [];             // [{ itemId, qty }]
  }

  get count() { return this.slots.length; }
  isFull() { return this.slots.length >= this.capacity; }

  /** First slot holding this item, or null — a stack reference, not "the"
   *  total (an item can occupy several slots once it outgrows one stack's
   *  stackSize; see quantity() below). */
  find(itemId) { return this.slots.find((s) => s.itemId === itemId) || null; }

  /** Total held across every stack — add()/remove() already spill into (and
   *  deplete from) more than one slot once an item passes its stackSize, so
   *  this has to sum all of them. Reading only the first slot used to under-
   *  report the true amount (and could look like it never changed after a
   *  remove(), since remove() empties slots back-to-front while this read
   *  the front) the moment a player carried more of something than fit in
   *  one stack — visible in reload's ammo reserve, the HUD ammo readout and
   *  ShopScene's currency balance, all of which read this. */
  quantity(itemId) { return this.slots.reduce((sum, s) => (s.itemId === itemId ? sum + s.qty : sum), 0); }
  has(itemId, qty = 1) { return this.quantity(itemId) >= qty; }

  /** @returns the amount actually added (0 when the bag is full or too heavy). */
  add(itemId, qty = 1) {
    const def = getItem(itemId);
    if (!def) { console.warn(`[Inventory] unknown item "${itemId}"`); return 0; }
    let remaining = qty;

    const unitWeight = def.weight ?? 0;
    if (unitWeight > 0 && Number.isFinite(this.capacityWeight)) {
      const weightRoom = Math.max(0, this.capacityWeight - this.totalWeight());
      remaining = Math.min(remaining, Math.floor(weightRoom / unitWeight));
    }

    if (def.stackSize > 1) {
      for (const slot of this.slots) {
        if (slot.itemId !== itemId || remaining <= 0) continue;
        const room = def.stackSize - slot.qty;
        const moved = Math.min(room, remaining);
        slot.qty += moved;
        remaining -= moved;
      }
    }
    while (remaining > 0 && !this.isFull()) {
      const moved = Math.min(def.stackSize, remaining);
      this.slots.push({ itemId, qty: moved });
      remaining -= moved;
    }

    const added = qty - remaining;
    if (added > 0) Events.emit('inventory:changed', { itemId, delta: added });
    if (remaining > 0) Events.emit('inventory:full', { itemId, remaining });
    return added;
  }

  remove(itemId, qty = 1) {
    let remaining = qty;
    for (let i = this.slots.length - 1; i >= 0 && remaining > 0; i--) {
      const slot = this.slots[i];
      if (slot.itemId !== itemId) continue;
      const taken = Math.min(slot.qty, remaining);
      slot.qty -= taken;
      remaining -= taken;
      if (slot.qty <= 0) this.slots.splice(i, 1);
    }
    const removed = qty - remaining;
    if (removed > 0) Events.emit('inventory:changed', { itemId, delta: -removed });
    return removed;
  }

  /** Runs an item's effect. Effects live in the item definition, not here. */
  use(itemId, context) {
    const def = getItem(itemId);
    if (!def || !this.has(itemId)) return false;
    if (def.onUse?.({ ...context, itemId }) === false) return false;   // item refused (e.g. full HP)
    if (def.consumable) this.remove(itemId, 1);
    Events.emit('inventory:used', { itemId });
    return true;
  }

  /** Slots grouped by the categories the inventory screen shows as tabs. */
  byCategory(category) {
    return this.slots.filter((s) => getItem(s.itemId)?.category === category);
  }

  /** Total weight of everything carried. Items without a `weight` count as 0,
   *  so this is opt-in — set `capacity`-style limits only where it matters. */
  totalWeight() {
    return this.slots.reduce((sum, s) => sum + (getItem(s.itemId)?.weight ?? 0) * s.qty, 0);
  }

  serialize() { return this.slots.map((s) => ({ i: s.itemId, q: s.qty })); }

  deserialize(data) {
    this.slots = (data || []).map((s) => ({ itemId: s.i ?? s.itemId, qty: s.q ?? s.qty }));
    Events.emit('inventory:changed', { itemId: null, delta: 0 });
  }
}

/** Body slots an equippable item's `slot` field can target. `flashlight` has
 *  no `bonus` stat like the others — equipping it just gates the interior
 *  darkness/battery-drain checks in GameScene.js (core/GameState.js
 *  `player.flashlightBattery`), same as a weapon slot gates being able to
 *  attack rather than granting a passive bonus. */
export const EQUIP_SLOTS = ['weapon', 'armor', 'helmet', 'gloves', 'boots', 'accessory', 'flashlight'];

/**
 * What the player is wearing/wielding. Equipping just flags an item already
 * in the bag as "the one in that slot" — it never leaves Inventory.slots, so
 * it keeps showing up (with an "E" marker — see ui/InventoryUI.js) and can be
 * examined/dropped like anything else. Stat bonuses are read back out through
 * GameState.derivedStat(), not stored here.
 */
export class Equipment {
  constructor() {
    this.slots = Object.fromEntries(EQUIP_SLOTS.map((s) => [s, null]));
  }

  get(slot) { return this.slots[slot]; }
  isEquipped(itemId) { return Object.values(this.slots).includes(itemId); }

  /** @returns true on success. Fails silently if the item has no slot or the bag lacks it. */
  equip(inventory, itemId) {
    const def = getItem(itemId);
    if (!def?.slot || !EQUIP_SLOTS.includes(def.slot) || !inventory.has(itemId)) return false;
    const previous = this.slots[def.slot];
    if (previous === itemId) return false;
    this.slots[def.slot] = itemId;
    Events.emit('equipment:changed', { slot: def.slot, itemId });
    return true;
  }

  /** @returns true on success. Fails if nothing's equipped in that slot. */
  unequip(inventory, slot) {
    const itemId = this.slots[slot];
    if (!itemId) return false;
    this.slots[slot] = null;
    Events.emit('equipment:changed', { slot, itemId: null });
    return true;
  }

  /** Sum of one bonus stat across everything currently equipped. */
  bonusFor(stat) {
    let total = 0;
    for (const itemId of Object.values(this.slots)) {
      if (!itemId) continue;
      total += getItem(itemId)?.bonus?.[stat] ?? 0;
    }
    return total;
  }

  serialize() { return { ...this.slots }; }

  deserialize(data) {
    this.slots = Object.fromEntries(EQUIP_SLOTS.map((s) => [s, data?.[s] ?? null]));
  }
}
