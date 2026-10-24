import { VIEW_W, VIEW_H } from '../config/Constants.js';
import { Settings } from '../config/Settings.js';

/**
 * Owns the two canvases: a fixed low-resolution buffer everything is drawn
 * into, and the visible canvas it gets upscaled onto. Scenes only ever touch
 * `renderer.ctx` (the buffer) so the pixel grid can never drift.
 */
export class Renderer {
  constructor(displayCanvas) {
    this.display = displayCanvas;
    this.displayCtx = displayCanvas.getContext('2d', { alpha: false });

    this.buffer = document.createElement('canvas');
    this.buffer.width = VIEW_W;
    this.buffer.height = VIEW_H;
    this.ctx = this.buffer.getContext('2d');

    /** Second buffer used by the lighting system as a darkness mask. */
    this.lightBuffer = document.createElement('canvas');
    this.lightBuffer.width = VIEW_W;
    this.lightBuffer.height = VIEW_H;
    this.lightCtx = this.lightBuffer.getContext('2d');

    for (const c of [this.ctx, this.lightCtx, this.displayCtx]) c.imageSmoothingEnabled = false;

    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.scanlines = null;

    window.addEventListener('resize', () => this.resize());
    Settings.onChange((key) => { if (key === 'scaleMode' || key === 'scaleFactor') this.resize(); });
    this.resize();
  }

  resize() {
    const dpr = 1; // the whole point is chunky pixels; device pixels stay 1:1
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.display.width = Math.floor(w * dpr);
    this.display.height = Math.floor(h * dpr);
    this.displayCtx.imageSmoothingEnabled = false;

    const raw = Math.min(this.display.width / VIEW_W, this.display.height / VIEW_H);
    const forced = Settings.get('scaleFactor');
    if (forced > 0) this.scale = forced;
    else if (Settings.get('scaleMode') === 'integer') this.scale = Math.max(1, Math.floor(raw));
    else this.scale = raw;

    this.offsetX = Math.floor((this.display.width - VIEW_W * this.scale) / 2);
    this.offsetY = Math.floor((this.display.height - VIEW_H * this.scale) / 2);
    this.buildScanlines();
  }

  /** Pre-rendered 1x2 pattern so the CRT overlay costs one fillRect a frame. */
  buildScanlines() {
    const step = Math.max(2, Math.round(this.scale));
    const tile = document.createElement('canvas');
    tile.width = 1;
    tile.height = step;
    const tctx = tile.getContext('2d');
    tctx.fillStyle = 'rgba(0,0,0,0.16)';
    tctx.fillRect(0, step - 1, 1, 1);
    this.scanlines = this.displayCtx.createPattern(tile, 'repeat');
  }

  /** Start of frame: wipe the buffer. */
  begin(clearColor = '#07090b') {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.fillStyle = clearColor;
    this.ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  /** Soft darkening at the frame edges. Cheap, and it does a lot of the work
   *  of making an empty room feel enclosed. */
  vignette(strength = 0.5) {
    if (strength <= 0) return;
    const g = this.ctx.createRadialGradient(
      VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35,
      VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.72
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${strength})`);
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  /** Full-screen colour wash — used for fades and damage flashes. */
  flash(color, alpha) {
    if (alpha <= 0) return;
    this.ctx.globalAlpha = Math.min(1, alpha);
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.ctx.globalAlpha = 1;
  }

  /** End of frame: upscale the buffer onto the visible canvas. */
  end() {
    const dc = this.displayCtx;
    dc.fillStyle = '#000';
    dc.fillRect(0, 0, this.display.width, this.display.height);
    dc.imageSmoothingEnabled = false;
    dc.drawImage(this.buffer, this.offsetX, this.offsetY, VIEW_W * this.scale, VIEW_H * this.scale);
    if (this.scanlines && this.scale >= 2) {
      dc.save();
      dc.fillStyle = this.scanlines;
      dc.fillRect(this.offsetX, this.offsetY, VIEW_W * this.scale, VIEW_H * this.scale);
      dc.restore();
    }
  }

  // ---- small drawing helpers so scenes do not repeat canvas boilerplate ----

  rect(x, y, w, h, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  outline(x, y, w, h, color) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w) - 1, Math.round(h) - 1);
  }

  sprite(image, sx, sy, sw, sh, dx, dy, dw = sw, dh = sh) {
    if (!image) return;
    this.ctx.drawImage(image, sx, sy, sw, sh, Math.round(dx), Math.round(dy), dw, dh);
  }
}
