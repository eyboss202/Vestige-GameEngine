import { Entity } from './Entity.js';
import { hitEntitiesInBox } from '../core/Combat.js';

/**
 * A single shot fired by a ranged weapon or a ranged enemy. Travels in a
 * straight line, stops at the first wall or the first valid target, then
 * removes itself — shared by Player.attack() and Enemy's ranged behaviour
 * (data/enemies.js `behavior: 'ranged'`).
 */
export class Projectile extends Entity {
  constructor({ x, y, angle, speed, damage, faction, life = 1, color = '#e0a458', size = 2 }) {
    super({ x, y });
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.damage = damage;
    this.faction = faction;
    this.life = life;
    this.color = color;
    this.size = size;
    this.shadow = false;
    this.animator = null;
    this.hitbox = { w: size, h: size, ox: 0, oy: 0 };
  }

  get depth() { return Infinity; }   // always draws above ground-level entities

  update(dt, scene) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }

    const nx = this.x + this.vx * dt;
    const ny = this.y + this.vy * dt;
    if (scene.map.isSolidAt(nx, ny)) { this.dead = true; return; }
    this.x = nx;
    this.y = ny;

    const hits = hitEntitiesInBox(scene, this.getBox(), this.damage, { sourceFaction: this.faction, type: 'ranged' });
    if (hits.length) {
      this.dead = true;
      scene.particles.burst(this.x, this.y, 5, { color: this.color, speed: 24, life: 0.3 });
    }
  }

  render(renderer, camera) {
    const ctx = renderer.ctx;
    const sx = Math.round(this.x - camera.renderX);
    const sy = Math.round(this.y - camera.renderY);
    ctx.fillStyle = this.color;
    ctx.fillRect(sx - this.size / 2, sy - this.size / 2, this.size, this.size);
  }
}
