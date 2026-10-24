import { TILE } from '../config/Constants.js';
import { Assets } from '../core/AssetManager.js';

/**
 * A loaded map: two tile layers, a collision grid, lights, triggers and the
 * raw entity list. The JSON format is intentionally Tiled-shaped (flat,
 * row-major arrays) so exporting from Tiled later needs no engine changes.
 */
export class TileMap {
  constructor(data) {
    this.data = data;
    this.id = data.id;
    this.displayName = data.displayName || data.id;
    this.width = data.width;
    this.height = data.height;
    this.tileSize = data.tileSize || TILE;
    this.ground = data.layers.ground;
    this.decor = data.layers.decor || [];
    this.overhead = data.layers.overhead || null;   // drawn above entities
    this.collision = data.collision;
    this.lights = data.lights || [];
    this.triggers = data.triggers || [];
    this.spawns = data.spawns || {};
    this.ambient = data.ambient || {};

    this.tileset = Assets.image('tileset');
    this.tilesPerRow = this.tileset ? Math.floor(this.tileset.width / this.tileSize) : 8;
  }

  get pixelWidth() { return this.width * this.tileSize; }
  get pixelHeight() { return this.height * this.tileSize; }

  index(tx, ty) { return ty * this.width + tx; }
  inBounds(tx, ty) { return tx >= 0 && ty >= 0 && tx < this.width && ty < this.height; }

  isSolidTile(tx, ty) {
    if (!this.inBounds(tx, ty)) return true;      // outside the map is a wall
    return this.collision[this.index(tx, ty)] === 1;
  }

  isSolidAt(px, py) { return this.isSolidTile(Math.floor(px / this.tileSize), Math.floor(py / this.tileSize)); }

  /** Runtime edits (a door opening, a wall collapsing) go through here. */
  setSolid(tx, ty, solid) { if (this.inBounds(tx, ty)) this.collision[this.index(tx, ty)] = solid ? 1 : 0; }
  setTile(layer, tx, ty, tileIndex) {
    const target = layer === 'decor' ? this.decor : this.ground;
    if (this.inBounds(tx, ty)) target[this.index(tx, ty)] = tileIndex;
  }

  spawn(name) { return this.spawns[name] || this.spawns.default || { x: this.pixelWidth / 2, y: this.pixelHeight / 2, facing: 'down' }; }

  /** Trigger whose rectangle contains this point, or null. */
  triggerAt(x, y) {
    for (const trigger of this.triggers) {
      if (x >= trigger.x && x <= trigger.x + trigger.w && y >= trigger.y && y <= trigger.y + trigger.h) return trigger;
    }
    return null;
  }

  /**
   * Draws one layer, clipped to the camera. Only the tiles actually on screen
   * are touched — a 200x200 map costs the same as a 40x32 one.
   */
  renderLayer(ctx, camera, layerName = 'ground') {
    const layer = layerName === 'decor' ? this.decor : layerName === 'overhead' ? this.overhead : this.ground;
    if (!layer || !this.tileset) return;
    const ts = this.tileSize;
    const x0 = Math.max(0, Math.floor(camera.renderX / ts));
    const y0 = Math.max(0, Math.floor(camera.renderY / ts));
    const x1 = Math.min(this.width - 1, Math.ceil((camera.renderX + camera.viewW) / ts));
    const y1 = Math.min(this.height - 1, Math.ceil((camera.renderY + camera.viewH) / ts));

    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const tile = layer[this.index(tx, ty)];
        if (tile === undefined || tile < 0) continue;
        const sx = (tile % this.tilesPerRow) * ts;
        const sy = Math.floor(tile / this.tilesPerRow) * ts;
        ctx.drawImage(
          this.tileset, sx, sy, ts, ts,
          tx * ts - camera.renderX, ty * ts - camera.renderY, ts, ts
        );
      }
    }
  }

  renderCollisionDebug(renderer, camera) {
    const ts = this.tileSize;
    const ctx = renderer.ctx;
    ctx.strokeStyle = 'rgba(196,85,63,0.6)';
    for (let ty = 0; ty < this.height; ty++) {
      for (let tx = 0; tx < this.width; tx++) {
        if (!this.isSolidTile(tx, ty)) continue;
        const x = tx * ts - camera.renderX;
        const y = ty * ts - camera.renderY;
        if (x < -ts || y < -ts || x > camera.viewW || y > camera.viewH) continue;
        ctx.strokeRect(x + 0.5, y + 0.5, ts - 1, ts - 1);
      }
    }
    ctx.strokeStyle = 'rgba(127,224,168,0.8)';
    for (const trigger of this.triggers) {
      ctx.strokeRect(trigger.x - camera.renderX + 0.5, trigger.y - camera.renderY + 0.5, trigger.w - 1, trigger.h - 1);
    }
  }
}
