import { Entity } from './Entity.js';
import { hitEntitiesInBox, applyRadiusDamage } from '../core/Combat.js';
import { Audio } from '../systems/AudioSystem.js';
import { Events } from '../core/EventBus.js';
import { distance, aabb } from '../core/Collision.js';

const COLORS = { spike: '#8a4b2a', electric: '#9fd8ff', explosive: '#c4553f', alarm: '#e0a458' };

/**
 * Generic hazard, data-driven by `trapType`. `faction` decides who it hurts —
 * exactly the same targeting core/Combat.js already uses for weapons, so a
 * player-placed trap (faction 'player') only hurts enemies, and a map-authored
 * one (faction 'enemy') only hurts the player. Two ways to get one on the map:
 * a `trap_*` inventory item's onUse (see ItemDatabase.js), or a `trap` entry
 * straight in a map's entities list (see world/MapManager.js ENTITY_FACTORY).
 */
export class Trap extends Entity {
  constructor({ id, x, y, trapType = 'spike', damage = 6, radius = 34, armDelay = 0.5, oneShot = true, faction = 'enemy' }) {
    super({ id, x, y });
    this.trapType = trapType;
    this.damage = damage;
    this.radius = radius;
    this.oneShot = oneShot;
    this.faction = faction;
    this.armTimer = armDelay;
    this.hitbox = { w: 12, h: 8, ox: 0, oy: 0 };
    this.solid = false;
    this.shadow = false;
    this.animator = null;
    this.interactable = false;
  }

  get depth() { return this.y - 200; }   // sits under entities, like a decor tile

  update(dt, scene) {
    super.update(dt, scene);
    if (this.dead) return;
    if (this.armTimer > 0) { this.armTimer -= dt; return; }

    // All four trap types arm the same way — a valid (opposite-faction)
    // target standing on it — trigger() is what differs per type.
    if (this.findContact(scene)) this.trigger(scene);
  }

  /** Pure overlap test — deliberately not hitEntitiesInBox, which would apply
   *  (zero) damage and still trigger hurt flashes/camera shake as a side effect. */
  findContact(scene) {
    const box = this.getBox();
    for (const entity of scene.entities) {
      if (entity === this || entity.dead || !entity.faction || entity.faction === this.faction) continue;
      if (typeof entity.getBox !== 'function') continue;
      if (aabb(box, entity.getBox())) return entity;
    }
    return null;
  }

  trigger(scene) {
    Audio.playSfx('trap');
    switch (this.trapType) {
      case 'spike':
        hitEntitiesInBox(scene, this.getBox(), this.damage, { sourceFaction: this.faction, type: 'physical' });
        scene.particles.burst(this.x, this.y - 4, 8, { color: COLORS.spike, speed: 30, life: 0.3 });
        break;
      case 'electric': {
        const hits = hitEntitiesInBox(scene, this.getBox(), this.damage, { sourceFaction: this.faction, type: 'physical' });
        for (const entity of hits) entity.stunTimer = Math.max(entity.stunTimer, 1.3);
        scene.particles.burst(this.x, this.y - 4, 10, { color: COLORS.electric, speed: 40, life: 0.3 });
        break;
      }
      case 'explosive':
        applyRadiusDamage(scene, this.x, this.y, this.radius, this.damage, { sourceFaction: this.faction, type: 'explosive' });
        scene.particles.burst(this.x, this.y - 4, 24, { color: COLORS.explosive, speed: 70, life: 0.6, gravity: 40 });
        scene.camera.shake(0.55);
        Audio.playSfx('explosion');
        break;
      case 'alarm':
        Events.emit('trap:alarm', { x: this.x, y: this.y });
        this.alertNearby(scene);
        break;
      default:
        break;
    }
    if (this.oneShot) this.dead = true;
    else this.armTimer = 1.2;
  }

  /** The one concrete reaction to an alarm today: nearby enemies go straight
   *  to 'chase'. A real alert/investigate state is a natural next step. */
  alertNearby(scene, radius = 140) {
    for (const entity of scene.entities) {
      if (entity.faction !== 'enemy' || typeof entity.setState !== 'function' || entity.dead) continue;
      if (distance(entity, this) > radius) continue;
      entity.setState('chase');
    }
  }

  render(renderer, camera) {
    const ctx = renderer.ctx;
    const sx = Math.round(this.x - camera.renderX);
    const sy = Math.round(this.y - camera.renderY);
    ctx.globalAlpha = this.armTimer > 0 ? 0.35 : 0.9;
    ctx.fillStyle = COLORS[this.trapType] || '#c7d1ce';
    if (this.trapType === 'explosive') {
      ctx.beginPath(); ctx.arc(sx, sy - 2, 3, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillRect(sx - 5, sy - 3, 10, 3);
    }
    ctx.globalAlpha = 1;
  }
}
