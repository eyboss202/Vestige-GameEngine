/**
 * Tuning for hunger/thirst/injury pressure. Nothing in engine/systems/SurvivalSystem.js
 * is hardcoded — change the pace of the game by editing these numbers. Any key
 * left out falls back to the engine default (engine/core/Content.js).
 */
export const SURVIVAL = Object.freeze({
  /** Hunger/thirst drain from 100 to 0, in seconds of played (non-dialogue) time. */
  hungerDepleteSeconds: 60 * 14,
  thirstDepleteSeconds: 60 * 9,

  /** HP lost per second while at zero hunger / zero thirst. Stacks if both are empty. */
  starveDamagePerSecond: 0.35,
  dehydrateDamagePerSecond: 0.55,

  /** Movement speed multiplier while starving or dehydrated. */
  exhaustedSpeedMultiplier: 0.72,

  /** Passive HP regen per second once both meters are above this threshold. */
  regenThreshold: 40,
  passiveRegenPerSecond: 0.12,

  /** Generic injury effects. `bleeding` is the one working example; the shape
   *  (type, severity, remaining) supports adding more without engine changes. */
  bleedDamagePerSecond: 0.5,

  /** How much hunger/thirst a respawn restores, so death-by-starvation doesn't
   *  become an unrecoverable loop. */
  respawnMeterFloor: 30,
});
