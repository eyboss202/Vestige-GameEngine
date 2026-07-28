let nextId = 1;

/**
 * Base for everything that lives on a map.
 *
 * Position convention: (x, y) is the entity's *feet* — bottom-centre of the
 * sprite. That makes depth sorting, shadows and tile collision all fall out
 * naturally, and it is what every subclass assumes.
 */
export class Entity {
  constructor({ id = null, x = 0, y = 0 } = {}) {
    this.id = id || `entity_${nextId++}`;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    /** Collision box, anchored at the feet. */
    this.hitbox = { w: 10, h: 7, ox: 0, oy: 0 };
    this.spriteW = 16;
    this.spriteH = 24;
    this.animator = null;
    this.facing = 'down';
    this.solid = false;         // blocks other entities
    this.dead = false;          // scheduled for removal at end of frame
    /** Combat targeting (core/Combat.js): null/'' means "can't be hit". */
    this.faction = null;
    this.interactable = false;
    this.interactRadius = 20;
    this.shadow = true;
    this.tint = null;
    this.flashTimer = 0;
    /** Set by electric traps; subclasses that can act check this and skip. */
    this.stunTimer = 0;
  }

  /** World-space collision rectangle. */
  getBox() {
    return {
      x: this.x - this.hitbox.w / 2 + this.hitbox.ox,
      y: this.y - this.hitbox.h + this.hitbox.oy,
      w: this.hitbox.w,
      h: this.hitbox.h,
    };
  }

  /** Used for y-sorting; override for entities that should always draw behind. */
  get depth() { return this.y; }

  update(dt, scene) {
    this.animator?.update(dt);
    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.stunTimer > 0) this.stunTimer -= dt;
  }

  /** Called when the player presses interact while facing this entity. */
  interact(scene) {}

  render(renderer, camera) {
    const ctx = renderer.ctx;
    const sx = Math.round(this.x - camera.renderX);
    const sy = Math.round(this.y - camera.renderY);

    if (this.shadow) {
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.beginPath();
      ctx.ellipse(sx, sy - 1, this.hitbox.w / 2 + 1, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.animator) {
      this.animator.draw(ctx, sx - this.spriteW / 2, sy - this.spriteH);
      // White flash on hit: redraw the same frame as a solid silhouette.
      if (this.flashTimer > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, this.flashTimer * 4);
        this.animator.draw(ctx, sx - this.spriteW / 2, sy - this.spriteH);
        ctx.restore();
      }
    }
  }

  renderDebug(renderer, camera) {
    const box = this.getBox();
    renderer.outline(box.x - camera.renderX, box.y - camera.renderY, box.w, box.h, '#c4553f');
  }
}
