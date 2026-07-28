import { Scene } from '../core/Scene.js';
import { Camera } from '../core/Camera.js';
import { GameState } from '../core/GameState.js';
import { Maps } from '../world/MapManager.js';
import { Player } from '../entities/player/Player.js';
import { LightingSystem } from '../systems/LightingSystem.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { Dialogue } from '../systems/DialogueSystem.js';
import { Audio } from '../systems/AudioSystem.js';
import { Notifications } from '../systems/NotificationSystem.js';
import { DialogueBox } from '../ui/DialogueBox.js';
import { HUD } from '../ui/HUD.js';
import { Input } from '../core/Input.js';
import { Events } from '../core/EventBus.js';
import { Font } from '../ui/BitmapFont.js';
import { distance } from '../core/Collision.js';
import { VIEW_W, VIEW_H, PALETTE } from '../config/Constants.js';
import { PauseScene } from './PauseScene.js';
import { InventoryScene } from './InventoryScene.js';
import { t, localised } from '../core/I18n.js';
import { Survival } from '../systems/SurvivalSystem.js';
import { ShopScene } from './ShopScene.js';
import { Cutscene } from '../systems/CutsceneSystem.js';
import { playIntroCutscene, INTRO_FLAG } from '../cutscenes/intro.js';

/**
 * The world scene: owns the current map, its entities, and the systems that
 * only make sense while playing. Menus are separate scenes pushed on top.
 */
export class GameScene extends Scene {
  constructor(game) {
    super(game);
    this.camera = new Camera();
    this.lighting = new LightingSystem();
    this.particles = new ParticleSystem(360);
    this.hud = new HUD();
    this.dialogueBox = new DialogueBox();
    this.map = null;
    this.entities = [];
    this.player = null;
    this.interactTarget = null;
    this.changingMap = false;
    this.deathTimer = 0;
    this.lockedTrigger = null;
    this.unsubscribe = [];
  }

  enter({ fromSave = false, fresh = false } = {}) {
    this.loadMap(GameState.currentMap, GameState.spawn, { useSavedPosition: fromSave });

    this.unsubscribe.push(
      Events.on('dialogue:end', ({ npcId }) => {
        const npc = this.entities.find((e) => e.id === npcId);
        if (npc) npc.talking = false;
      }),
      Events.on('player:down', () => { this.deathTimer = 1.2; }),
      Events.on('shop:open', ({ npcId }) => {
        const npc = this.entities.find((e) => e.id === npcId);
        if (npc?.shop) this.game.scenes.push(new ShopScene(this.game), { shopId: npc.shop });
      }),
      // A worked example of the pattern EXTENDING.md documents: a non-portal
      // trigger is just an event a listener reacts to, not an engine change.
      // A worked example of the cutscene runner: pan to something, hold, say
      // a line, hand the camera back. See systems/CutsceneSystem.js.
      Events.on('trigger:reveal', ({ trigger }) => {
        if (Cutscene.active || GameState.getFlag(trigger.flag, false)) return;
        Cutscene.play([
          { type: 'camera', x: trigger.revealX, y: trigger.revealY },
          { type: 'wait', seconds: 1.1 },
          { type: 'dialogue', id: trigger.dialogueId },
          { type: 'cameraFollow', entityId: 'player' },
          { type: 'flag', key: trigger.flag, value: true },
        ]);
      }),
      Events.on('trigger:ambush', ({ trigger }) => {
        if (trigger.flag) GameState.setFlag(trigger.flag, true);
        const cx = trigger.x + trigger.w / 2;
        const cy = trigger.y + trigger.h / 2;
        const radius = trigger.radius ?? 120;
        for (const entity of this.entities) {
          if (entity.faction !== 'enemy' || entity.dead || typeof entity.setState !== 'function') continue;
          if (distance(entity, { x: cx, y: cy }) > radius) continue;
          entity.setState('chase');
        }
      }),
      // cutscenes/intro.js `emit`s this once it hands control back — a small,
      // harmless example of a cutscene driving something outside itself.
      Events.on('cutscene:introEnd', () => this.hud.showArea(this.map.displayName)),
    );

    // Played once per save, right after a brand-new game starts — see
    // cutscenes/intro.js for the full template and step-by-step comments.
    if (fresh && !GameState.getFlag(INTRO_FLAG, false)) playIntroCutscene();
  }

