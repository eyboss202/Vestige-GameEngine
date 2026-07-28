import { Events } from '../core/EventBus.js';
import { Dialogue } from './DialogueSystem.js';
import { GameState } from '../core/GameState.js';
import { Audio } from './AudioSystem.js';

/**
 * Queues a sequence of world actions and plays them back one at a time,
 * pausing normal play the same way Dialogue does (see GameScene.update()).
 * Built entirely on hooks the project already ships ready for this:
 * `Player.canMove` and `Camera.follow` both accept being driven externally.
 *
 * Step shapes:
 *   { type: 'wait', seconds }
 *   { type: 'moveTo', entityId, x, y, speed }
 *   { type: 'camera', x, y }              — pans the camera to a fixed point
 *   { type: 'cameraFollow', entityId }    — hands the camera back to an entity
 *   { type: 'dialogue', id }              — runs an ordinary dialogue tree
 *   { type: 'flag', key, value }
 *   { type: 'emit', event, payload }
 *   { type: 'fade', to, seconds, color }  — screen wash toward `to` (0 clear..1 opaque)
 *   { type: 'sfx', key, volume, rate, variation }
 *   { type: 'music', key, fade, volume }
 *   { type: 'anim', entityId, clip }      — plays an existing Animator clip once
 *
 * play() takes a plain array — nothing about a cutscene lives in data/*.js
 * because a cutscene is a sequence of engine actions, not content; the
 * dialogue/flags it drives are. GameScene.render() draws `Cutscene.fadeAlpha`
 * on top of everything while a cutscene is active — see `fade` below.
 */
class CutsceneSystem {
  constructor() {
    this.active = false;
    this.queue = [];
    this.current = null;
    this.timer = 0;
    this.moving = null;
    /** Cutscene-driven screen wash, drawn by GameScene.render() via renderer.flash(). */
    this.fadeAlpha = 0;
    this.fadeColor = '#07090b';
    this.fadeFrom = 0;
    this.fadeTo = 0;
    this.fadeDuration = 0;
  }

  play(steps) {
    this.queue = [...steps];
    this.active = true;
    this.advance();
  }

  advance() {
    this.moving = null;
    this.current = this.queue.shift() || null;
    if (!this.current) { this.active = false; Events.emit('cutscene:end'); return; }
    this.begin(this.current);
  }

  begin(step) {
    switch (step.type) {
      case 'wait': this.timer = step.seconds; break;
      case 'flag': GameState.setFlag(step.key, step.value ?? true); this.advance(); break;
      case 'emit': Events.emit(step.event, step.payload || {}); this.advance(); break;
      case 'dialogue': Dialogue.start(step.id); break;   // advance() happens in update() once it ends
      case 'moveTo': this.moving = step; break;
      case 'fade':
        this.fadeColor = step.color || this.fadeColor;
        this.fadeFrom = this.fadeAlpha;
        this.fadeTo = step.to ?? 1;
        this.fadeDuration = Math.max(0, step.seconds ?? 1);
        this.timer = this.fadeDuration;
        if (this.fadeDuration <= 0) this.fadeAlpha = this.fadeTo;   // instant cut, no ramp needed
        break;
      case 'sfx':
        Audio.playSfx(step.key, { volume: step.volume ?? 1, rate: step.rate ?? 1, variation: step.variation ?? 0 });
        this.advance();
        break;
      case 'music':
        Audio.playMusic(step.key, { fade: step.fade ?? 1.2, volume: step.volume ?? 1 });
        this.advance();
        break;
      case 'anim': break;   // resolved in update(), once `scene` (and its entities) is available
      default: this.advance(); break;   // 'camera' / 'cameraFollow' resolve immediately in update()
    }
  }

  update(dt, scene) {
    if (!this.active || !this.current) return;

    switch (this.current.type) {
      case 'wait':
        this.timer -= dt;
        if (this.timer <= 0) this.advance();
        break;
      case 'dialogue':
        if (!Dialogue.active) this.advance();
        break;
      case 'moveTo': {
        const entity = scene.entities.find((e) => e.id === this.moving.entityId);
        if (!entity) { this.advance(); break; }
        const dx = this.moving.x - entity.x;
        const dy = this.moving.y - entity.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 2) { this.advance(); break; }
        const speed = this.moving.speed ?? 40;
        const step = Math.min(dist, speed * dt);
        entity.x += (dx / dist) * step;
        entity.y += (dy / dist) * step;
        entity.animator?.play?.(`walk_${Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')}`);
        break;
      }
      case 'camera':
        scene.camera.follow({ x: this.current.x, y: this.current.y });
        this.advance();
        break;
      case 'cameraFollow': {
        const entity = scene.entities.find((e) => e.id === this.current.entityId) || scene.player;
        scene.camera.follow(entity);
        this.advance();
        break;
      }
      case 'fade':
        if (this.fadeDuration <= 0) { this.advance(); break; }
        this.timer -= dt;
        {
          const t = Math.min(1, Math.max(0, 1 - this.timer / this.fadeDuration));
          this.fadeAlpha = this.fadeFrom + (this.fadeTo - this.fadeFrom) * t;
        }
        if (this.timer <= 0) { this.fadeAlpha = this.fadeTo; this.advance(); }
        break;
      case 'anim': {
        const entity = scene.entities.find((e) => e.id === this.current.entityId) || (this.current.entityId === 'player' ? scene.player : null);
        entity?.animator?.play?.(this.current.clip);
        this.advance();
        break;
      }
      default:
        this.advance();
        break;
    }
  }

  /** Bails out cleanly — e.g. if the map changes mid-cutscene. */
  cancel() {
    this.active = false;
    this.queue = [];
    this.current = null;
    this.moving = null;
    this.fadeAlpha = 0;
    this.fadeDuration = 0;
  }
}

export const Cutscene = new CutsceneSystem();
