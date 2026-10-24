import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupGame } from './setup.js';
import {
  Content, getItem, getArchetype, getRarity, storageKey, PALETTE, Assets, GameState,
} from '../engine/index.js';

setupGame({ palette: { glow: '#ff00ff' }, baseUrl: 'https://example.com/my-game' });

test('defineGame registers content tables', () => {
  assert.equal(getItem('medkit').id, 'medkit');
  assert.equal(getItem('does_not_exist'), null);
  assert.equal(Content.config.title, 'TEST');
});

test('config is merged over engine defaults, including nested player config', () => {
  assert.equal(Content.config.startSpawn, 'default');     // engine default kept
  assert.equal(Content.config.player.sprite, 'player');   // nested default kept
  assert.deepEqual(Content.config.player.stats, { maxHp: 30, hp: 30 });
});

test('survival tuning merges over engine defaults', () => {
  assert.equal(Content.survival.hungerDepleteSeconds, 100);   // overridden
  assert.equal(Content.survival.respawnMeterFloor, 30);       // default
});

test('unknown enemy archetypes fall back to the first one defined', (t) => {
  t.mock.method(console, 'warn', () => {});
  assert.equal(getArchetype('slime').id, 'slime');
  assert.equal(getArchetype('dragon').id, 'slime');
});

test('unknown rarities fall back to common', () => {
  assert.equal(getRarity('rare').color, '#5fa8d8');
  assert.equal(getRarity('mythic').id, 'common');
});

test('storage keys are namespaced by game id', () => {
  assert.equal(storageKey('save.0'), 'test-game.save.0');
});

test('palette overrides are applied in place', () => {
  assert.equal(PALETTE.glow, '#ff00ff');
  assert.equal(PALETTE.void, '#07090b');
});

test('baseUrl becomes the asset base path, with a trailing slash', () => {
  assert.equal(Assets.basePath, 'https://example.com/my-game/');
});

test('a new game starts on the configured map with configured player stats', () => {
  GameState.reset();
  assert.equal(GameState.currentMap, 'room');
  assert.equal(GameState.player.maxHp, 30);
  assert.equal(GameState.player.speed, 58);   // untouched default
});
