import { Entity } from './Entity.js';
import { Animator } from '../core/Animation.js';
import { Assets } from '../core/AssetManager.js';
import { GameState } from '../core/GameState.js';
import { Audio } from '../systems/AudioSystem.js';
import { Notifications } from '../systems/NotificationSystem.js';
import { t } from '../core/I18n.js';
import { isLocked, tryUnlock, keyName } from '../core/Locks.js';
import { Events } from '../core/EventBus.js';
import { ContainerScene } from '../scenes/ContainerScene.js';
import { PALETTE } from '../config/Constants.js';

/** Row of assets/ui/containers_placeholder.png — column 0 is closed, 1 is open. */
const CONTAINER_ROW = {
  drawer: 0, cabinet: 1, locker: 2, wardrobe: 3, cupboard: 4, chest: 5, box: 6, shelf: 7, nightstand: 8,
};

/**
 * Openable furniture/storage — drawers, cabinets, lockers, wardrobes,
 * cupboards, chests, boxes, shelves, nightstands are all this one class;
 * `containerType` only picks the art/label. Loot is data (`contents`), not
 * code: interact() reuses GameState.inventory (see ui/ContainerUI.js) so
 * nothing about the existing item system changes. `lock` is the same shape
 * core/Locks.js already shares with locked portals.
 */
export class Container extends Entity {
  constructor({ id, x, y, containerType = 'drawer', contents = [], lock = null, label = null, w = 14, h = 10 }) {
    super({ id, x, y });
    this.containerType = containerType;
    this.lock = lock;
    this.label = label;
    this.hitbox = { w, h, ox: 0, oy: 0 };
    this.solid = true;
    this.shadow = true;
    this.interactable = true;
    this.interactRadius = 20;
    this.promptKey = 'hud.open';
    this.defaultContents = contents;
    this.state = 'closed';        // closed | open
    this.bounce = 0;              // decays after opening/closing — a small squash pop

    const row = CONTAINER_ROW[containerType] ?? 0;
    this.animator = new Animator(Assets.image('containers'), 16, 16)
      .add('closed', row, [0], 1)
      .add('open', row, [1], 1);
    this.animator.play('closed');
    this.spriteW = 16;
    this.spriteH = 16;
  }

  get depth() { return this.y - 1; }

  /** What's left inside — GameState-backed so a partial loot survives a save. */
  get items() { return GameState.getContainerContents(this.id, this.defaultContents); }
  get isEmpty() { return this.items.every((s) => s.qty <= 0); }

  update(dt, scene) {
    super.update(dt, scene);
    if (this.bounce > 0) this.bounce = Math.max(0, this.bounce - dt * 5);
  }

  interact(scene) {
    if (isLocked(this.lock, this.id)) {
      if (tryUnlock(this.lock, this.id)) {
        Notifications.push(t('notify.unlocked', { name: keyName(this.lock) }));
        Audio.playSfx('pickup', { volume: 0.55 });
      } else {
        Notifications.push(t('notify.lockedNeeds', { name: keyName(this.lock) || '???' }));
        Audio.playSfx('ui_back', { volume: 0.6 });
        return;
      }
    }
    this.open(scene);
  }

  open(scene) {
    this.state = 'open';
    this.bounce = 1;
    this.animator.play('open');
    Audio.playSfx('door', { volume: 0.5, rate: 1.35, variation: 0.05 });
    scene.particles?.burst(this.x, this.y - 8, 5, { color: '#8a4b2a', speed: 18, life: 0.35, gravity: 10, alpha: 0.5 });
    Events.emit('container:open', { id: this.id });
    scene.game.scenes.push(new ContainerScene(scene.game), { container: this });
  }

  /** Called by ContainerScene when the loot screen is closed. */
  close() {
    this.state = 'closed';
    this.bounce = 1;
    this.animator.play('closed');
    Audio.playSfx('door', { volume: 0.45, rate: 0.85, variation: 0.05 });
  }

  render(renderer, camera) {
    const ctx = renderer.ctx;
    const sx = Math.round(this.x - camera.renderX);
    const sy = Math.round(this.y - camera.renderY);
    const squash = 1 - Math.sin(this.bounce * Math.PI) * 0.12;

    if (this.shadow) {
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.beginPath();
      ctx.ellipse(sx, sy - 1, this.hitbox.w / 2 + 2, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const dw = this.spriteW;
    const dh = this.spriteH * squash;
    this.animator.draw(ctx, sx - dw / 2, sy - dh, dw, dh);

    if (this.state === 'closed' && isLocked(this.lock, this.id)) {
      const lx = sx - 2;
      const ly = sy - this.spriteH - 6;
      ctx.strokeStyle = PALETTE.amber;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(lx + 2, ly + 1, 2, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = PALETTE.amber;
      ctx.fillRect(lx, ly + 1, 4, 3);
    }
  }
}