  exit() { for (const off of this.unsubscribe) off(); this.unsubscribe = []; }

  // -------------------------------------------------------------- map load
  loadMap(mapId, spawnName = 'default', { useSavedPosition = false } = {}) {
    this.map = Maps.load(mapId);
    if (!this.map) return;
    GameState.currentMap = mapId;
    this.lockedTrigger = null;
    Cutscene.cancel();   // a cutscene's queued entity ids don't survive a map swap

    this.entities = Maps.buildEntities(this.map);
    const spawn = this.map.spawn(spawnName || 'default');
    const px = useSavedPosition && GameState.player.x != null ? GameState.player.x : spawn.x;
    const py = useSavedPosition && GameState.player.y != null ? GameState.player.y : spawn.y;
    this.player = new Player({ x: px, y: py, facing: useSavedPosition ? GameState.player.facing : spawn.facing });
    this.entities.push(this.player);

    this.camera.setBounds(this.map.pixelWidth, this.map.pixelHeight);
    this.camera.follow(this.player, true);

    this.particles.clear();
    this.particles.setAmbient({
      interval: this.map.ambient.darkness > 0.6 ? 0.3 : 0.16,
      driftX: 4, driftY: 6, life: 5,
      color: this.map.ambient.darkness > 0.6 ? '#8fb0a8' : '#cfd8c0',
      alpha: 0.3,
    });

    if (this.map.ambient.music) Audio.playMusic(this.map.ambient.music, { fade: 1.5 });
    this.hud.showArea(this.map.displayName);
  }

  /** Fades out, swaps maps, fades back in. */
  changeMap(mapId, spawnName, sfx = null) {
    if (this.changingMap) return;
    this.changingMap = true;
    if (sfx) Audio.playSfx(sfx, { volume: 0.7 });
    this.game.scenes.transition(() => {
      GameState.spawn = spawnName;
      this.loadMap(mapId, spawnName);
      this.changingMap = false;
    });
  }

  // -------------------------------------------------------------- helpers
  solidEntities() { return this.entities.filter((e) => e.solid && !e.dead); }

  /** Nearest interactable in front of the player, or null. */
  findInteractTarget() {
    if (!this.player) return null;
    const point = this.player.interactPoint(12);
    let best = null;
    let bestDist = Infinity;
    for (const entity of this.entities) {
      if (!entity.interactable || entity.dead || entity === this.player) continue;
      const d = distance(point, { x: entity.x, y: entity.y - 6 });
      if (d < entity.interactRadius && d < bestDist) { best = entity; bestDist = d; }
    }
    return best;
  }

