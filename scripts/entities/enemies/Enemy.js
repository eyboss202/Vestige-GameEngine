import { Entity } from '../Entity.js';
import { Animator } from '../../core/Animation.js';
import { Assets } from '../../core/AssetManager.js';
import { moveAndCollide, distance } from '../../core/Collision.js';
import { getArchetype } from '../../data/enemies.js';
import { Events } from '../../core/EventBus.js';
import { rollLoot } from '../../data/lootTables.js';
import { ItemPickup } from '../items/ItemPickup.js';
import { Projectile } from '../Projectile.js';
import { Audio } from '../../systems/AudioSystem.js';

let nextDropId = 1;
/** How close a melee enemy closes in before it stops — just inside the
 *  touch-damage range (12), so it still lands hits without ever needing to
 *  reach the player's exact position. */
const MELEE_STOP_DISTANCE = 9;

/**
 * Generic hostile. The state machine is deliberately small — idle, patrol,
 * chase, hurt, dead — because that is the skeleton every future enemy shares.
 * A boss subclasses this and adds states; it does not rewrite it.
 */
export class Enemy extends Entity {
  constructor({ id, x, y, archetype = 'husk', patrol = null }) {
    super({ id, x, y });
    this.def = getArchetype(archetype);
    this.hp = this.def.hp;
    this.maxHp = this.def.hp;
    this.faction = 'enemy';
    this.solid = true;
    this.hitbox = { w: 10, h: 7, ox: 0, oy: 0 };

    this.patrolPath = patrol;
    this.patrolIndex = 0;
    this.state = patrol ? 'patrol' : 'idle';
    this.stateTimer = 0;
    this.touchTimer = 0;
    this.fireCooldown = 0;
    this.home = { x, y };

    this.animator = new Animator(Assets.image(this.def.sprite), 16, 24)
      .addDirectional('idle', [0], 1)
      .addDirectional('walk', [0, 1, 2, 3], 6);
    this.animator.play('idle_down');

    this.aura = this.def.aura ? { ...this.def.aura, x, y } : null;
  }

  setState(state, duration = 0) {
    if (this.state === state) return;
    this.state = state;
    this.stateTimer = duration;
    Events.emit('enemy:state', { id: this.id, state });
  }

  update(dt, scene) {
    super.update(dt, scene);
    if (this.dead) return;
    if (this.stunTimer > 0) { this.animator.play(`idle_${this.facing}`); return; }
    if (this.touchTimer > 0) this.touchTimer -= dt;
    if (this.stateTimer > 0) this.stateTimer -= dt;

    const player = scene.player;
    const distToPlayer = player ? distance(this, player) : Infinity;

    switch (this.state) {
      case 'hurt':
        if (this.stateTimer <= 0) this.setState(this.patrolPath ? 'patrol' : 'idle');
        break;

      case 'idle':
        this.animator.play(`idle_${this.facing}`);
        if (distToPlayer < this.def.detectRadius) this.setState('chase');
        break;

      case 'patrol':
        this.followPath(dt, scene);
        if (distToPlayer < this.def.detectRadius) this.setState('chase');
        break;

      case 'chase':
        if (distToPlayer > this.def.loseRadius) { this.setState(this.patrolPath ? 'patrol' : 'return'); break; }
        if (this.def.behavior === 'ranged') this.chaseRanged(dt, scene, player, distToPlayer);
        else {
          // Stop just short of the player instead of walking fully onto their
          // tile — the player isn't a physics obstacle (Player.solid = false),
          // so without this an enemy can reach exact/near-exact overlap with
          // them, which used to be able to freeze the player's own movement.
          if (distToPlayer > MELEE_STOP_DISTANCE) this.moveToward(player.x, player.y, this.def.chaseSpeed, dt, scene);
          else this.facePlayer(player);
          if (distToPlayer < 12 && this.touchTimer <= 0) {
            if (player.takeDamage(this.def.damage, this, scene)) this.touchTimer = this.def.touchCooldown;
          }
        }
        break;

      case 'return':
        this.moveToward(this.home.x, this.home.y, this.def.speed, dt, scene);
        if (distance(this, this.home) < 4) this.setState('idle');
        if (distToPlayer < this.def.detectRadius) this.setState('chase');
        break;
      default:
        break;
    }

    if (this.aura) { this.aura.x = this.x; this.aura.y = this.y - 10; scene.lighting.addDynamic(this.aura); }
  }

