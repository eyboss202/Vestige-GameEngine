import { Trap } from '../entities/Trap.js';
import { Dialogue } from './DialogueSystem.js';
import { Audio } from './AudioSystem.js';

/**
 * Ready-made `onUse` behaviours for item definitions, so a game's item table
 * stays declarative:
 *
 *   field_notes: { ..., dialogueId: 'note_field', onUse: readable('note_field') },
 *   spike_kit:   { ..., onUse: placeTrap('spike', 7) },
 *
 * Every `onUse` receives { state, scene, entity, itemId } and returns false to
 * refuse the use (which keeps the item in the bag).
 */

/** A "readable": reuses the exact dialogue-tree machinery Prop already uses
 *  for terminals/signs, just triggered from the inventory instead of the
 *  world, and rendered as a book-styled full page instead of a speech box
 *  (DialogueBox.js reads `mode: 'read'` off the dialogue context). See
 *  scenes/InventoryScene.js, which closes itself the moment a dialogue
 *  starts so the conversation isn't stuck behind a frozen menu. */
export function readable(dialogueId, { sfx = 'page_turn' } = {}) {
  return ({ state, itemId }) => {
    if (sfx) Audio.playSfx(sfx, { volume: 0.6 });
    Dialogue.start(dialogueId, { itemId, mode: 'read' });
    state.collectedLogs[dialogueId] = true;
    return true;   // consumable:false on these items keeps it in the bag regardless
  };
}

let nextTrapId = 1;

/** Drops a player-owned trap just in front of whoever used the kit. */
export function placeTrap(trapType, damage) {
  return ({ scene, entity }) => {
    if (!scene || !entity) return false;   // needs the live world — see InventoryScene.js
    const point = entity.interactPoint(14);
    scene.entities.push(new Trap({
      id: `trap_${trapType}_${nextTrapId++}`, x: point.x, y: point.y,
      trapType, damage, faction: 'player',
    }));
    return true;
  };
}
