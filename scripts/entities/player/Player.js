import { Entity } from '../Entity.js';
import { Animator } from '../../core/Animation.js';
import { Assets } from '../../core/AssetManager.js';
import { Input } from '../../core/Input.js';
import { GameState } from '../../core/GameState.js';
import { moveAndCollide } from '../../core/Collision.js';
import { Audio } from '../../systems/AudioSystem.js';
import { Events } from '../../core/EventBus.js';
import { Survival } from '../../systems/SurvivalSystem.js';
import { getItem } from '../items/ItemDatabase.js';
import { getWeapon } from '../../data/weapons.js';
import { hitEntitiesInBox } from '../../core/Combat.js';
import { Projectile } from '../Projectile.js';
import { Throwable } from '../Throwable.js';
import { Notifications } from '../../systems/NotificationSystem.js';
import { t } from '../../core/I18n.js';
import { PALETTE } from '../../config/Constants.js';

const SPRINT_MULTIPLIER = 1.7;
const SPRINT_DRAIN = 28;      // stamina per second
const SPRINT_RECOVER = 18;
const ACCEL = 900;            // pixels/s^2 — high enough to feel instant, low
const FRICTION = 1200;        // enough to avoid the "ice skating" of raw input
const FACING_ANGLE = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };

export class Player extends Entity {
  constructor({ x, y, facing = 'down' }) {
    super({ id: 'player', x, y });
    this.facing = facing;
    this.faction = 'player';
    this.hitbox = { w: 10, h: 7, ox: 0, oy: 0 };
    this.solid = false;                 // the player pushes past nothing, but
    this.canMove = true;                // walls and solid entities still stop them
    this.invulnerable = 0;
    this.stepTimer = 0;
    this.sprinting = false;
    this.attackCooldown = 0;

    this.animator = new Animator(Assets.image('player_doctor'), 16, 24)
      .addDirectional('idle', [0], 1)
      .addDirectional('walk', [0, 1, 2, 3], 8);
    this.animator.play(`idle_${this.facing}`);

    /** Handheld light. Radius breathes slightly so it never looks static. */
    this.light = { x, y, radius: 68, color: '#cfe6df', intensity: 0.95, flicker: 0.04 };
  }

  get stats() { return GameState.player; }

  update(dt, scene) {
    super.update(dt, scene);
    if (this.invulnerable > 0) this.invulnerable -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    const axis = this.canMove && this.stunTimer <= 0 ? Input.axis() : { x: 0, y: 0 };
    const moving = axis.x !== 0 || axis.y !== 0;

    // Sprint: only while actually moving, and only while there is stamina left.
    const wantsSprint = Input.isDown('sprint') && moving && this.stats.stamina > 1;
    this.sprinting = wantsSprint;
    if (wantsSprint) this.stats.stamina = Math.max(0, this.stats.stamina - SPRINT_DRAIN * dt);
    else this.stats.stamina = Math.min(GameState.derivedStat('maxStamina'), this.stats.stamina + SPRINT_RECOVER * dt);

    const maxSpeed = GameState.derivedStat('speed') * (this.sprinting ? SPRINT_MULTIPLIER : 1) * Survival.speedMultiplier();
    const targetX = axis.x * maxSpeed;
    const targetY = axis.y * maxSpeed;
    this.vx = approach(this.vx, targetX, (moving ? ACCEL : FRICTION) * dt);
    this.vy = approach(this.vy, targetY, (moving ? ACCEL : FRICTION) * dt);

    if (Math.abs(this.vx) > 1 || Math.abs(this.vy) > 1) {
      moveAndCollide(this, this.vx * dt, this.vy * dt, scene.map, scene.solidEntities());
    }

    if (moving) {
      // Prefer the dominant axis, but keep the current facing when it is tied,
      // so diagonal walking does not flicker between two sprites.
      if (Math.abs(axis.x) > Math.abs(axis.y)) this.facing = axis.x > 0 ? 'right' : 'left';
      else if (Math.abs(axis.y) > 0) this.facing = axis.y > 0 ? 'down' : 'up';
      this.animator.play(`walk_${this.facing}`);
      this.animator.speedScale = this.sprinting ? 1.45 : 1;
      this.footsteps(dt, scene);
    } else {
      this.animator.play(`idle_${this.facing}`);
      this.stepTimer = 0.18;
    }

    this.light.x = this.x;
    this.light.y = this.y - 10;
    this.light.radius = 66 + Math.sin(performance.now() / 900) * 3;
    scene.lighting.addDynamic(this.light);

    this.stats.facing = this.facing;
    this.stats.x = this.x;
    this.stats.y = this.y;
  }

  footsteps(dt, scene) {
    this.stepTimer -= dt * (this.sprinting ? 1.5 : 1);
    if (this.stepTimer > 0) return;
    this.stepTimer = 0.34;
    Audio.playSfx('footstep', { volume: 0.5, variation: 0.12 });
    scene.particles.burst(this.x, this.y, 2, { color: '#4a5559', speed: 10, life: 0.35, gravity: -6, alpha: 0.5 });
  }

