/**
 * VESTIGE — the sample game that ships with the engine.
 *
 * This file is the whole contract between a game and Vestige Engine: hand the
 * engine your data with defineGame(), then start it. Everything the game *is*
 * (maps, items, enemies, dialogue, art, audio) lives beside this file in
 * game/; nothing under engine/ knows any of it exists.
 */
import { defineGame, Game, BootScene, GameState } from '../engine/index.js';
import { MANIFEST } from './manifest.js';
import { ITEMS } from './data/items.js';
import { WEAPONS } from './data/weapons.js';
import { ENEMY_ARCHETYPES } from './data/enemies.js';
import { DIALOGUES } from './data/dialogue.js';
import { LOOT_TABLES } from './data/lootTables.js';
import { RARITIES } from './data/rarity.js';
import { SHOPS } from './data/shops.js';
import { SURVIVAL } from './data/survival.js';
import { playIntroCutscene } from './cutscenes/intro.js';

defineGame({
  // Manifest paths below (assets/..., maps/...) resolve against this folder.
  baseUrl: new URL('./', import.meta.url),
  config: {
    id: 'vestige',
    title: 'VESTIGE',
    startMap: 'lab_atrium',
    menuMusic: 'menu_theme',
    chaseMusic: 'chase_theme',
    currency: 'scrip',
    player: {
      sprite: 'player_doctor',
      deadSprite: 'player_doctor_dead',
      weaponSprites: {
        melee: 'player_doctor_melee', pistol: 'player_doctor_pistol',
        rifle: 'player_doctor_rifle', shotgun: 'player_doctor_shotgun',
      },
    },
    // Columns of assets/ui/portraits_placeholder.png.
    portraits: { doctor: 0, survivor: 1, wanderer: 2, husk: 3 },
    // Rows of assets/sprites/containers_placeholder.png.
    containerRows: {
      drawer: 0, cabinet: 1, locker: 2, wardrobe: 3, cupboard: 4, chest: 5, box: 6, shelf: 7, nightstand: 8,
    },
    onNewGame: playIntroCutscene,
  },
  manifest: MANIFEST,
  items: ITEMS,
  weapons: WEAPONS,
  enemies: ENEMY_ARCHETYPES,
  dialogue: DIALOGUES,
  lootTables: LOOT_TABLES,
  rarities: RARITIES,
  shops: SHOPS,
  survival: SURVIVAL,
  locales: {
    en: { 'menu.subtitle': 'engine demo' },
    pt: { 'menu.subtitle': 'demo do motor' },
  },
});

const game = new Game(document.getElementById('game'));
game.start(new BootScene(game));

// Handy while developing: `VESTIGE.state.setFlag('x', true)` from the console.
window.VESTIGE = { game, state: GameState };
