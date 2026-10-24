import { Entity } from './Entity.js';
import { Animator } from '../core/Animation.js';
import { Assets } from '../core/AssetManager.js';
import { Audio } from '../systems/AudioSystem.js';
import { SaveSlotScene } from '../scenes/SaveSlotScene.js';

/**
 * A fixed, static save point — by design the *only* way to save (see
 * scenes/PauseScene.js, which deliberately doesn't offer one). Interacting pushes the
 * same slot-picker scene the old pause-menu "Save" used to, just in `save`
 * mode; a phone's whole job is deciding *when* the player can reach that
 * screen, not how the picker itself works.
 */
export class Phone extends Entity {
  constructor({ id, x, y }) {
    super({ id, x, y });
    this.solid = true;
    this.shadow = true;
    this.interactable = true;
    this.interactRadius = 20;
    this.promptKey = 'hud.usePhone';
    this.hitbox = { w: 10, h: 8, ox: 0, oy: 0 };
    this.spriteW = 16;
    this.spriteH = 24;
    this.animator = new Animator(Assets.image('phone'), 16, 24).add('idle', 0, [0], 1);
    this.animator.play('idle');
    this.ring = Math.random() * Math.PI * 2;   // desynced so a room of phones doesn't pulse in lockstep
  }

  get depth() { return this.y - 1; }

  update(dt, scene) {
    super.update(dt, scene);
    this.ring += dt;
  }

  interact(scene) {
    Audio.playSfx('ui_select', { volume: 0.6 });
    scene.game.scenes.push(new SaveSlotScene(scene.game), { mode: 'save' });
  }

  render(renderer, camera) {
    super.render(renderer, camera);
    // A slow breathing glow on the screen reads as "on / working" from a
    // distance — the same affordance Container.js's loot glint gives.
    const ctx = renderer.ctx;
    const sx = Math.round(this.x - camera.renderX);
    const sy = Math.round(this.y - camera.renderY);
    const pulse = 0.5 + Math.sin(this.ring * 3) * 0.5;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.25 + pulse * 0.35;
    ctx.fillStyle = '#7fe0a8';
    ctx.fillRect(sx - 2, sy - 17, 4, 3);
    ctx.restore();
  }
}
