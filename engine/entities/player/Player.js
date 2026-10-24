import { Entity } from '../Entity.js';
import { Animator } from '../../core/Animation.js';
import { Assets } from '../../core/AssetManager.js';
import { Input } from '../../core/Input.js';
import { GameState } from '../../core/GameState.js';
import { moveAndCollide } from '../../core/Collision.js';
import { Audio } from '../../systems/AudioSystem.js';
import { Events } from '../../core/EventBus.js';
import { Survival } from '../../systems/SurvivalSystem.js';
import { getItem, getWeapon, Content } from '../../core/Content.js';
import { hitEntitiesInBox } from '../../core/Combat.js';
import { Projectile } from '../Projectile.js';
import { Throwable } from '../Throwable.js';
import { Notifications } from '../../systems/NotificationSystem.js';
import { t, localised } from '../../core/I18n.js';
import { PALETTE, ARMOR_DEGRADE_PER_HIT } from '../../config/Constants.js';

const SPRINT_MULTIPLIER = 1.7;
const SPRINT_DRAIN = 28;      // stamina per second
const SPRINT_RECOVER = 18;
const ACCEL = 900;            // pixels/s^2 — high enough to feel instant, low
const FRICTION = 1200;        // enough to avoid the "ice skating" of raw input
const FACING_ANGLE = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };

/** Collapse choreography for startDeath() — see Player.update()/render()'s
 *  `dying` branch and GameScene's death handling, which sizes its own freeze
 *  timer off DEATH_TOTAL so the You Died screen only appears once this has
 *  actually finished playing. */
const DEATH_TIP_TIME = 0.65;    // falls from standing to flat on the ground
const DEATH_HOLD_TIME = 0.65;   // beat on the ground before fading
const DEATH_FADE_TIME = 0.6;    // fades out while the screen washes red/black
/** GameScene reads this to size the freeze it holds before cutting to
 *  DeathScene, so the You Died screen only appears once this has actually
 *  finished playing instead of on its own unrelated timer. */
export const DEATH_TOTAL = DEATH_TIP_TIME + DEATH_HOLD_TIME + DEATH_FADE_TIME;
/** How far the sprite tips over, in radians — short of a full 90 degrees so
 *  it still reads as "collapsed", not "flattened into the floor". */
const DEATH_TIP_ANGLE = Math.PI * 0.46;

/** Image keys for the player's sheets come from the game's config
 *  (core/Content.js `config.player`): `sprite` is the bare sheet,
 *  `weaponSprites` maps a weapon category to a sheet with that weapon drawn
 *  in hand (see tools/gen_art.py build_player()), and `deadSprite` is the
 *  corpse variant swapped in by startDeath(). A new weapon needs nothing here
 *  as long as its category already has a sheet; a category without one just
 *  keeps the bare sheet. */
