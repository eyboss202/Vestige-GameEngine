import { VIEW_W, VIEW_H, PALETTE } from '../config/Constants.js';
import { Font } from './BitmapFont.js';
import { panel } from './NineSlice.js';
import { Dialogue, parseRichText } from '../systems/DialogueSystem.js';
import { Input } from '../core/Input.js';
import { Audio } from '../systems/AudioSystem.js';
import { Assets } from '../core/AssetManager.js';
import { Settings } from '../config/Settings.js';
import { localised } from '../core/I18n.js';
import { Events } from '../core/EventBus.js';

/** Columns of assets/ui/portraits_placeholder.png. */
export const PORTRAIT_INDEX = { doctor: 0, survivor: 1, wanderer: 2, husk: 3 };

const BOX_H = 62;
const MARGIN = 8;
const LINES_PER_PAGE = 3;
const BASE_CPS = 42;              // characters per second at speed 1

/**
 * Renders whatever DialogueSystem currently has active: typewriter text with
 * inline effects, an optional portrait, paging, and choice selection.
 * It holds only presentation state — the conversation itself lives in the system.
 */
export class DialogueBox {
  constructor() {
    this.pages = [];
    this.page = 0;
    this.revealed = 0;
    this.timer = 0;
    this.pauseTimer = 0;
    this.choiceIndex = 0;
    this.blipTimer = 0;
    this.phase = 0;
    this.nodeKey = null;
  }

  get active() { return Dialogue.active; }

  /** Lays a parsed string out into pages of lines, keeping per-char styling. */
  layout(text) {
    const parsed = parseRichText(text);
    const maxChars = Math.floor((VIEW_W - MARGIN * 2 - 16 - (Dialogue.portrait ? 40 : 0)) / Font.charWidth());
    const lines = [];
    let line = [];
    let word = [];
    const pushWord = () => {
      if (line.length + word.length > maxChars && line.length) { lines.push(line); line = []; }
      line = line.concat(word);
      word = [];
    };
    for (const entry of parsed) {
      if (entry.ch === '\n') { pushWord(); lines.push(line); line = []; continue; }
      word.push(entry);
      if (entry.ch === ' ') pushWord();
    }
    pushWord();
    if (line.length) lines.push(line);

    const pages = [];
    for (let i = 0; i < lines.length; i += LINES_PER_PAGE) pages.push(lines.slice(i, i + LINES_PER_PAGE));
    return pages.length ? pages : [[]];
  }

  reset() {
    this.pages = this.layout(Dialogue.text);
    this.page = 0;
    this.revealed = 0;
    this.timer = 0;
    this.pauseTimer = 0;
    this.choiceIndex = 0;
  }

  get pageChars() { return this.pages[this.page]?.reduce((n, l) => n + l.length, 0) ?? 0; }
  get pageDone() { return this.revealed >= this.pageChars; }

  /** The parsed entry at a flat index within the current page. */
  entryAt(index) {
    let i = index;
    for (const line of this.pages[this.page] || []) {
      if (i < line.length) return line[i];
      i -= line.length;
    }
    return null;
  }

  update(dt) {
    if (!this.active) { this.nodeKey = null; return; }
    this.phase += dt;

    // Re-layout whenever the system moves to a different node.
    const key = `${Dialogue.treeId}:${Dialogue.nodeId}`;
    if (key !== this.nodeKey) { this.nodeKey = key; this.reset(); }

    const choices = Dialogue.choices;

    if (!this.pageDone) {
      if (this.pauseTimer > 0) this.pauseTimer -= dt;
      else {
        const entry = this.entryAt(this.revealed);
        const cps = BASE_CPS * Settings.get('textSpeed') * (entry?.speed ?? 1);
        this.timer += dt;
        while (this.timer >= 1 / cps && !this.pageDone) {
          this.timer -= 1 / cps;
          const current = this.entryAt(this.revealed);
          this.revealed++;
          if (current?.pause) { this.pauseTimer = current.pause; break; }
          if (current && current.ch !== ' ') {
            this.blipTimer -= 1;
            if (this.blipTimer <= 0) { Audio.playSfx('text_blip', { volume: 0.5, variation: 0.08 }); this.blipTimer = 2; }
          }
        }
      }
      // Confirm skips the typewriter rather than advancing.
      if (Input.justPressed('confirm') || Input.justPressed('interact')) {
        this.revealed = this.pageChars;
        this.pauseTimer = 0;
      }
      return;
    }

    if (choices?.length) {
      if (Input.justPressed('up')) { this.choiceIndex = (this.choiceIndex - 1 + choices.length) % choices.length; Audio.playSfx('ui_move', { volume: 0.7 }); }
      if (Input.justPressed('down')) { this.choiceIndex = (this.choiceIndex + 1) % choices.length; Audio.playSfx('ui_move', { volume: 0.7 }); }
      if (Input.justPressed('confirm') || Input.justPressed('interact')) {
        Audio.playSfx('ui_select');
        Dialogue.choose(this.choiceIndex);
      }
      return;
    }

    if (Input.justPressed('confirm') || Input.justPressed('interact')) {
      if (this.page < this.pages.length - 1) { this.page++; this.revealed = 0; Audio.playSfx('ui_move', { volume: 0.4 }); }
      else Dialogue.advance();
    }
  }

