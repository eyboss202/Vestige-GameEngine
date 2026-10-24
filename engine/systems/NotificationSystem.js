import { Events } from '../core/EventBus.js';

/** Short-lived toasts in the corner of the screen. */
class NotificationSystem {
  constructor() {
    this.queue = [];
    this.maxVisible = 3;
  }

  /** @param opts.itemId when set, the toast shows that item's icon (with its rarity border). */
  push(text, { itemId = null, duration = 2.6, color = null } = {}) {
    this.queue.push({ text, itemId, duration, life: duration, color, age: 0 });
    if (this.queue.length > this.maxVisible + 2) this.queue.shift();
    Events.emit('notify', { text });
  }

  update(dt) {
    for (const n of this.queue) { n.life -= dt; n.age += dt; }
    this.queue = this.queue.filter((n) => n.life > 0);
  }

  clear() { this.queue.length = 0; }
}

export const Notifications = new NotificationSystem();
