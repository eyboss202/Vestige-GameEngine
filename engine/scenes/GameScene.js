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
import { Content } from '../core/Content.js';
import { isLocked, tryUnlock, keyName } from '../core/Locks.js';
import { DeathScene } from './DeathScene.js';
import { DEATH_TOTAL } from '../entities/player/Player.js';
import { FLASHLIGHT_DRAIN_PER_SEC, FLASHLIGHT_LOW_BATTERY, FLASHLIGHT_OFF_DARKNESS } from '../config/Constants.js';

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
    /** Whether the chase stinger is currently the active music track — see
     *  updateChaseMusic(). Starts false; the first frame with a chasing
     *  enemy flips it (and the track) on. */
    this.chasing = false;
    this.unsubscribe = [];
  }

  enter({ fromSave = false, fresh = false } = {}) {
    this.loadMap(GameState.currentMap, GameState.spawn, { useSavedPosition: fromSave });

    this.unsubscribe.push(
      Events.on('dialogue:end', ({ npcId }) => {
        const npc = this.entities.find((e) => e.id === npcId);
        if (npc) npc.talking = false;
      }),
      // Guarded so a hit landing while the death sting is already playing
      // (enemies keep attacking a 0-hp player for that last beat) can't keep
      // pushing the timer back out and stall the You Died screen forever.
      // Player.startDeath() is itself idempotent for the same reason.
      Events.on('player:down', () => {
        if (this.deathTimer > 0) return;
        this.deathTimer = DEATH_TOTAL;
        this.player.startDeath();
        Audio.playSfx('death_sting', { volume: 0.8 });
      }),
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
    );

    // The game's own "a brand-new run just started" hook — typically an intro
    // cutscene (see game/cutscenes/intro.js). Never runs when loading a save.
    if (fresh) Content.config.onNewGame?.(this);
  }

  exit() { for (const off of this.unsubscribe) off(); this.unsubscribe = []; }

  // -------------------------------------------------------------- map load
  loadMap(mapId, spawnName = 'default', { useSavedPosition = false } = {}) {
    this.map = Maps.load(mapId);
    if (!this.map) return;
    GameState.currentMap = mapId;
    this.lockedTrigger = null;
    Cutscene.cancel();   // a cutscene's queued entity ids don't survive a map swap
    this.chasing = false;   // fresh map, fresh entities — nothing is chasing yet

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

  /** The flashlight mechanic applies only indoors — see
   *  maps/*.json `ambient.interior`. Outdoor maps never consult this. */
  interior() { return !!this.map?.ambient?.interior; }

  /** Equipped *and* has something left in the tank. A dead battery behaves
   *  exactly like not having one equipped at all until it's recharged. */
  flashlightOn() { return !!GameState.equipment.get('flashlight') && GameState.player.flashlightBattery > 0; }

  /** What render() actually hands to LightingSystem this frame: the map's
   *  own ambient/lights untouched everywhere except an interior map with no
   *  working flashlight, where the static map lights are dropped and
   *  darkness is cranked up so only the player's own small personal light
   *  (entities/player/Player.js `this.light`, always-on) gets through. A
   *  critically low (but not dead) battery noise-flickers between the two
   *  instead of cutting cleanly. */
  lightingState() {
    if (!this.interior()) return { ambient: this.map.ambient, lights: this.map.lights };

    const dark = { ...this.map.ambient, darkness: FLASHLIGHT_OFF_DARKNESS, vignette: Math.min(0.9, (this.map.ambient.vignette ?? 0.45) + 0.3) };
    if (!this.flashlightOn()) return { ambient: dark, lights: [] };

    const battery = GameState.player.flashlightBattery;
    if (battery >= FLASHLIGHT_LOW_BATTERY) return { ambient: this.map.ambient, lights: this.map.lights };

    // Dying bulb: a noisy double-sine (same shape LightingSystem's own
    // per-light flicker uses) decides, frame to frame, whether the beam is
    // "on" or has dropped out — more dropouts the closer to empty it gets.
    const t = this.lighting.time;
    const n = Math.sin(t * 9) * 0.5 + Math.sin(t * 23.7 + 1.3) * 0.5;   // -1..1
    const failing = 1 - battery / FLASHLIGHT_LOW_BATTERY;                // 0 at the threshold, 1 at empty
    const dropout = n < -1 + failing * 1.6;
    return dropout ? { ambient: dark, lights: [] } : { ambient: this.map.ambient, lights: this.map.lights };
  }

  /** Chase stinger (`config.chaseMusic`) — plays only while at least one enemy
   *  with `chaseMusic !== false` (a per-archetype toggle in the game's enemy data) is
   *  actively in its 'chase' state, replacing whatever room/ambient music
   *  was playing, and hands that track straight back the instant nothing is
   *  chasing anymore. AudioSystem has exactly one active music slot and
   *  playMusic() already no-ops on a repeat call for the key already
   *  playing, so however many creatures are chasing at once this can never
   *  double up or restart itself — this only needs to act on the
   *  true/false *edge*, not every frame. */
  updateChaseMusic() {
    const chasing = this.entities.some((e) => e.faction === 'enemy' && e.state === 'chase' && e.def?.chaseMusic !== false);
    if (chasing === this.chasing) return;
    this.chasing = chasing;
    if (chasing && Content.config.chaseMusic) {
      Audio.playMusic(Content.config.chaseMusic, { fade: 0.4, volume: 0.85 });
    } else if (this.map.ambient.music) {
      Audio.playMusic(this.map.ambient.music, { fade: 0.35, volume: 1 });
    }
  }

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
    // The collapse animation (Player.startDeath()/DEATH_TOTAL) freezes
    // everything else the same way Dialogue/Cutscene do above — otherwise
    // starvation would keep re-emitting player:down and pushing the You
    // Died screen back indefinitely, and enemies would keep wailing on a
    // visibly-already-dying player.
    if (this.deathTimer > 0) {
      this.player.canMove = false;
      this.player.update(dt, this);
      this.particles.update(dt, this.camera);
      this.camera.update(dt);
      this.hud.update(dt);
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) this.die();
      return;
    }
    this.player.canMove = true;
    Survival.update(dt);

    // Only actually costs anything while it's doing something — equipped,
    // and somewhere it matters (see `interior()`/`flashlightOn()` below and
    // render()'s ambient swap, which is the other half of this feature).
    if (this.interior() && this.flashlightOn()) {
      GameState.player.flashlightBattery = Math.max(0, GameState.player.flashlightBattery - FLASHLIGHT_DRAIN_PER_SEC * dt);
    }

    if (Input.justPressed('pause')) { this.game.scenes.push(new PauseScene(this.game)); return; }
    if (Input.justPressed('inventory')) { this.game.scenes.push(new InventoryScene(this.game)); return; }
    if (Input.justPressed('attack')) this.player.attack(this);
    if (Input.justPressed('throw')) this.player.throwItem(this);
    if (Input.justPressed('reload')) this.player.reload();

    for (const entity of this.entities) entity.update(dt, this);
    this.entities = this.entities.filter((e) => !e.dead);
    this.updateChaseMusic();

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
      // A door can be gated by a world flag (set by a story event/cutscene)
      // and/or by carrying a key item (core/Locks.js — same shape a
      // Container's `lock` uses). Unlocked (the default) always works both ways.
      if (isLocked(trigger, trigger.id)) {
        if (trigger.requiresKey && tryUnlock(trigger, trigger.id)) {
          Notifications.push(t('notify.unlocked', { name: keyName(trigger) }));
          Audio.playSfx('door', { volume: 0.55 });
          this.lockedTrigger = null;
          this.changeMap(trigger.target, trigger.spawn, trigger.sfx);
          return;
        }
        if (this.lockedTrigger !== trigger) {
          this.lockedTrigger = trigger;
          const text = trigger.lockedText ? localised(trigger.lockedText)
            : trigger.requiresKey ? t('notify.lockedNeeds', { name: keyName(trigger) })
            : t('notify.locked');
          Notifications.push(text);
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

  /** Hp hit 0 and the death-sting freeze (see `deathTimer` above) has played
   *  out — hand off to the You Died screen. `change()` replaces the whole
   *  scene stack, so this scene's exit() runs (unsubscribing its listeners)
   *  and nothing about the failed run keeps simulating underneath it. */
  die() {
    this.game.scenes.change(new DeathScene(this.game));
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

    const { ambient, lights } = this.lightingState();
    this.lighting.render(renderer, this.camera, ambient, lights);
    renderer.vignette(ambient.vignette ?? 0.45);

    // HUD first, dialogue box on top — the ordinary speech box only ever
    // sits at the bottom of the screen so this never mattered before, but a
    // readable's full-page reader (DialogueBox.js `renderReader`) spans
    // nearly the whole view and needs to sit above the HUD's top-left stat
    // panel and area title, not under them.
    this.hud.render(renderer, this);
    this.dialogueBox.render(renderer);

    // A cutscene's own fade (see systems/CutsceneSystem.js `fade` step) is
    // independent of SceneManager's map-transition fade — both can stack.
    if (Cutscene.fadeAlpha > 0) renderer.flash(Cutscene.fadeColor, Cutscene.fadeAlpha);

    // Death wash: darkness closes in and a blood-red flash builds across the
    // whole collapse animation, so the cut to DeathScene at the end of it
    // reads as "faded to black" rather than an unexplained hard stop.
    if (this.deathTimer > 0) {
      const p = 1 - this.deathTimer / DEATH_TOTAL;
      renderer.vignette(0.35 + p * 0.5);
      renderer.flash('#2a0808', p * p * 0.8);
    }

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
