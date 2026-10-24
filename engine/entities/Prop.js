import { Entity } from './Entity.js';
import { Dialogue } from '../systems/DialogueSystem.js';

/**
 * A fixed piece of scenery the player can examine — terminals, signs, doors
 * that are not portals. The tile art is drawn by the map's decor layer, so a
 * prop is an invisible interaction volume with a dialogue attached.
 */
export class Prop extends Entity {
  constructor({ id, x, y, dialogue = null, label = null, solid = false, w = 14, h = 10 }) {
    super({ id, x, y });
    this.dialogueId = dialogue;
    this.label = label;
    this.solid = solid;                 // the tile underneath usually blocks already
    this.interactable = !!dialogue;
    this.interactRadius = 20;
    this.hitbox = { w, h, ox: 0, oy: 0 };
    this.shadow = false;
    this.animator = null;
  }

  interact() { if (this.dialogueId) Dialogue.start(this.dialogueId, { propId: this.id }); }
  render() { /* drawn by the tile layers */ }
}
