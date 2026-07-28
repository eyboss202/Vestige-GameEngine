import { VIEW_W, VIEW_H } from '../config/Constants.js';

/**
 * Darkness mask + additive glow. The mask is built on its own buffer: fill it
 * with the map's darkness colour, punch holes where the lights are, then draw
 * the whole thing over the scene in one go.
 */
export class LightingSystem {
  constructor() {
    this.time = 0;
    /** Lights added by entities each frame (player lantern, torches, ...). */
    this.dynamic = [];
  }

  update(dt) { this.time += dt; }

  /** Cleared every frame — push from entity update(), consume in render(). */
  addDynamic(light) { this.dynamic.push(light); }

  /** Per-light flicker factor: two out-of-phase sines beat a random() jitter,
   *  which reads as noise rather than a failing bulb. */
  flickerAmount(light, index) {
    if (!light.flicker) return 1;
    const t = this.time * 6 + index * 1.7;
    const n = Math.sin(t) * 0.6 + Math.sin(t * 2.37 + 1.2) * 0.4;
    return 1 - light.flicker * (0.5 + 0.5 * n);
  }

  render(renderer, camera, ambient, mapLights = []) {
    const darkness = ambient?.darkness ?? 0;
    const lights = [...mapLights, ...this.dynamic];
    this.dynamic.length = 0;
    if (darkness <= 0 && lights.length === 0) return;

    const lctx = renderer.lightCtx;
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.globalCompositeOperation = 'source-over';
    lctx.clearRect(0, 0, VIEW_W, VIEW_H);
    lctx.globalAlpha = darkness;
    lctx.fillStyle = ambient?.tint ?? '#000000';
    lctx.fillRect(0, 0, VIEW_W, VIEW_H);
    lctx.globalAlpha = 1;

    // Carve the lit areas out of the darkness.
    lctx.globalCompositeOperation = 'destination-out';
    lights.forEach((light, i) => {
      const sx = light.x - camera.renderX;
      const sy = light.y - camera.renderY;
      const radius = light.radius * this.flickerAmount(light, i);
      if (sx + radius < 0 || sx - radius > VIEW_W || sy + radius < 0 || sy - radius > VIEW_H) return;
      const g = lctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(1, radius));
      const intensity = (light.intensity ?? 1);
      g.addColorStop(0, `rgba(0,0,0,${Math.min(1, intensity)})`);
      g.addColorStop(0.55, `rgba(0,0,0,${Math.min(1, intensity * 0.55)})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = g;
      lctx.beginPath();
      lctx.arc(sx, sy, radius, 0, Math.PI * 2);
      lctx.fill();
    });

    renderer.ctx.drawImage(renderer.lightBuffer, 0, 0);

    // A second, additive pass gives the lamps their colour instead of just a hole.
    const ctx = renderer.ctx;
    ctx.globalCompositeOperation = 'lighter';
    lights.forEach((light, i) => {
      if (!light.color) return;
      const sx = light.x - camera.renderX;
      const sy = light.y - camera.renderY;
      const radius = light.radius * this.flickerAmount(light, i);
      if (sx + radius < 0 || sx - radius > VIEW_W || sy + radius < 0 || sy - radius > VIEW_H) return;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(1, radius));
      g.addColorStop(0, hexToRgba(light.color, 0.16 * (light.intensity ?? 1)));
      g.addColorStop(1, hexToRgba(light.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
  }
}

export function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
