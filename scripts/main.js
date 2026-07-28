/**
 * Entry point. Everything else is reached from here through ES modules, so the
 * load order is explicit and there are no globals.
 */
import { Game } from './core/Game.js';
import { BootScene } from './scenes/BootScene.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);
game.start(new BootScene(game));

// Handy while developing: `window.VESTIGE.state.setFlag('x', true)` from the console.
import('./core/GameState.js').then(({ GameState }) => {
  window.VESTIGE = { game, state: GameState };
});