const playerSprites = () => Content.config.player;

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
    this.reloadTimer = 0;
    /** Set by startDeath() once hp hits 0 — see update()/render()'s `dying`
     *  branch and GameScene's death handling. */
    this.dying = false;
    this.deathElapsed = 0;

    this.animator = new Animator(Assets.image(playerSprites().sprite), 16, 24)
      .addDirectional('idle', [0], 1)
      .addDirectional('walk', [0, 1, 2, 3], 8);
    this.animator.play(`idle_${this.facing}`);
    /** Asset key the animator's sheet currently matches — see
     *  syncWeaponSheet(). Starts null (bare sheet) same as an empty weapon slot. */
    this.heldSheet = null;

    /** Handheld light. Radius breathes slightly so it never looks static. */
    this.light = { x, y, radius: 68, color: '#cfe6df', intensity: 0.95, flicker: 0.04 };
  }

  get stats() { return GameState.player; }

  /** Starts the collapse animation — called once by GameScene on
   *  `player:down` (hp hit 0). Freezes input immediately; render() does the
   *  actual tip-over/fade based on deathElapsed. Idempotent so a hit landing
   *  while it's already playing can't restart it. */
  startDeath() {
    if (this.dying) return;
    this.dying = true;
    this.deathElapsed = 0;
    this.canMove = false;
    this.vx = this.vy = 0;
    // Bloodied corpse variant for the collapse — same clip/frame grid as
    // every other sheet, so renderDeath()'s already-playing animation just
    // keeps going on different art with no other change needed.
    if (playerSprites().deadSprite) this.animator.image = Assets.image(playerSprites().deadSprite);
  }

  update(dt, scene) {
    if (this.dying) {
      this.deathElapsed += dt;
      if (this.flashTimer > 0) this.flashTimer -= dt;
      // The lantern gutters out along with them rather than just vanishing
      // the instant control freezes — one less thing that reads as a glitch.
      this.light.intensity = Math.max(0, 0.95 * (1 - this.deathElapsed / DEATH_TOTAL));
      scene.lighting.addDynamic(this.light);
      return;
    }
    super.update(dt, scene);
    if (this.invulnerable > 0) this.invulnerable -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.reloadTimer > 0) this.reloadTimer -= dt;
    this.syncWeaponSheet();

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

  /** Currently equipped weapon item + its game/data/weapons.js archetype, or nulls. */
  weaponHeld() {
    const weaponItemId = GameState.equipment.get('weapon');
    const itemDef = weaponItemId && getItem(weaponItemId);
    const weapon = itemDef?.weaponId ? getWeapon(itemDef.weaponId) : null;
    return { weaponItemId, itemDef, weapon };
  }

  /** Swaps the animator onto the sheet matching whatever's equipped — see
   *  `config.player.weaponSprites` — the instant it changes, so the held item is just part of
   *  the body texture again rather than a separately composited icon. Clips
   *  (rows/columns) are identical across every sheet, so only the underlying
   *  image needs to change; the current clip/frame/timer carry over untouched. */
  syncWeaponSheet() {
    const { weapon } = this.weaponHeld();
    const sheet = weapon ? playerSprites().weaponSprites[weapon.category] ?? null : null;
    if (sheet === this.heldSheet) return;
    this.heldSheet = sheet;
    this.animator.image = Assets.image(sheet ?? playerSprites().sprite);
  }

  /** Refuses a broken weapon with a denial cue; @returns true if it's usable. */
  checkDurability(weaponItemId, itemDef) {
    const max = itemDef.durability?.max;
    if (!max || GameState.getDurability(weaponItemId, max) > 0) return true;
    Audio.playSfx('ui_back', { volume: 0.5 });
    Notifications.push(t('notify.broken', { name: localised(itemDef.name) }));
    return false;
  }

  /** Chips one use of durability off, surfacing a one-time "just broke" toast. */
  wearWeapon(weaponItemId, itemDef, amount = 1) {
    const max = itemDef.durability?.max;
    if (!max) return;
    const { broke } = GameState.damageDurability(weaponItemId, amount, max);
    if (broke) Notifications.push(t('notify.broken', { name: localised(itemDef.name) }));
  }

  /** Uses whatever's in the 'weapon' equip slot. No-op (with a denial cue) if empty. */
  attack(scene) {
    if (this.attackCooldown > 0 || this.stunTimer > 0 || this.reloadTimer > 0) return;
    const { weaponItemId, itemDef, weapon } = this.weaponHeld();
    if (!weapon || weapon.category === 'throwable') {
      Audio.playSfx('ui_back', { volume: 0.5 });
      Notifications.push(t('notify.noWeapon'));
      return;
    }
    if (!this.checkDurability(weaponItemId, itemDef)) { this.attackCooldown = 0.2; return; }
    this.attackCooldown = weapon.cooldown;

    if (weapon.category === 'melee') {
      const point = this.interactPoint(weapon.range * 0.6);
      const half = weapon.range / 2;
      const box = { x: point.x - half, y: point.y - half, w: weapon.range, h: weapon.range };
      hitEntitiesInBox(scene, box, weapon.damage, { sourceFaction: 'player', source: this, type: 'melee' });
      Audio.playSfx('attack_melee');
      scene.particles.burst(point.x, point.y, 6, { color: PALETTE.bone, speed: 36, life: 0.22 });
      this.wearWeapon(weaponItemId, itemDef);
      return;
    }

    // Ranged: pistol / rifle / shotgun. Fires from the weapon's own magazine
    // (GameState.weaponAmmo) — reload() is what pulls from the inventory
    // reserve, not the shot itself. See systems/InventorySystem.js ammo items.
    const magazineSize = weapon.magazineSize ?? Infinity;
    const clip = GameState.getWeaponAmmo(weaponItemId, magazineSize);
    if (clip <= 0) {
      Audio.playSfx('ui_back', { volume: 0.5 });
      Notifications.push(t('notify.noAmmo'));
      this.attackCooldown = 0.15;   // short cooldown so reloading doesn't feel locked out
      return;
    }
    GameState.setWeaponAmmo(weaponItemId, clip - 1);

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
    this.wearWeapon(weaponItemId, itemDef);
  }

  /** Manually tops the equipped weapon's magazine off the inventory's ammo
   *  reserve. No-op (with a denial cue) if there's nothing to gain from it. */
  reload() {
    if (this.stunTimer > 0 || this.reloadTimer > 0) return;
    const { weaponItemId, itemDef, weapon } = this.weaponHeld();
    if (!weapon?.ammoType || !weapon.magazineSize) {
      Audio.playSfx('ui_back', { volume: 0.4 });
      return;
    }
    if (!this.checkDurability(weaponItemId, itemDef)) return;

    const clip = GameState.getWeaponAmmo(weaponItemId, weapon.magazineSize);
    if (clip >= weapon.magazineSize) {
      Notifications.push(t('notify.magFull'));
      Audio.playSfx('ui_back', { volume: 0.4 });
      return;
    }
    const reserve = GameState.inventory.quantity(weapon.ammoType);
    if (reserve <= 0) {
      Notifications.push(t('notify.noAmmoReserve'));
      Audio.playSfx('ui_back', { volume: 0.5 });
      return;
    }
    const taken = Math.min(weapon.magazineSize - clip, reserve);
    GameState.inventory.remove(weapon.ammoType, taken);
    GameState.setWeaponAmmo(weaponItemId, clip + taken);
    this.reloadTimer = weapon.reloadTime ?? 0.9;
    this.attackCooldown = Math.max(this.attackCooldown, this.reloadTimer);
    Audio.playSfx('reload', { volume: 0.6 });
    Notifications.push(t('notify.reloaded', { clip: clip + taken, reserve: GameState.inventory.quantity(weapon.ammoType) }));
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
    // Armor chips damage down (never fully zeroing it out) and is itself
    // consumed by being hit — see config/Constants.js ARMOR_DEGRADE_PER_HIT
    // and core/GameState.js refreshArmor(), which is what tops the pool back
    // up whenever the equipped total changes.
    const armor = GameState.player.armor;
    const mitigated = Math.max(1, amount - armor);
    if (armor > 0) GameState.player.armor = Math.max(0, armor - ARMOR_DEGRADE_PER_HIT);
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
    if (this.dying) { this.renderDeath(renderer, camera); return; }
    // Blink while invulnerable.
    if (this.invulnerable > 0 && Math.floor(this.invulnerable * 16) % 2 === 0) return;
    // The held item is baked into the current sheet (see syncWeaponSheet()),
    // so drawing the body is drawing the weapon — no separate compositing
    // pass, and so no more "draw behind for this facing" special-casing either.
    super.render(renderer, camera);
  }

  /** Collapse animation for startDeath() — tips the sprite over around the
   *  feet (an ease-out rotation, so it lands hard rather than gliding down),
   *  settles a couple pixels into the ground, holds, then fades. No new art:
   *  a canvas transform on the existing walk sheet reads perfectly well as
   *  "fell down" at this resolution. */
  renderDeath(renderer, camera) {
    const ctx = renderer.ctx;
    const sx = Math.round(this.x - camera.renderX);
    const sy = Math.round(this.y - camera.renderY);
    const t = this.deathElapsed;

    const fadeStart = DEATH_TIP_TIME + DEATH_HOLD_TIME;
    const fade = t < fadeStart ? 1 : Math.max(0, 1 - (t - fadeStart) / DEATH_FADE_TIME);
    if (fade <= 0) return;

    const tipT = Math.min(1, t / DEATH_TIP_TIME);
    const eased = 1 - Math.pow(1 - tipT, 3);   // fast start, settles into the fall
    const angle = eased * DEATH_TIP_ANGLE;
    const sink = eased * 3;

    if (this.shadow) {
      ctx.fillStyle = `rgba(0,0,0,${0.32 * fade})`;
      ctx.beginPath();
      ctx.ellipse(sx, sy - 1, this.hitbox.w / 2 + 1, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!this.animator) return;

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(sx, sy - sink);
    ctx.rotate(angle);
    this.animator.draw(ctx, -this.spriteW / 2, -this.spriteH);
    ctx.restore();
  }
}

function approach(value, target, step) {
  if (value < target) return Math.min(value + step, target);
  if (value > target) return Math.max(value - step, target);
  return value;
}
