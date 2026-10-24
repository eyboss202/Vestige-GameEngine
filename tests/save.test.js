import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupGame } from './setup.js';
import { Save, GameState, Constants } from '../engine/index.js';

const storage = setupGame();
beforeEach(() => { storage.clear(); GameState.reset(); });

test('save/load round-trips the whole game state', () => {
  GameState.inventory.add('medkit', 3);
  GameState.setFlag('door_open', true);
  GameState.player.hp = 12;
  GameState.currentMap = 'cellar';
  assert.equal(Save.save(0), true);

  GameState.reset();
  assert.equal(GameState.inventory.quantity('medkit'), 0);

  assert.equal(Save.load(0), true);
  assert.equal(GameState.inventory.quantity('medkit'), 3);
  assert.equal(GameState.getFlag('door_open'), true);
  assert.equal(GameState.player.hp, 12);
  assert.equal(GameState.currentMap, 'cellar');
});

test('saves are written under the game\'s own namespace', () => {
  Save.save(1);
  assert.ok(storage.has('test-game.save.1'));
});

test('killed enemies stay dead only in saves written after the kill', () => {
  Save.save(0);                                // enemy alive here
  GameState.setFlag('killed:room_slime_1');    // what Enemy.die() records
  Save.save(1);

  Save.load(0);
  assert.equal(GameState.getFlag('killed:room_slime_1'), false);
  Save.load(1);
  assert.equal(GameState.getFlag('killed:room_slime_1'), true);
});

test('slot listing exposes previews without loading', () => {
  GameState.playtime = 125;
  Save.save(2);
  const slots = Save.list();
  assert.equal(slots.length, Constants.SAVE_SLOTS);
  assert.equal(slots[0].empty, true);
  assert.equal(slots[2].empty, false);
  assert.equal(slots[2].playtime, 125);
  assert.equal(Save.mostRecent(), 2);
});

test('old save versions are migrated forward instead of discarded', () => {
  storage.set('test-game.save.0', JSON.stringify({
    version: 1,
    savedAt: 1,
    state: { version: 1, currentMap: 'room', player: { hp: 5, maxHp: 20 }, inventory: [{ i: 'coin', q: 4 }] },
  }));
  assert.equal(Save.load(0), true);
  assert.equal(GameState.player.hunger, 100);    // backfilled by migration v1 -> v2
  assert.equal(GameState.inventory.quantity('coin'), 4);
  assert.equal(Save.read(0).version, Constants.SAVE_VERSION);
});

test('a corrupt slot reads as empty instead of crashing', (t) => {
  t.mock.method(console, 'warn', () => {});
  storage.set('test-game.save.0', '{ not json');
  assert.equal(Save.read(0), null);
  assert.equal(Save.load(0), false);
});