  /** A point just in front of the player, used to find what they are facing. */
  interactPoint(distance = 12) {
    const offsets = { down: [0, distance], up: [0, -distance], left: [-distance, 0], right: [distance, 0] };
    const [dx, dy] = offsets[this.facing] || [0, distance];
    return { x: this.x + dx, y: this.y - 4 + dy };
  }

  /** Uses whatever's in the 'weapon' equip slot. No-op (with a denial cue) if empty. */
  attack(scene) {
    if (this.attackCooldown > 0 || this.stunTimer > 0) return;
    const weaponItemId = GameState.equipment.get('weapon');
    const itemDef = weaponItemId && getItem(weaponItemId);
    const weapon = itemDef?.weaponId ? getWeapon(itemDef.weaponId) : null;
    if (!weapon || weapon.category === 'throwable') {
      Audio.playSfx('ui_back', { volume: 0.5 });
      Notifications.push(t('notify.noWeapon'));
      return;
    }
    this.attackCooldown = weapon.cooldown;

    if (weapon.category === 'melee') {
      const point = this.interactPoint(weapon.range * 0.6);
      const half = weapon.range / 2;
      const box = { x: point.x - half, y: point.y - half, w: weapon.range, h: weapon.range };
      hitEntitiesInBox(scene, box, weapon.damage, { sourceFaction: 'player', source: this, type: 'melee' });
      Audio.playSfx('attack_melee');
      scene.particles.burst(point.x, point.y, 6, { color: PALETTE.bone, speed: 36, life: 0.22 });
      return;
    }

    // Ranged: pistol / rifle / shotgun, all just differently-shaped Projectile bursts.
    if (weapon.ammoType && !GameState.inventory.has(weapon.ammoType, 1)) {
      Audio.playSfx('ui_back', { volume: 0.5 });
      Notifications.push(t('notify.noAmmo'));
      this.attackCooldown = 0.15;   // short cooldown so finding ammo doesn't feel locked out
      return;
    }
    if (weapon.ammoType) GameState.inventory.remove(weapon.ammoType, 1);

    const baseAngle = FACING_ANGLE[this.facing] ?? 0;
    const { pellets = 1, spread = 0, speed, life } = weapon.projectile;
    for (let i = 0; i < pellets; i++) {
      const jitter = (Math.random() * 2 - 1) * spread;
      scene.entities.push(new Projectile({
        x: this.x, y: this.y - 10, angle: baseAngle + jitter,
        speed, damage: weapon.damage, faction: 'player', life,
      }));
    }
    Audio.playSfx('attack_gun');
  }

  /** Throws the first throwable-category item in the bag (grenades, ...). */
  throwItem(scene) {
    if (this.stunTimer > 0) return;
    const slot = GameState.inventory.slots.find((s) => {
      const def = getItem(s.itemId);
      return def?.weaponId && getWeapon(def.weaponId)?.category === 'throwable';
    });
    if (!slot) {
      Audio.playSfx('ui_back', { volume: 0.5 });
      Notifications.push(t('notify.noThrowable'));
      return;
    }
    const weapon = getWeapon(getItem(slot.itemId).weaponId);
    GameState.inventory.remove(slot.itemId, 1);
    const angle = FACING_ANGLE[this.facing] ?? 0;
    scene.entities.push(new Throwable({
      x: this.x, y: this.y - 8, angle, speed: weapon.throwSpeed, fuse: weapon.fuse,
      damage: weapon.damage, radius: weapon.radius, faction: 'player',
    }));
    Audio.playSfx('throw');
  }

  takeDamage(amount, source, scene) {
    if (this.invulnerable > 0) return false;
    // Armor chips damage down but never fully zeroes it out.
    const mitigated = Math.max(1, amount - GameState.derivedStat('armor'));
    this.stats.hp = Math.max(0, this.stats.hp - mitigated);
    this.invulnerable = 0.9;
    this.flashTimer = 0.25;
    Audio.playSfx('hurt');
    scene.camera.shake(0.5);
    scene.particles.burst(this.x, this.y - 10, 10, { color: '#c4553f', speed: 40, life: 0.4, gravity: 60 });
    // Knockback away from whatever hit them.
    if (source) {
      const angle = Math.atan2(this.y - source.y, this.x - source.x);
      this.vx = Math.cos(angle) * 120;
      this.vy = Math.sin(angle) * 120;
    }
    Events.emit('player:damaged', { amount: mitigated, hp: this.stats.hp });
    if (this.stats.hp <= 0) Events.emit('player:down');
    return true;
  }

  render(renderer, camera) {
    // Blink while invulnerable.
    if (this.invulnerable > 0 && Math.floor(this.invulnerable * 16) % 2 === 0) return;
    super.render(renderer, camera);
  }
}

function approach(value, target, step) {
  if (value < target) return Math.min(value + step, target);
  if (value > target) return Math.max(value - step, target);
  return value;
}
