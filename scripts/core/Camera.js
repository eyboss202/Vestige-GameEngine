import { VIEW_W, VIEW_H } from '../config/Constants.js';
import { Settings } from '../config/Settings.js';

/** Smoothly trails a target, stays inside the map, and can be shaken. */
export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.zoom = 1;             // reserved: Renderer already applies it
    this.target = null;
    this.smoothing = 8;        // higher = snappier
    this.bounds = { x: 0, y: 0, w: VIEW_W, h: VIEW_H };
    this.trauma = 0;           // 0..1, decays every frame
    this.shakeMagnitude = 6;
    this.offsetX = 0;
    this.offsetY = 0;
    this.deadzone = { w: 0, h: 0 };
  }

  follow(entity, snap = false) {
    this.target = entity;
    if (snap) this.snapToTarget();
  }

  setBounds(w, h) { this.bounds = { x: 0, y: 0, w, h }; }

  snapToTarget() {
    if (!this.target) return;
    this.x = this.target.x - this.viewW / 2;
    this.y = this.target.y - this.viewH / 2;
    this.clamp();
  }

  get viewW() { return VIEW_W / this.zoom; }
  get viewH() { return VIEW_H / this.zoom; }

  /** Adds screen shake. `amount` is additive trauma, 0..1. */
  shake(amount = 0.4) {
    if (!Settings.get('screenShake')) return;
    this.trauma = Math.min(1, this.trauma + amount);
  }

  update(dt) {
    if (this.target) {
      const goalX = this.target.x - this.viewW / 2;
      const goalY = this.target.y - this.viewH / 2;
      // Frame-rate independent exponential smoothing.
      const t = 1 - Math.exp(-this.smoothing * dt);
      this.x += (goalX - this.x) * t;
      this.y += (goalY - this.y) * t;
    }
    this.clamp();

    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - dt * 1.6);
      const power = this.trauma * this.trauma;      // quadratic falloff feels better
      this.offsetX = (Math.random() * 2 - 1) * this.shakeMagnitude * power;
      this.offsetY = (Math.random() * 2 - 1) * this.shakeMagnitude * power;
    } else {
      this.offsetX = this.offsetY = 0;
    }
  }

  clamp() {
    const maxX = Math.max(0, this.bounds.w - this.viewW);
    const maxY = Math.max(0, this.bounds.h - this.viewH);
    this.x = Math.min(Math.max(this.x, 0), maxX);
    this.y = Math.min(Math.max(this.y, 0), maxY);
    // Maps narrower than the view get centred rather than pinned left.
    if (this.bounds.w < this.viewW) this.x = (this.bounds.w - this.viewW) / 2;
    if (this.bounds.h < this.viewH) this.y = (this.bounds.h - this.viewH) / 2;
  }

  /** Rounded to whole pixels so tiles never sample between texels. */
  get renderX() { return Math.round(this.x + this.offsetX); }
  get renderY() { return Math.round(this.y + this.offsetY); }

  worldToScreen(x, y) { return { x: (x - this.renderX) * this.zoom, y: (y - this.renderY) * this.zoom }; }

  /** True when a world-space box is anywhere near the view — used to skip draws. */
  isVisible(x, y, w, h, margin = 32) {
    return x + w >= this.x - margin && x <= this.x + this.viewW + margin
        && y + h >= this.y - margin && y <= this.y + this.viewH + margin;
  }
}