  /** Turns to face a target and idles — used once an enemy has closed to its
   *  stopping distance and has nowhere useful left to walk. */
  facePlayer(target) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    this.animator.play(`idle_${this.facing}`);
  }

  /** Ranged behaviour: hold at `preferredRange` instead of closing to melee,
   *  firing a Projectile on a cooldown. Everything else (detect/lose/hurt) is
   *  shared with the melee state machine above it. */
  chaseRanged(dt, scene, player, distToPlayer) {
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    const preferred = this.def.preferredRange ?? 90;

    if (distToPlayer > preferred + 12) {
      this.moveToward(player.x, player.y, this.def.chaseSpeed, dt, scene);
    } else if (distToPlayer < preferred - 24) {
      this.moveToward(2 * this.x - player.x, 2 * this.y - player.y, this.def.speed, dt, scene);
    } else {
      this.facePlayer(player);
    }

    if (this.fireCooldown <= 0) {
      this.fireCooldown = this.def.fireRate ?? 1.5;
      const angle = Math.atan2(player.y - this.y, player.x - this.x);
      scene.entities.push(new Projectile({
        x: this.x, y: this.y - 10, angle, speed: this.def.projectileSpeed ?? 150,
        damage: this.def.damage, faction: 'enemy', life: 1.6, color: this.def.accent,
      }));
      Audio.playSfx('attack_gun', { volume: 0.35, rate: 0.75, variation: 0.05 });
    }
  }

  followPath(dt, scene) {
    if (!this.patrolPath?.length) { this.setState('idle'); return; }
    const [tx, ty] = this.patrolPath[this.patrolIndex];
    if (Math.hypot(tx - this.x, ty - this.y) < 3) {
      this.patrolIndex = (this.patrolIndex + 1) % this.patrolPath.length;
      this.setState('idle', 0.8 + Math.random());   // pause at each waypoint
      return;
    }
    this.moveToward(tx, ty, this.def.speed, dt, scene);
  }

  moveToward(tx, ty, speed, dt, scene) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    const result = moveAndCollide(this, (dx / dist) * speed * dt, (dy / dist) * speed * dt, scene.map, scene.solidEntities());
    // Nudge sideways when stuck: a placeholder for real pathfinding later.
    if (result.hitX && Math.abs(dy) < 1) this.y += (Math.random() < 0.5 ? -1 : 1) * speed * dt;
    if (result.hitY && Math.abs(dx) < 1) this.x += (Math.random() < 0.5 ? -1 : 1) * speed * dt;
    this.animator.play(`walk_${this.facing}`);
  }

  takeDamage(amount, source, scene, type = 'melee') {
    if (this.dead) return;
    const resist = this.def.resistances?.[type] ?? 0;
    const mitigated = Math.max(1, Math.round(amount * (1 - resist)) - (this.def.armor ?? 0));
    this.hp -= mitigated;
    this.flashTimer = 0.2;
    scene?.particles.burst(this.x, this.y - 10, 8, { color: this.def.accent, speed: 40, life: 0.4, gravity: 50 });
    if (this.hp <= 0) { this.die(scene); return; }
    this.setState('hurt', this.def.hurtTime);
    if (source) {
      const angle = Math.atan2(this.y - source.y, this.x - source.x);
      this.x += Math.cos(angle) * 4;
      this.y += Math.sin(angle) * 4;
    }
  }

  /** Overrides Entity.render() to add data-driven tint/scale — how enemy
   *  variety looks distinct while every archetype still shares one sprite
   *  sheet (see data/enemies.js `tint`/`scale`). */
  render(renderer, camera) {
    const scale = this.def.scale ?? 1;
    if (scale === 1 && !this.def.tint) { super.render(renderer, camera); return; }

    const ctx = renderer.ctx;
    const sx = Math.round(this.x - camera.renderX);
    const sy = Math.round(this.y - camera.renderY);

    if (this.shadow) {
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.beginPath();
      ctx.ellipse(sx, sy - 1, (this.hitbox.w / 2 + 1) * scale, 2.5 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!this.animator) return;

    const dw = this.spriteW * scale;
    const dh = this.spriteH * scale;
    const dx = sx - dw / 2;
    const dy = sy - dh;
    this.animator.draw(ctx, dx, dy, dw, dh);

    if (this.def.tint) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = this.def.tint;
      ctx.fillRect(dx, dy, dw, dh);
      ctx.restore();
    }
    if (this.flashTimer > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, this.flashTimer * 4);
      this.animator.draw(ctx, dx, dy, dw, dh);
      ctx.restore();
    }
  }

  die(scene) {
    this.dead = true;
    scene?.particles.burst(this.x, this.y - 10, 20, { color: this.def.accent, speed: 55, life: 0.7, gravity: 30 });
    if (scene && this.def.lootTable) {
      for (const drop of rollLoot(this.def.lootTable)) {
        const angle = Math.random() * Math.PI * 2;
        scene.entities.push(new ItemPickup({
          id: `drop_${this.id}_${nextDropId++}`,
          x: this.x + Math.cos(angle) * 6,
          y: this.y + Math.sin(angle) * 4,
          itemId: drop.itemId,
          qty: drop.qty,
        }));
      }
    }
    Events.emit('enemy:died', { id: this.id, archetype: this.def.id });
  }
}
