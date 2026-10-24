import { aabb, distance } from './Collision.js';

/**
 * Shared damage-application helpers. Nothing here owns a weapon or a
 * projectile — Player, Enemy, Projectile and Trap all call into this instead
 * of duplicating "who's in range and on the other team" logic.
 *
 * Targeting is by `entity.faction` ('player' | 'enemy' | ...): anything with
 * a different, non-empty faction than the source and a takeDamage() method is
 * fair game. See Entity.js / Player.js / Enemy.js for where faction is set.
 */

function isValidTarget(entity, sourceFaction) {
  return !entity.dead && entity.faction && entity.faction !== sourceFaction && typeof entity.takeDamage === 'function';
}

/** One-shot hit test against a world-space box (melee swings, bullets).
 *  Tested against each candidate's *hurtbox*, not its (smaller, feet-only)
 *  movement hitbox — see Entity.js getHurtBox() — so a hit that visually
 *  connects with the sprite always registers. */
export function hitEntitiesInBox(scene, box, damage, { sourceFaction = 'player', source = null, type = 'melee' } = {}) {
  const hits = [];
  for (const entity of scene.entities) {
    if (!isValidTarget(entity, sourceFaction) || typeof entity.getHurtBox !== 'function') continue;
    if (!aabb(box, entity.getHurtBox())) continue;
    entity.takeDamage(damage, source || { x: box.x + box.w / 2, y: box.y + box.h / 2 }, scene, type);
    hits.push(entity);
  }
  return hits;
}

/** Radial damage — explosions, both from throwables and explosive traps. */
export function applyRadiusDamage(scene, x, y, radius, damage, { sourceFaction = 'player', type = 'explosive' } = {}) {
  const hits = [];
  for (const entity of scene.entities) {
    if (!isValidTarget(entity, sourceFaction)) continue;
    if (distance(entity, { x, y }) > radius) continue;
    entity.takeDamage(damage, { x, y }, scene, type);
    hits.push(entity);
  }
  return hits;
}
