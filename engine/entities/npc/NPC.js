import { Entity } from '../Entity.js';
import { Animator } from '../../core/Animation.js';
import { Assets } from '../../core/AssetManager.js';
import { Dialogue } from '../../systems/DialogueSystem.js';
import { moveAndCollide } from '../../core/Collision.js';
import { GameState } from '../../core/GameState.js';
import { DAY_LENGTH } from '../../config/Constants.js';

/**
 * A talking, optionally wandering character. `schedule` (an array of
 * { startHour, x, y }, 0-24) makes the NPC walk to the current hour's
 * waypoint off GameState.playtime instead of wandering at random — an NPC
 * opts in by providing one; nothing changes for the ones that don't.
 */
export class NPC extends Entity {
  constructor({ id, x, y, sprite = 'npc_survivor', facing = 'down', dialogue = null, wander = false, name = null, shop = null, schedule = null }) {
    super({ id, x, y });
    this.spriteKey = sprite;
    this.dialogueId = dialogue;
    this.name = name;
    /** Shop id (game/data/shops.js) — opened via a dialogue choice with `emit: 'shop:open'`. */
    this.shop = shop;
    this.schedule = schedule?.length ? [...schedule].sort((a, b) => a.startHour - b.startHour) : null;
    this.facing = facing;
    this.solid = true;
    this.interactable = true;
    this.interactRadius = 22;
    this.promptKey = 'hud.talk';
    this.hitbox = { w: 10, h: 7, ox: 0, oy: 0 };

    this.wander = wander;
    this.home = { x, y };
    this.wanderRadius = 34;
    this.speed = 22;
    this.state = 'idle';
    this.stateTimer = 1 + Math.random() * 2;
    this.target = null;
    this.talking = false;

    this.animator = new Animator(Assets.image(sprite), 16, 24)
      .addDirectional('idle', [0], 1)
      .addDirectional('walk', [0, 1, 2, 3], 7);
    this.animator.play(`idle_${this.facing}`);
  }

  update(dt, scene) {
    super.update(dt, scene);
    if (this.talking) { this.animator.play(`idle_${this.facing}`); return; }
    if (this.schedule) { this.followSchedule(dt, scene); return; }
    if (!this.wander) { this.animator.play(`idle_${this.facing}`); return; }

    this.stateTimer -= dt;
    if (this.stateTimer <= 0) {
      if (this.state === 'idle') {
        const angle = Math.random() * Math.PI * 2;
        const dist = 12 + Math.random() * this.wanderRadius;
        this.target = { x: this.home.x + Math.cos(angle) * dist, y: this.home.y + Math.sin(angle) * dist };
        this.state = 'walk';
        this.stateTimer = 1.2 + Math.random() * 1.6;
      } else {
        this.state = 'idle';
        this.target = null;
        this.stateTimer = 1.5 + Math.random() * 3;
      }
    }

    if (this.state === 'walk' && this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 2) { this.state = 'idle'; this.target = null; this.stateTimer = 1 + Math.random() * 2; }
      else {
        const nx = (dx / dist) * this.speed * dt;
        const ny = (dy / dist) * this.speed * dt;
        this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        const hit = moveAndCollide(this, nx, ny, scene.map, scene.solidEntities());
        if (hit.hitX || hit.hitY) { this.state = 'idle'; this.target = null; this.stateTimer = 0.8; }
        this.animator.play(`walk_${this.facing}`);
        return;
      }
    }
    this.animator.play(`idle_${this.facing}`);
  }

  /** Walks toward the current hour's waypoint using the same move-toward-a-
   *  point code the wander behaviour above uses — just driven by the clock
   *  instead of a random target. */
  followSchedule(dt, scene) {
    const hour = ((GameState.playtime % DAY_LENGTH) / DAY_LENGTH) * 24;
    let waypoint = this.schedule[this.schedule.length - 1];
    for (const entry of this.schedule) {
      if (entry.startHour <= hour) waypoint = entry; else break;
    }

    const dx = waypoint.x - this.x;
    const dy = waypoint.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) { this.animator.play(`idle_${this.facing}`); return; }

    const nx = (dx / dist) * this.speed * dt;
    const ny = (dy / dist) * this.speed * dt;
    this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    moveAndCollide(this, nx, ny, scene.map, scene.solidEntities());
    this.animator.play(`walk_${this.facing}`);
  }

  /** Turns to face whoever started the conversation. */
  lookAt(entity) {
    const dx = entity.x - this.x;
    const dy = entity.y - this.y;
    this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }

  interact(scene) {
    if (!this.dialogueId) return;
    this.lookAt(scene.player);
    this.talking = true;
    Dialogue.start(this.dialogueId, { npcId: this.id });
  }
}
