/**
 * Enemy archetypes. Add an entry, reference it by key from a map's entity list,
 * and the map loader does the rest. Behaviour hooks (`onDeath`, custom AI
 * states) go here too, so enemy code stays generic.
 *
 * Every archetype below now has its own hand-drawn silhouette (tools/gen_art.py
 * `draw_husk`/`draw_mutant`/etc — see assets/sprites/enemy_*_placeholder.png),
 * not a shared sprite with a runtime tint. `scale` still resizes the sheet
 * (Enemy.js `render()`) so a bigger archetype reads as bigger still; `tint` is
 * kept where it adds a further colour pop on top of the real art, and dropped
 * where the sprite alone already reads clearly.
 *
 * `behavior: 'ranged'` archetypes hold at `preferredRange` and fire instead of
 * closing to melee (Enemy.chaseRanged). `resistances: { melee, ranged }` and
 * `armor` both reduce incoming damage (Enemy.takeDamage). `unique: true` is
 * just a marker for content (bigger, rarer, better loot) — no special code
 * path needed for it beyond that.
 */
export const ENEMY_ARCHETYPES = {
  husk: {
    id: 'husk',
    sprite: 'enemy_husk',
    name: { en: 'Husk', pt: 'Casca' },
    hp: 12,
    speed: 26,
    chaseSpeed: 44,
    damage: 3,
    detectRadius: 78,
    loseRadius: 130,
    touchCooldown: 1.1,
    /** Seconds spent stunned after taking a hit. */
    hurtTime: 0.35,
    /** Colour used for its hit particles and its faint aura. */
    accent: '#7fe0a8',
    aura: { radius: 26, color: '#7fe0a8', intensity: 0.35, flicker: 0.3 },
    lootTable: 'husk_common',
  },
  mutant: {
    id: 'mutant',
    sprite: 'enemy_mutant',
    name: { en: 'Mutant', pt: 'Mutante' },
    hp: 28, speed: 24, chaseSpeed: 34, damage: 6,
    detectRadius: 70, loseRadius: 120, touchCooldown: 1.3, hurtTime: 0.4,
    armor: 1, resistances: { melee: 0.1 },
    accent: '#c4553f', scale: 1.15,
    aura: { radius: 22, color: '#c4553f', intensity: 0.3, flicker: 0.4 },
    lootTable: 'mutant_common',
  },
  brute: {
    id: 'brute',
    sprite: 'enemy_brute',
    name: { en: 'Brute', pt: 'Brutamontes' },
    hp: 55, speed: 16, chaseSpeed: 22, damage: 9,
    detectRadius: 60, loseRadius: 100, touchCooldown: 1.6, hurtTime: 0.5,
    armor: 3, resistances: { melee: 0.25, ranged: 0.15 },
    accent: '#8a4b2a', scale: 1.4,
    lootTable: 'mutant_common',
  },
  stalker: {
    id: 'stalker',
    sprite: 'enemy_stalker',
    name: { en: 'Stalker', pt: 'Cacador' },
    hp: 8, speed: 34, chaseSpeed: 62, damage: 4,
    /** Short detect radius on purpose — it doesn't notice until it's close, then closes fast. */
    detectRadius: 46, loseRadius: 90, touchCooldown: 0.9, hurtTime: 0.25,
    accent: '#b285e0', scale: 0.9,
    lootTable: 'husk_common',
  },
  spitter: {
    id: 'spitter',
    sprite: 'enemy_spitter',
    name: { en: 'Spitter', pt: 'Cuspidor' },
    hp: 14, speed: 20, chaseSpeed: 26, damage: 4,
    detectRadius: 110, loseRadius: 160, touchCooldown: 1.2, hurtTime: 0.3,
    behavior: 'ranged', preferredRange: 100, fireRate: 1.6, projectileSpeed: 130,
    accent: '#7fe0a8',
    lootTable: 'ranged_common',
  },
  swarmling: {
    id: 'swarmling',
    sprite: 'enemy_swarmling',
    name: { en: 'Swarmling', pt: 'Enxameante' },
    hp: 4, speed: 30, chaseSpeed: 58, damage: 2,
    detectRadius: 64, loseRadius: 110, touchCooldown: 0.7, hurtTime: 0.2,
    accent: '#e0a458', scale: 0.7,
    lootTable: 'swarm_common',
  },
  sentinel: {
    id: 'sentinel',
    sprite: 'enemy_sentinel',
    name: { en: 'Sentinel', pt: 'Sentinela' },
    hp: 80, speed: 22, chaseSpeed: 40, damage: 10,
    detectRadius: 90, loseRadius: 150, touchCooldown: 1.4, hurtTime: 0.45,
    armor: 2, resistances: { melee: 0.15, ranged: 0.15 },
    unique: true,
    accent: '#e0a458', scale: 1.6,
    aura: { radius: 34, color: '#e0a458', intensity: 0.5, flicker: 0.15 },
    lootTable: 'elite',
  },
};

export function getArchetype(id) { return ENEMY_ARCHETYPES[id] || ENEMY_ARCHETYPES.husk; }
