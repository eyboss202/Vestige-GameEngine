/**
 * Content lint for the bundled sample game: every id one table points at must
 * exist in the table it points into, and every file the manifest lists must be
 * on disk. These are the mistakes a data-driven game otherwise only discovers
 * by walking into them in the browser.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MANIFEST } from '../game/manifest.js';
import { ITEMS } from '../game/data/items.js';
import { WEAPONS } from '../game/data/weapons.js';
import { ENEMY_ARCHETYPES } from '../game/data/enemies.js';
import { DIALOGUES } from '../game/data/dialogue.js';
import { LOOT_TABLES } from '../game/data/lootTables.js';
import { RARITIES } from '../game/data/rarity.js';
import { SHOPS } from '../game/data/shops.js';
import { EQUIP_SLOTS } from '../engine/index.js';

const GAME_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../game');
const maps = Object.entries(MANIFEST.maps).map(([id, file]) => ({
  id, data: JSON.parse(fs.readFileSync(path.join(GAME_DIR, file), 'utf8')),
}));

test('every manifest file exists on disk', () => {
  for (const group of ['images', 'sounds', 'music', 'maps']) {
    for (const [key, file] of Object.entries(MANIFEST[group])) {
      assert.ok(fs.existsSync(path.join(GAME_DIR, file)), `${group}.${key}: ${file} is missing`);
    }
  }
});

test('items reference real weapons, dialogue, rarities and equip slots', () => {
  for (const item of Object.values(ITEMS)) {
    assert.equal(typeof item.id, 'string');
    if (item.weaponId) assert.ok(WEAPONS[item.weaponId], `${item.id} -> weapon ${item.weaponId}`);
    if (item.dialogueId) assert.ok(DIALOGUES[item.dialogueId], `${item.id} -> dialogue ${item.dialogueId}`);
    if (item.rarity) assert.ok(RARITIES[item.rarity], `${item.id} -> rarity ${item.rarity}`);
    if (item.slot) assert.ok(EQUIP_SLOTS.includes(item.slot), `${item.id} -> slot ${item.slot}`);
  }
});

test('ranged weapons use ammo items that exist', () => {
  for (const weapon of Object.values(WEAPONS)) {
    if (weapon.ammoType) assert.ok(ITEMS[weapon.ammoType], `${weapon.id} -> ammo ${weapon.ammoType}`);
  }
});

test('enemies use sprites from the manifest and loot tables that exist', () => {
  for (const enemy of Object.values(ENEMY_ARCHETYPES)) {
    assert.ok(MANIFEST.images[enemy.sprite], `${enemy.id} -> sprite ${enemy.sprite}`);
    if (enemy.lootTable) assert.ok(LOOT_TABLES[enemy.lootTable], `${enemy.id} -> loot ${enemy.lootTable}`);
  }
});

test('loot tables and shops only hand out real items', () => {
  for (const [id, table] of Object.entries(LOOT_TABLES)) {
    for (const entry of table.entries) if (entry.itemId) assert.ok(ITEMS[entry.itemId], `loot ${id} -> ${entry.itemId}`);
  }
  for (const shop of Object.values(SHOPS)) {
    for (const entry of shop.sells) assert.ok(ITEMS[entry.itemId], `shop ${shop.id} -> ${entry.itemId}`);
  }
});

test('dialogue nodes only point at nodes in their own tree', () => {
  for (const [treeId, tree] of Object.entries(DIALOGUES)) {
    const nodes = tree.nodes;
    assert.ok(nodes[tree.start], `${treeId}: start node "${tree.start}"`);
    const targets = [
      ...(tree.branches || []).map((b) => b.next),
      ...Object.values(nodes).flatMap((n) => [n.next, ...(n.branches || []).map((b) => b.next), ...(n.choices || []).map((c) => c.next)]),
    ];
    for (const next of targets) if (next) assert.ok(nodes[next], `${treeId}: missing node "${next}"`);
  }
});

test('map entities reference real content', () => {
  for (const { id, data } of maps) {
    for (const e of data.entities) {
      const where = `${id}/${e.id ?? e.type}`;
      if (e.type === 'enemy') assert.ok(ENEMY_ARCHETYPES[e.archetype], `${where} -> archetype ${e.archetype}`);
      if (e.type === 'item') assert.ok(ITEMS[e.itemId], `${where} -> item ${e.itemId}`);
      if (e.dialogue) assert.ok(DIALOGUES[e.dialogue], `${where} -> dialogue ${e.dialogue}`);
      if (e.shop) assert.ok(SHOPS[e.shop], `${where} -> shop ${e.shop}`);
      if (e.sprite) assert.ok(MANIFEST.images[e.sprite], `${where} -> sprite ${e.sprite}`);
      for (const c of e.contents || []) assert.ok(ITEMS[c.itemId], `${where} -> contents ${c.itemId}`);
      if (e.lock?.requiresKey) assert.ok(ITEMS[e.lock.requiresKey], `${where} -> key ${e.lock.requiresKey}`);
    }
  }
});

test('portals lead to maps and spawn points that exist', () => {
  const byId = Object.fromEntries(maps.map((m) => [m.id, m.data]));
  for (const { id, data } of maps) {
    for (const trigger of data.triggers.filter((t) => t.type === 'portal')) {
      const target = byId[trigger.target];
      assert.ok(target, `${id}: portal to unknown map "${trigger.target}"`);
      assert.ok(target.spawns[trigger.spawn || 'default'], `${id}: portal to ${trigger.target} uses unknown spawn "${trigger.spawn}"`);
      if (trigger.requiresKey) assert.ok(ITEMS[trigger.requiresKey], `${id}: portal key ${trigger.requiresKey}`);
    }
    if (data.ambient?.music) assert.ok(MANIFEST.music[data.ambient.music], `${id}: music ${data.ambient.music}`);
  }
});

test('map layers match the declared map size', () => {
  for (const { id, data } of maps) {
    const cells = data.width * data.height;
    assert.equal(data.layers.ground.length, cells, `${id}: ground layer`);
    assert.equal(data.collision.length, cells, `${id}: collision grid`);
  }
});

test('every map entity has an id, unique across all maps', () => {
  // World flags like killed:<id>, picked:<id> and unlocked:<id> are global,
  // so a reused id would make one map's enemy die in another.
  const seen = new Map();
  for (const { id, data } of maps) {
    for (const e of data.entities) {
      assert.ok(e.id, `${id}: a ${e.type} entity has no id`);
      assert.ok(!seen.has(e.id), `id "${e.id}" used in both ${seen.get(e.id)} and ${id}`);
      seen.set(e.id, id);
    }
  }
});