  // -------------------------------------------------------------- update
  update(dt) {
    if (!this.map) return;

    // A conversation freezes the world but keeps ambience alive.
    if (Dialogue.active) {
      this.player.canMove = false;
      this.dialogueBox.update(dt);
      this.particles.update(dt, this.camera);
      this.camera.update(dt);
      this.hud.update(dt);
      return;
    }

    // A cutscene freezes normal entity AI too — only the entities it names
    // move, driven directly by Cutscene.update() below.
    if (Cutscene.active) {
      this.player.canMove = false;
      Cutscene.update(dt, this);
      this.particles.update(dt, this.camera);
      this.camera.update(dt);
      this.hud.update(dt);
      return;
    }
    this.player.canMove = true;

    if (this.deathTimer > 0) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) this.respawn();
    } else {
      // Frozen while the death sting plays — otherwise starvation would keep
      // re-emitting player:down and pushing the respawn back indefinitely.
      Survival.update(dt);
    }

    if (Input.justPressed('pause')) { this.game.scenes.push(new PauseScene(this.game)); return; }
    if (Input.justPressed('inventory')) { this.game.scenes.push(new InventoryScene(this.game)); return; }
    if (Input.justPressed('attack')) this.player.attack(this);
    if (Input.justPressed('throw')) this.player.throwItem(this);

    for (const entity of this.entities) entity.update(dt, this);
    this.entities = this.entities.filter((e) => !e.dead);

    this.interactTarget = this.findInteractTarget();
    if (this.interactTarget && Input.justPressed('interact')) this.interactTarget.interact(this);

    this.checkTriggers();

    this.lighting.update(dt);
    this.particles.update(dt, this.camera);
    this.camera.update(dt);
    this.hud.update(dt);
  }

  checkTriggers() {
    const trigger = this.map.triggerAt(this.player.x, this.player.y);
    if (!trigger) return;
    if (trigger.type === 'portal') {
      // A door can be locked by a world flag — set by whatever future story
      // event should gate it. Unlocked (the default) always works both ways.
      if (trigger.requiresFlag && !GameState.getFlag(trigger.requiresFlag, false)) {
        if (this.lockedTrigger !== trigger) {
          this.lockedTrigger = trigger;
          Notifications.push(trigger.lockedText ? localised(trigger.lockedText) : t('notify.locked'));
          Audio.playSfx('ui_back', { volume: 0.6 });
        }
        return;
      }
      this.lockedTrigger = null;
      this.changeMap(trigger.target, trigger.spawn, trigger.sfx);
    } else {
      Events.emit('trigger:' + trigger.type, { trigger, scene: this });
    }
  }

  /** Placeholder failure handling: back to the map's spawn with health restored.
   *  Swap this for a proper game-over scene once the story needs one. */
  respawn() {
    GameState.player.hp = GameState.derivedStat('maxHp');
    Survival.restoreOnRespawn();
    this.game.scenes.transition(() => {
      const spawn = this.map.spawn('default');
      this.player.x = spawn.x;
      this.player.y = spawn.y;
      this.player.vx = this.player.vy = 0;
      this.camera.snapToTarget();
    });
  }

  // -------------------------------------------------------------- render
  render(renderer) {
    if (!this.map) return;
    const ctx = renderer.ctx;
    renderer.rect(0, 0, VIEW_W, VIEW_H, PALETTE.void);

    this.map.renderLayer(ctx, this.camera, 'ground');
    this.map.renderLayer(ctx, this.camera, 'decor');

    // Painter's algorithm on the feet position: entities lower on the screen
    // are nearer the camera and so are drawn last.
    const visible = this.entities
      .filter((e) => this.camera.isVisible(e.x - 16, e.y - 32, 32, 40))
      .sort((a, b) => a.depth - b.depth);
    for (const entity of visible) entity.render(renderer, this.camera);

    this.particles.render(ctx, this.camera);
    if (this.map.overhead) this.map.renderLayer(ctx, this.camera, 'overhead');

    this.lighting.render(renderer, this.camera, this.map.ambient, this.map.lights);
    renderer.vignette(this.map.ambient.vignette ?? 0.45);

    this.dialogueBox.render(renderer);
    this.hud.render(renderer, this);

    // A cutscene's own fade (see systems/CutsceneSystem.js `fade` step) is
    // independent of SceneManager's map-transition fade — both can stack.
    if (Cutscene.fadeAlpha > 0) renderer.flash(Cutscene.fadeColor, Cutscene.fadeAlpha);

    if (this.game.debug) this.renderDebug(renderer);
  }

  renderDebug(renderer) {
    const ctx = renderer.ctx;
    this.map.renderCollisionDebug(renderer, this.camera);
    for (const entity of this.entities) entity.renderDebug?.(renderer, this.camera);
    const lines = [
      `map ${this.map.id}`,
      `pos ${Math.round(this.player.x)},${Math.round(this.player.y)}`,
      `ent ${this.entities.length}  fps ${this.game.fps}`,
      `state ${this.entities.find((e) => e.state && e.def)?.state ?? '-'}`,
    ];
    lines.forEach((line, i) => Font.draw(ctx, line, 8, VIEW_H - 14 - (lines.length - 1 - i) * 12, { color: PALETTE.amber }));
  }
}
