import { hexToRgba } from './LightingSystem.js';

/**
 * Fixed-size particle pool. Nothing is allocated after construction, so the
 * garbage collector never has a reason to stutter mid-frame.
 */
export class ParticleSystem {
  constructor(max = 320) {
    this.pool = Array.from({ length: max }, () => ({
      active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1,
      size: 1, color: '#ffffff', gravity: 0, drag: 0, fade: true,
    }));
    this.cursor = 0;
    this.ambient = null;
    this.ambientTimer = 0;
  }

  spawn(config) {
    // Oldest-first reuse: at capacity, the least important particle dies.
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[(this.cursor + i) % this.pool.length];
      if (p.active) continue;
      this.cursor = (this.cursor + i + 1) % this.pool.length;
      Object.assign(p, {
        active: true, vx: 0, vy: 0, gravity: 0, drag: 0, size: 1,
        color: '#ffffff', fade: true, ...config,
      });
      p.maxLife = p.life;
      return p;
    }
    return null;
  }

  burst(x, y, count, config = {}) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (config.speed ?? 20) * (0.4 + Math.random() * 0.6);
      this.spawn({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.6,
        life: (config.life ?? 0.5) * (0.6 + Math.random() * 0.8),
        ...config,
      });
    }
  }

  /** Slow drifting motes, set per map. Pass null to switch off. */
  setAmbient(config) { this.ambient = config; }

  update(dt, camera) {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.vx *= 1 - p.drag * dt;
      p.vy *= 1 - p.drag * dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    if (this.ambient && camera) {
      this.ambientTimer -= dt;
      if (this.ambientTimer <= 0) {
        this.ambientTimer = this.ambient.interval ?? 0.25;
        this.spawn({
          x: camera.x - 16 + Math.random() * (camera.viewW + 32),
          y: camera.y - 16 + Math.random() * (camera.viewH + 32),
          vx: (this.ambient.driftX ?? 4) * (0.5 + Math.random()),
          vy: (this.ambient.driftY ?? 6) * (0.5 + Math.random()),
          life: this.ambient.life ?? 4,
          size: Math.random() < 0.2 ? 2 : 1,
          color: this.ambient.color ?? '#cfe6df',
          alpha: this.ambient.alpha ?? 0.35,
        });
      }
    }
  }

  render(ctx, camera) {
    for (const p of this.pool) {
      if (!p.active) continue;
      const x = Math.round(p.x - camera.renderX);
      const y = Math.round(p.y - camera.renderY);
      const t = p.fade ? p.life / p.maxLife : 1;
      ctx.fillStyle = hexToRgba(p.color, (p.alpha ?? 1) * t);
      ctx.fillRect(x, y, p.size, p.size);
    }
  }

  clear() { for (const p of this.pool) p.active = false; }
}
