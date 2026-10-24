import { Entity } from './Entity.js';
import { applyRadiusDamage } from '../core/Combat.js';
import { Audio } from '../systems/AudioSystem.js';

/**
 * A thrown weapon (grenades today). Skids to a stop under drag, then
 * detonates when its fuse runs out — no real arc/height simulation, this is a
 * top-down game and a straight skid reads fine at this scale.
 */
export class Throwable extends Entity {
  constructor({ x, y, angle, speed, fuse, damage, radius, faction, color = '#c4553f' }) {
    super({ x, y });
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.fuse = fuse;
    this.damage = damage;
    this.radius = radius;
    this.faction = faction;
    this.color = color;
    this.shadow = false;
    this.animator = null;
    this.hitbox = { w: 4, h: 4, ox: 0, oy: 0 };
  }

  update(dt, scene) {
    this.fuse -= dt;
    const drag = Math.max(0, 1 - 3.2 * dt);
    this.vx *= drag;
    this.vy *= drag;
    const nx = this.x + this.vx * dt;
    const ny = this.y + this.vy * dt;
    if (scene.map.isSolidAt(nx, ny)) { this.vx = this.vy = 0; } else { this.x = nx; this.y = ny; }
    if (this.fuse <= 0) this.explode(scene);
  }

  explode(scene) {
    if (this.dead) return;
    this.dead = true;
    applyRadiusDamage(scene, this.x, this.y, this.radius, this.damage, { sourceFaction: this.faction, type: 'explosive' });
    scene.particles.burst(this.x, this.y - 4, 24, { color: this.color, speed: 75, life: 0.6, gravity: 40 });
    scene.camera.shake(0.65);
    Audio.playSfx('explosion');
  }

  render(renderer, camera) {
    const ctx = renderer.ctx;
    const sx = Math.round(this.x - camera.renderX);
    const sy = Math.round(this.y - camera.renderY);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(sx, sy - 3, 2, 0, Math.PI * 2);
    ctx.fill();
    // Flicker faster as the fuse runs down.
    if (Math.sin(this.fuse * 30) > 0) {
      ctx.fillStyle = '#e0a458';
      ctx.fillRect(sx - 1, sy - 6, 1, 1);
    }
  }
}
