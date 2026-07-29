import { Events } from '../core/EventBus.js';
import { GameState } from '../core/GameState.js';
import { localised } from '../core/I18n.js';
import { DIALOGUES } from '../data/dialogue.js';

/**
 * Runs conversations. It owns *which* node is active and how the tree branches;
 * drawing and typewriter timing belong to ui/DialogueBox.js.
 *
 * Node shape (see data/dialogue.js for the full documented example):
 *   {
 *     speaker: { en, pt } | string | null,
 *     portrait: 'doctor' | 'survivor' | ...,   // key into PORTRAIT_INDEX
 *     text: { en, pt },                        // supports [tags], see parseRichText
 *     set: { flagName: true },                 // applied on entry
 *     branches: [ { ifFlag: 'x', equals: true, next: 'nodeId' } ],
 *     choices: [ { text, next, requires, set } ],
 *     next: 'nodeId' | null                    // null ends the conversation
 *   }
 */
class DialogueSystem {
  constructor() {
    this.active = false;
    this.tree = null;
    this.treeId = null;
    this.node = null;
    this.nodeId = null;
    this.context = {};
  }

  start(dialogueId, context = {}) {
    const tree = DIALOGUES[dialogueId];
    if (!tree) { console.warn(`[Dialogue] unknown tree "${dialogueId}"`); return false; }
    this.tree = tree;
    this.treeId = dialogueId;
    this.context = context;
    this.active = true;
    GameState.markSeen(dialogueId);
    // A tree can open on a different node depending on world state.
    const entry = this.resolveBranch(tree.branches) || tree.start;
    this.goto(entry);
    Events.emit('dialogue:start', { id: dialogueId });
    return true;
  }

  goto(nodeId) {
    this.nodeId = nodeId;
    this.node = this.tree.nodes[nodeId] || null;
    if (!this.node) { this.end(); return; }
    if (this.node.set) for (const [key, value] of Object.entries(this.node.set)) GameState.setFlag(key, value);
    if (this.node.emit) Events.emit(this.node.emit, { dialogue: this.treeId, node: nodeId, ...this.context });
    Events.emit('dialogue:node', { id: this.treeId, nodeId, node: this.node });
  }

  /** Picks the first branch whose flag condition holds. */
  resolveBranch(branches) {
    if (!branches) return null;
    for (const b of branches) {
      const value = GameState.getFlag(b.ifFlag, false);
      const expected = b.equals ?? true;
      if (value === expected) return b.next;
    }
    return null;
  }

  get speaker() { return localised(this.node?.speaker, ''); }
  get portrait() { return this.node?.portrait ?? null; }
  get text() { return localised(this.node?.text, ''); }
  /** 'read' for a book-styled full page (see ItemDatabase.js `readable()`);
   *  null/undefined for an ordinary conversation. */
  get mode() { return this.context?.mode ?? null; }

  /** Choices the player currently meets the requirements for. */
  get choices() {
    if (!this.node?.choices) return null;
    return this.node.choices.filter((c) => !c.requires || GameState.getFlag(c.requires, false));
  }

  /** Moves to the next node. Ignored while choices are on screen. */
  advance() {
    if (!this.active) return;
    if (this.choices?.length) return;
    const next = this.resolveBranch(this.node.branches) || this.node.next;
    if (!next) this.end(); else this.goto(next);
  }

  choose(index) {
    const options = this.choices;
    if (!options || !options[index]) return;
    const choice = options[index];
    if (choice.set) for (const [key, value] of Object.entries(choice.set)) GameState.setFlag(key, value);
    if (choice.emit) Events.emit(choice.emit, { dialogue: this.treeId, ...this.context });
    if (!choice.next) this.end(); else this.goto(choice.next);
  }

  end() {
    if (!this.active) return;
    const id = this.treeId;
    this.active = false;
    this.tree = this.node = this.nodeId = this.treeId = null;
    Events.emit('dialogue:end', { id, ...this.context });
  }
}

/**
 * Splits a string into per-character render instructions.
 * Supported inline tags:
 *   [c=#7fe0a8] ... [/c]   colour
 *   [shake] ... [/shake]   jitter
 *   [wave] ... [/wave]     sine bob
 *   [s=0.4]                type speed multiplier from here on
 *   [p=0.5]                pause, in seconds
 * @returns {Array<{ ch: string, color: string|null, shake: boolean, wave: boolean, speed: number, pause: number }>}
 */
export function parseRichText(text) {
  const out = [];
  let color = null;
  let shake = false;
  let wave = false;
  let speed = 1;
  let pending = 0;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '[') {
      const close = text.indexOf(']', i);
      if (close > i) {
        const tag = text.slice(i + 1, close);
        i = close;
        if (tag === '/c') color = null;
        else if (tag === '/shake') shake = false;
        else if (tag === '/wave') wave = false;
        else if (tag.startsWith('c=')) color = tag.slice(2);
        else if (tag === 'shake') shake = true;
        else if (tag === 'wave') wave = true;
        else if (tag.startsWith('s=')) speed = parseFloat(tag.slice(2)) || 1;
        else if (tag.startsWith('p=')) pending += parseFloat(tag.slice(2)) || 0;
        continue;
      }
    }
    out.push({ ch: text[i], color, shake, wave, speed, pause: pending });
    pending = 0;
  }
  return out;
}

export const Dialogue = new DialogueSystem();
