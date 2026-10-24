import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupGame } from './setup.js';
import {
  rollLoot, weightedPick, priceFor, getShop, moveAndCollide, Entity, t, Settings, languages,
  isLocked, tryUnlock, keyName, GameState,
} from '../engine/index.js';

setupGame();

/** Deterministic stand-in for Math.random: replays a fixed sequence. */
const sequence = (...values) => { let i = 0; return () => values[i++ % values.length]; };

test('weightedPick respects weights', () => {
  const entries = [{ id: 'a', weight: 1 }, { id: 'b', weight: 3 }];
  assert.equal(weightedPick(entries, () => 0.1).id, 'a');
  assert.equal(weightedPick(entries, () => 0.9).id, 'b');
});

test('rollLoot honours rolls, "nothing" entries and quantity ranges', () => {
  // roll 1 -> null entry (nothing), roll 2 -> coin with qty from the range
  const drops = rollLoot('slime', sequence(0.2, 0.9, 0.99));
  assert.deepEqual(drops, [{ itemId: 'coin', qty: 4 }]);
  assert.deepEqual(rollLoot('missing_table'), []);
});

test('shop prices apply buy/sell multipliers', () => {
  const shop = getShop('general');
  assert.equal(priceFor(shop, 'medkit', true, 10), 30);   // listed 20 x 1.5
  assert.equal(priceFor(shop, 'rock', false, 3), 2);      // value 3 x 0.5, rounded
});

test('moveAndCollide slides along walls instead of sticking', () => {
  // 4x4 map, solid column at x = 2 (pixels 32..47)
  const map = { isSolidTile: (tx, ty) => tx < 0 || ty < 0 || tx > 3 || ty > 3 || tx === 2 };
  const body = new Entity({ x: 20, y: 30 });
  const result = moveAndCollide(body, 20, 5, map);
  assert.equal(result.hitX, true);
  assert.equal(result.hitY, false);
  assert.equal(body.x, 27);   // flush against the wall: right edge at 32
  assert.equal(body.y, 35);   // still moved along the free axis
});

test('game locale strings override the engine\'s, which fill the gaps', () => {
  Settings.set('language', 'en');
  assert.equal(t('menu.newGame'), 'Begin');                 // game override
  assert.equal(t('menu.settings'), 'Settings');             // engine default
  assert.equal(t('notify.lockedNeeds', { name: 'X' }).includes('X'), true);
  assert.equal(t('totally.unknown.key'), 'totally.unknown.key');
  Settings.set('language', 'pt');
  assert.equal(t('menu.subtitle'), 'a test');               // falls back to the game's English
  assert.deepEqual(languages().map((l) => l.code), ['en', 'pt']);
});

test('locks open with the right key and remember being opened', () => {
  GameState.reset();
  const lock = { requiresKey: 'gate_key', consumeKey: true };
  assert.equal(isLocked(lock, 'gate'), true);
  assert.equal(tryUnlock(lock, 'gate'), false);
  GameState.inventory.add('gate_key', 1);
  assert.equal(tryUnlock(lock, 'gate'), true);
  assert.equal(GameState.inventory.has('gate_key'), false);   // consumed
  assert.equal(isLocked(lock, 'gate'), false);                // ...but stays open
  Settings.set('language', 'pt');
  assert.equal(keyName(lock), 'Chave do portao');
});
