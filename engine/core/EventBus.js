/**
 * Tiny publish/subscribe hub. Systems talk through this instead of holding
 * references to each other, which is what keeps them independently replaceable.
 *
 *   Events.on('item:picked', ({ item }) => ...);
 *   Events.emit('item:picked', { item });
 */
class EventBus {
  constructor() { this.handlers = new Map(); }

  on(event, fn) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event).add(fn);
    return () => this.off(event, fn);
  }

  once(event, fn) {
    const wrap = (payload) => { this.off(event, wrap); fn(payload); };
    return this.on(event, wrap);
  }

  off(event, fn) { this.handlers.get(event)?.delete(fn); }

  emit(event, payload) {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const fn of [...set]) {
      try { fn(payload); } catch (err) { console.error(`[Events] handler for "${event}" failed`, err); }
    }
  }

  clear() { this.handlers.clear(); }
}

export const Events = new EventBus();
