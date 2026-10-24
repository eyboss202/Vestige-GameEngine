import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupGame } from './setup.js';
import { Dialogue, GameState, Events, parseRichText, Settings } from '../engine/index.js';

setupGame();
beforeEach(() => { Dialogue.end(); GameState.reset(); Settings.set('language', 'en'); });

test('a conversation walks its nodes and writes flags on entry', () => {
  assert.equal(Dialogue.start('guard'), true);
  assert.equal(Dialogue.text, 'Halt.');
  assert.equal(GameState.getFlag('met_guard'), true);
  Dialogue.advance();
  assert.equal(Dialogue.text, 'Business?');
});

test('tree-level branches pick a different entry node from world flags', () => {
  GameState.setFlag('met_guard', true);
  Dialogue.start('guard');
  assert.equal(Dialogue.nodeId, 'again');
});

test('choices with unmet requirements are hidden', () => {
  Dialogue.start('guard');
  Dialogue.advance();
  assert.deepEqual(Dialogue.choices.map((c) => c.text), ['Trade', 'Leave']);
  GameState.setFlag('has_pass', true);
  assert.equal(Dialogue.choices.length, 3);
});

test('advance() is ignored while choices are on screen', () => {
  Dialogue.start('guard');
  Dialogue.advance();
  Dialogue.advance();
  assert.equal(Dialogue.nodeId, 'ask');
});

test('choosing sets flags, emits events and can end the conversation', () => {
  const emitted = [];
  const off = Events.on('shop:open', (e) => emitted.push(e));
  Dialogue.start('guard', { npcId: 'npc_1' });
  Dialogue.advance();
  Dialogue.choose(0);
  off();
  assert.equal(Dialogue.active, false);
  assert.equal(emitted[0].npcId, 'npc_1');
});

test('text is localised from the current language', () => {
  Settings.set('language', 'pt');
  Dialogue.start('guard');
  assert.equal(Dialogue.text, 'Alto.');
});

test('unknown trees are refused', (t) => {
  t.mock.method(console, 'warn', () => {});
  assert.equal(Dialogue.start('nobody'), false);
  assert.equal(Dialogue.active, false);
});

test('parseRichText strips tags into per-character styling', () => {
  const chars = parseRichText('a[c=#f00]b[/c][shake]c[/shake][p=0.5]d');
  assert.equal(chars.map((c) => c.ch).join(''), 'abcd');
  assert.equal(chars[0].color, null);
  assert.equal(chars[1].color, '#f00');
  assert.equal(chars[2].shake, true);
  assert.equal(chars[3].pause, 0.5);
});
