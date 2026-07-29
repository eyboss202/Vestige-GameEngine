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
    /** Collision box, anchored at the feet. Deliberately small (just the
     *  footprint) — this is what moveAndCollide() slides along walls and
     *  other solids with, and a tall box here makes an entity stop a
     *  head-height's distance from a wall it hasn't visually reached yet. */
    this.hitbox = { w: 10, h: 7, ox: 0, oy: 0 };
    /** Combat AABB, anchored at the feet like hitbox. Sized to the visible
     *  sprite rather than the footprint, so melee/projectile hits that
     *  visually connect (core/Combat.js hitEntitiesInBox) actually register —
     *  see getHurtBox(). w=10, h=24 is Player's own measured silhouette
     *  (tools/gen_art.py draw_char, union of ink across all 4 facings: the
     *  body is 10px wide and the art reaches both the top and bottom edge of
     *  the 16x24 sheet in at least one facing — hair/tuft at the top, feet at
     *  the bottom). Enemy.js overrides this per archetype (data/enemies.js
     *  `hurtboxW`, scaled by `scale`) since each has a different silhouette. */
    this.hurtbox = { w: 10, h: 24, ox: 0, oy: 0 };
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
    /** Locale key for the HUD's interact prompt (ui/HUD.js) — null falls
     *  back to the generic "Examine". Subclasses that mean something more
     *  specific (take/open/talk/read) set their own. */
    this.promptKey = null;
    this.shadow = true;
    this.tint = null;
    this.flashTimer = 0;
    /** Set by electric traps; subclasses that can act check this and skip. */
    this.stunTimer = 0;
  }

  /** World-space collision rectangle — walls/solid entities (core/Collision.js). */
  getBox() {
    return {
      x: this.x - this.hitbox.w / 2 + this.hitbox.ox,
      y: this.y - this.hitbox.h + this.hitbox.oy,
      w: this.hitbox.w,
      h: this.hitbox.h,
    };
  }

  /** World-space combat rectangle — what melee/projectile hits are tested
   *  against (core/Combat.js). See the hurtbox field comment above for why
   *  this is separate from getBox(). */
  getHurtBox() {
    return {
      x: this.x - this.hurtbox.w / 2 + this.hurtbox.ox,
      y: this.y - this.hurtbox.h + this.hurtbox.oy,
      w: this.hurtbox.w,
      h: this.hurtbox.h,
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
    // Hurtbox first (what combat actually tests against — see getHurtBox())
    // in the brighter colour since it's the one that matters for "does this
    // fit the sprite"; the small movement footprint (getBox()) underneath it
    // in dim red so the two are never confused for each other again.
    const box = this.getBox();
    renderer.outline(box.x - camera.renderX, box.y - camera.renderY, box.w, box.h, '#c4553f');
    const hurt = this.getHurtBox();
    renderer.outline(hurt.x - camera.renderX, hurt.y - camera.renderY, hurt.w, hurt.h, '#7fe0a8');
  }
}
