import { Entity } from '../Entity.js';
import { getItem } from './ItemDatabase.js';
import { GameState } from '../../core/GameState.js';
import { Notifications } from '../../systems/NotificationSystem.js';
import { Audio } from '../../systems/AudioSystem.js';
import { t, localised } from '../../core/I18n.js';
import { drawItemIcon } from '../../ui/ItemIcon.js';
import { getRarity } from '../../data/rarity.js';

/** An item lying on the ground. Bobs, glints, and disappears once taken. */
export class ItemPickup extends Entity {
  constructor({ id, x, y, itemId, qty = 1, flag = null, durability = null }) {
    super({ id, x, y });
    this.itemId = itemId;
    this.qty = qty;
    /** Carried over from a dropped equipment/tool item — see ui/InventoryUI.js
     *  `drop()` and GameState.worldItems. Restored onto GameState.itemDurability
     *  the moment it's picked back up. */
    this.durability = durability;
    /** World flag that records this pickup as taken, so it stays taken. */
    this.flag = flag || `picked:${id}`;
    this.hitbox = { w: 10, h: 6, ox: 0, oy: 0 };
    this.spriteW = 16;
    this.spriteH = 16;
    this.interactable = true;
    this.interactRadius = 18;
    this.promptKey = 'hud.take';
    this.bob = Math.random() * Math.PI * 2;
    this.shadow = true;
    if (GameState.getFlag(this.flag, false)) this.dead = true;
  }

  update(dt) { this.bob += dt * 2.4; }

  interact(scene) {
    const def = getItem(this.itemId);
    const added = GameState.inventory.add(this.itemId, this.qty);
    if (added <= 0) { Notifications.push(t('notify.full')); return; }
    if (this.durability != null) GameState.itemDurability[this.itemId] = this.durability;
    def?.onPickup?.({ state: GameState, scene });
    GameState.setFlag(this.flag, true);
    Audio.playSfx('pickup', { variation: 0.05 });
    Notifications.push(t('notify.picked', { name: localised(def?.name, this.itemId), qty: added }), {
      itemId: this.itemId, color: def?.rarity && def.rarity !== 'common' ? getRarity(def.rarity).color : null,
    });
    scene.particles.burst(this.x, this.y - 6, 8, { color: '#7fe0a8', speed: 26, life: 0.4, gravity: 40 });
    this.dead = true;
  }

  render(renderer, camera) {
    const ctx = renderer.ctx;
    const def = getItem(this.itemId);
    const sx = Math.round(this.x - camera.renderX);
    const sy = Math.round(this.y - camera.renderY + Math.sin(this.bob) * 1.5);

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(sx, Math.round(this.y - camera.renderY) - 1, 5, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    drawItemIcon(ctx, def || {}, sx - 8, sy - 16, 16);
  }
}
