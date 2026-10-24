import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupGame } from './setup.js';
import { Inventory, GameState, Events } from '../engine/index.js';

setupGame();
beforeEach(() => GameState.reset());

test('items stack up to stackSize, then spill into new slots', () => {
  const bag = new Inventory(10);
  assert.equal(bag.add('medkit', 7), 7);
  assert.deepEqual(bag.slots, [{ itemId: 'medkit', qty: 5 }, { itemId: 'medkit', qty: 2 }]);
  assert.equal(bag.quantity('medkit'), 7);
});

test('items without a stackSize never stack', () => {
  const bag = new Inventory(10);
  assert.equal(bag.add('letter', 2), 2);
  assert.deepEqual(bag.slots, [{ itemId: 'letter', qty: 1 }, { itemId: 'letter', qty: 1 }]);
});

test('a full bag reports how much it actually took', () => {
  const bag = new Inventory(1);
  assert.equal(bag.add('medkit', 8), 5);
  assert.equal(bag.add('coin', 1), 0);
});

test('weight capacity limits how much fits', () => {
  const bag = new Inventory(10, 5);   // rocks weigh 2 each
  assert.equal(bag.add('rock', 10), 2);
  assert.equal(bag.totalWeight(), 4);
});

test('remove() drains across stacks and drops empty slots', () => {
  const bag = new Inventory(10);
  bag.add('medkit', 7);
  assert.equal(bag.remove('medkit', 6), 6);
  assert.deepEqual(bag.slots, [{ itemId: 'medkit', qty: 1 }]);
  assert.equal(bag.remove('medkit', 9), 1);
  assert.equal(bag.count, 0);
});

test('unknown items are rejected', (t) => {
  t.mock.method(console, 'warn', () => {});
  assert.equal(new Inventory().add('ghost', 1), 0);
});

test('use() runs the item effect and consumes it, unless the effect refuses', () => {
  const bag = GameState.inventory;
  bag.add('medkit', 2);
  assert.equal(bag.use('medkit', { state: GameState }), false, 'refused at full HP');
  assert.equal(bag.quantity('medkit'), 2);

  GameState.player.hp = 10;
  assert.equal(bag.use('medkit', { state: GameState }), true);
  assert.equal(GameState.player.hp, 20);
  assert.equal(bag.quantity('medkit'), 1);
});

test('inventory changes are announced on the event bus', () => {
  const seen = [];
  const off = Events.on('inventory:changed', (e) => seen.push(e));
  new Inventory().add('coin', 3);
  off();
  assert.deepEqual(seen, [{ itemId: 'coin', delta: 3 }]);
});

test('equipment bonuses feed derived stats and the armor pool', () => {
  GameState.inventory.add('vest', 1);
  GameState.inventory.add('hat', 1);
  assert.equal(GameState.equipment.equip(GameState.inventory, 'vest'), true);
  assert.equal(GameState.equipment.equip(GameState.inventory, 'hat'), true);
  assert.equal(GameState.derivedStat('maxHp'), 35);
  assert.equal(GameState.player.maxArmor, 4);
  assert.equal(GameState.player.armor, 4);
});

test('items that are not in the bag, or have no slot, cannot be equipped', () => {
  assert.equal(GameState.equipment.equip(GameState.inventory, 'vest'), false);
  GameState.inventory.add('rock', 1);
  assert.equal(GameState.equipment.equip(GameState.inventory, 'rock'), false);
});
