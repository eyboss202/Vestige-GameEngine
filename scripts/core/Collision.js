import { TILE } from '../config/Constants.js';

export function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

/** Overlap test against a tile map's solid grid. */
function boxHitsMap(box, map) {
  const x0 = Math.floor(box.x / TILE);
  const x1 = Math.floor((box.x + box.w - 0.001) / TILE);
  const y0 = Math.floor(box.y / TILE);
  const y1 = Math.floor((box.y + box.h - 0.001) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (map.isSolidTile(tx, ty)) return true;
    }
  }
  return false;
}

function boxHitsAny(box, blockers, self, ignore) {
  for (const other of blockers) {
    if (other === self || !other.solid || other.dead) continue;
    if (ignore && ignore.has(other)) continue;
    if (aabb(box, other.getBox())) return other;
  }
  return null;
}

/**
 * Moves an entity by (dx, dy) against the tile map and any solid entities,
 * resolving each axis on its own — the standard trick that lets you slide along
 * a wall instead of sticking to it.
 *
 * Blockers the entity is already overlapping *before* this move are ignored
 * for it, on every axis, for the whole call. Without this, two solid bodies
 * that end up coincident (e.g. an enemy reaching the player) permanently
 * freeze each other: the wall-slide probe below only ever tests one step
 * *into* the movement, and a single step out of a full overlap still
 * overlaps, so it gives up with zero movement — forever, every frame, since
 * neither body can ever move away either. Ignoring an already-penetrated
 * blocker lets the two separate instead; normal blocking resumes the instant
 * they no longer overlap.
 *
 * @returns {{ hitX: boolean, hitY: boolean, blocker: object|null }}
 */
export function moveAndCollide(entity, dx, dy, map, blockers = []) {
  const result = { hitX: false, hitY: false, blocker: null };

  const startBox = entity.getBox();
  let penetrating = null;
  for (const other of blockers) {
    if (other === entity || !other.solid || other.dead) continue;
    if (!aabb(startBox, other.getBox())) continue;
    (penetrating || (penetrating = new Set())).add(other);
  }

  if (dx !== 0) {
    const box = entity.getBox();
    box.x += dx;
    const blocker = boxHitsAny(box, blockers, entity, penetrating);
    if (blocker || boxHitsMap(box, map)) {
      result.hitX = true;
      result.blocker = blocker;
      // Step back to flush contact, so entities rest exactly against surfaces.
      const step = Math.sign(dx);
      let moved = 0;
      while (Math.abs(moved) < Math.abs(dx)) {
        const probe = entity.getBox();
        probe.x += moved + step;
        if (boxHitsMap(probe, map) || boxHitsAny(probe, blockers, entity, penetrating)) break;
        moved += step;
      }
      entity.x += moved;
    } else {
      entity.x += dx;
    }
  }

  if (dy !== 0) {
    const box = entity.getBox();
    box.y += dy;
    const blocker = boxHitsAny(box, blockers, entity, penetrating);
    if (blocker || boxHitsMap(box, map)) {
      result.hitY = true;
      result.blocker = result.blocker || blocker;
      const step = Math.sign(dy);
      let moved = 0;
      while (Math.abs(moved) < Math.abs(dy)) {
        const probe = entity.getBox();
        probe.y += moved + step;
        if (boxHitsMap(probe, map) || boxHitsAny(probe, blockers, entity, penetrating)) break;
        moved += step;
      }
      entity.y += moved;
    } else {
      entity.y += dy;
    }
  }

  return result;
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
