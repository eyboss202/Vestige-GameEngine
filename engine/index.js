/**
 * Vestige Engine — public API.
 *
 * A game imports everything it needs from this one module. A minimal game:
 *
 *   import { defineGame, Game, BootScene } from '../engine/index.js';
 *
 *   defineGame({
 *     baseUrl: new URL('./', import.meta.url),
 *     config: { id: 'my-game', title: 'MY GAME', startMap: 'town' },
 *     manifest, items, weapons, enemies, dialogue, lootTables, rarities, shops,
 *   });
 *
 *   const game = new Game(document.getElementById('game'));
 *   game.start(new BootScene(game));
 *
 * Everything below is grouped the same way the folders are.
 */

// Content registry — the engine/game seam.
export {
  Content, defineGame, storageKey,
  getItem, allItems, getWeapon, getArchetype, getRarity, getShop, getDialogue, FALLBACK_ICON,
} from './core/Content.js';

// Core
export { Game } from './core/Game.js';
export { Scene } from './core/Scene.js';
export { SceneManager } from './core/SceneManager.js';
export { Renderer } from './core/Renderer.js';
export { Camera } from './core/Camera.js';
export { Input } from './core/Input.js';
export { Events } from './core/EventBus.js';
export { Assets } from './core/AssetManager.js';
export { Animator } from './core/Animation.js';
export { GameState } from './core/GameState.js';
export { t, localised, languages } from './core/I18n.js';
export { aabb, pointInRect, moveAndCollide, distance } from './core/Collision.js';
export { hitEntitiesInBox, applyRadiusDamage } from './core/Combat.js';
export { isLocked, tryUnlock, keyName } from './core/Locks.js';

// Config
export * as Constants from './config/Constants.js';
export { VIEW_W, VIEW_H, TILE, PALETTE } from './config/Constants.js';
export { Settings } from './config/Settings.js';
export { DEFAULT_BINDINGS, BINDABLE, keyLabel } from './config/Keybindings.js';

// Systems
export { Audio } from './systems/AudioSystem.js';
export { Save } from './systems/SaveSystem.js';
export { Dialogue, parseRichText } from './systems/DialogueSystem.js';
export { Cutscene } from './systems/CutsceneSystem.js';
export { Inventory, Equipment, EQUIP_SLOTS } from './systems/InventorySystem.js';
export { Survival } from './systems/SurvivalSystem.js';
export { Notifications } from './systems/NotificationSystem.js';
export { LightingSystem } from './systems/LightingSystem.js';
export { ParticleSystem } from './systems/ParticleSystem.js';
export { rollLoot, rollRarity, weightedPick } from './systems/LootSystem.js';
export { priceFor } from './systems/Economy.js';
export { readable, placeTrap } from './systems/ItemEffects.js';

// World
export { Maps } from './world/MapManager.js';
export { TileMap } from './world/TileMap.js';

// Entities
export { Entity } from './entities/Entity.js';
export { Player } from './entities/player/Player.js';
export { Enemy } from './entities/enemies/Enemy.js';
export { NPC } from './entities/npc/NPC.js';
export { ItemPickup } from './entities/items/ItemPickup.js';
export { Prop } from './entities/Prop.js';
export { Container } from './entities/Container.js';
export { Trap } from './entities/Trap.js';
export { Phone } from './entities/Phone.js';
export { Projectile } from './entities/Projectile.js';
export { Throwable } from './entities/Throwable.js';

// UI widgets
export { Font, BitmapFont } from './ui/BitmapFont.js';
export { MenuList } from './ui/MenuList.js';
export { nineSlice, panel } from './ui/NineSlice.js';
export { drawItemIcon, drawItemIconFor } from './ui/ItemIcon.js';

// Scenes
export { BootScene } from './scenes/BootScene.js';
export { MainMenuScene } from './scenes/MainMenuScene.js';
export { GameScene } from './scenes/GameScene.js';
export { PauseScene } from './scenes/PauseScene.js';
export { SettingsScene } from './scenes/SettingsScene.js';
export { SaveSlotScene } from './scenes/SaveSlotScene.js';
export { InventoryScene } from './scenes/InventoryScene.js';
export { ShopScene } from './scenes/ShopScene.js';
export { DeathScene } from './scenes/DeathScene.js';
