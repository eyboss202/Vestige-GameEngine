import { GameState } from '../core/GameState.js';
import { Events } from '../core/EventBus.js';
import { Notifications } from './NotificationSystem.js';
import { t } from '../core/I18n.js';
import { SURVIVAL } from '../data/survival.js';

/**
 * Ticks hunger, thirst and injuries. Knows nothing about rendering — the HUD
 * reads GameState.player directly, the same way it already does for hp/stamina.
 */
class SurvivalSystemImpl {
  constructor() {
    this.warnedHunger = false;
    this.warnedThirst = false;
  }

  update(dt) {
    const p = GameState.player;
    const hungerDrain = p.maxHunger / SURVIVAL.hungerDepleteSeconds;
    const thirstDrain = p.maxThirst / SURVIVAL.thirstDepleteSeconds;
    p.hunger = Math.max(0, p.hunger - hungerDrain * dt);
    p.thirst = Math.max(0, p.thirst - thirstDrain * dt);

    const starving = p.hunger <= 0;
    const dehydrated = p.thirst <= 0;
    const maxHp = GameState.derivedStat('maxHp');

    if (starving || dehydrated) {
      const rate = (starving ? SURVIVAL.starveDamagePerSecond : 0) + (dehydrated ? SURVIVAL.dehydrateDamagePerSecond : 0);
      p.hp = Math.max(0, p.hp - rate * dt);
      if (p.hp <= 0) Events.emit('player:down');
    } else if (p.hunger > SURVIVAL.regenThreshold && p.thirst > SURVIVAL.regenThreshold && p.hp < maxHp) {
      p.hp = Math.min(maxHp, p.hp + SURVIVAL.passiveRegenPerSecond * dt);
    }

    if (starving && !this.warnedHunger) { this.warnedHunger = true; Notifications.push(t('notify.starving')); }
    if (!starving) this.warnedHunger = false;
    if (dehydrated && !this.warnedThirst) { this.warnedThirst = true; Notifications.push(t('notify.dehydrated')); }
    if (!dehydrated) this.warnedThirst = false;

    for (let i = p.injuries.length - 1; i >= 0; i--) {
      const injury = p.injuries[i];
      injury.remaining -= dt;
      if (injury.type === 'bleeding') p.hp = Math.max(0, p.hp - SURVIVAL.bleedDamagePerSecond * injury.severity * dt);
      if (injury.remaining <= 0) p.injuries.splice(i, 1);
    }
  }

  /** Movement speed multiplier while a meter is empty — read by Player.update(). */
  speedMultiplier() {
    const p = GameState.player;
    return (p.hunger <= 0 || p.thirst <= 0) ? SURVIVAL.exhaustedSpeedMultiplier : 1;
  }

  /** @param type e.g. 'bleeding'. Cured early by whatever item/event calls clearInjury. */
  addInjury(type, severity = 1, duration = 20) {
    GameState.player.injuries.push({ type, severity, remaining: duration });
  }

  clearInjury(type) {
    GameState.player.injuries = GameState.player.injuries.filter((i) => i.type !== type);
  }

  hasInjury(type) {
    return GameState.player.injuries.some((i) => i.type === type);
  }

  /** Called on respawn so death-by-starvation can't become an unrecoverable loop. */
  restoreOnRespawn() {
    const p = GameState.player;
    p.hunger = Math.max(p.hunger, SURVIVAL.respawnMeterFloor);
    p.thirst = Math.max(p.thirst, SURVIVAL.respawnMeterFloor);
    this.warnedHunger = false;
    this.warnedThirst = false;
  }
}

export const Survival = new SurvivalSystemImpl();