  render(renderer) {
    if (!this.active) return;
    const ctx = renderer.ctx;
    const choices = Dialogue.choices;
    const boxY = VIEW_H - BOX_H - MARGIN;
    panel(ctx, MARGIN, boxY, VIEW_W - MARGIN * 2, BOX_H);

    let textX = MARGIN + 10;
    const textY = boxY + 14;

    // Portrait
    const portraitKey = Dialogue.portrait;
    if (portraitKey && PORTRAIT_INDEX[portraitKey] !== undefined) {
      const sheet = Assets.image('portraits');
      const px = MARGIN + 6;
      const py = boxY + 12;
      ctx.fillStyle = 'rgba(7,9,11,0.8)';
      ctx.fillRect(px - 1, py - 1, 34, 34);
      if (sheet) ctx.drawImage(sheet, PORTRAIT_INDEX[portraitKey] * 32, 0, 32, 32, px, py, 32, 32);
      renderer.outline(px - 1, py - 1, 34, 34, PALETTE.concreteLight);
      textX = px + 40;
    }

    // Speaker name sits on the top edge of the panel
    const speaker = Dialogue.speaker;
    if (speaker) {
      const w = Font.measure(speaker) + 8;
      ctx.fillStyle = PALETTE.ash;
      ctx.fillRect(MARGIN + 8, boxY - 5, w, 12);
      renderer.outline(MARGIN + 8, boxY - 5, w, 12, PALETTE.concreteLight);
      Font.draw(ctx, speaker, MARGIN + 12, boxY - 4, { color: PALETTE.glow });
    }

    // Text, character by character, with the effects the tags asked for
    let index = 0;
    const lines = this.pages[this.page] || [];
    lines.forEach((line, li) => {
      let x = textX;
      const y = textY + li * Font.lineHeight();
      for (const entry of line) {
        if (index >= this.revealed) { index++; x += Font.charWidth(); continue; }
        let dx = 0;
        let dy = 0;
        if (entry.shake) { dx = (Math.random() * 2 - 1); dy = (Math.random() * 2 - 1); }
        if (entry.wave) dy += Math.sin(this.phase * 6 + index * 0.6) * 1.5;
        Font.drawChar(ctx, entry.ch, x + dx + 1, y + dy + 1, 'rgba(0,0,0,0.75)');
        Font.drawChar(ctx, entry.ch, x + dx, y + dy, entry.color || PALETTE.bone);
        x += Font.charWidth();
        index++;
      }
    });

    if (choices?.length && this.pageDone) {
      const cw = Math.max(...choices.map((c) => Font.measure(localised(c.text)))) + 22;
      const ch = choices.length * 14 + 10;
      const cx = VIEW_W - MARGIN - cw - 4;
      const cy = boxY - ch - 4;
      panel(ctx, cx, cy, cw, ch);
      choices.forEach((choice, i) => {
        const selected = i === this.choiceIndex;
        Font.draw(ctx, localised(choice.text), cx + 14, cy + 6 + i * 14, { color: selected ? PALETTE.glow : PALETTE.bone });
        if (selected) {
          const caret = Assets.image('ui_caret');
          if (caret) ctx.drawImage(caret, cx + 5, cy + 8 + i * 14);
        }
      });
    } else if (this.pageDone) {
      // Blinking "continue" marker
      if (Math.sin(this.phase * 7) > 0) {
        const x = VIEW_W - MARGIN - 14;
        const y = boxY + BOX_H - 14;
        ctx.fillStyle = PALETTE.glow;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 6, y);
        ctx.lineTo(x + 3, y + 4);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
}

/** NPCs need to know when their conversation ended so they can wander again. */
Events.on('dialogue:end', ({ npcId }) => { if (npcId) Events.emit('npc:freed', { npcId }); });
