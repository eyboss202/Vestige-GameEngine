import { Cutscene } from '../systems/CutsceneSystem.js';

/**
 * TEMPLATE — the first cutscene played after starting a new game (see
 * GameScene.enter()'s `fresh` handling below). Copy this file's shape for any
 * new cutscene: one small module with a flag constant and a function that
 * builds a step array and hands it to Cutscene.play().
 *
 * Demonstrates every step type systems/CutsceneSystem.js understands:
 *   fade         — screen wash in/out (here: open on black, then lift it)
 *   wait         — pure timing beats between other steps
 *   camera       — pan to a fixed point, independent of the player
 *   sfx          — a one-off sound cue
 *   dialogue     — runs an ordinary (chained) dialogue tree — data/dialogue.js `intro_wake`
 *   moveTo       — walks a named entity toward a point (here: the player, by
 *                  the fixed id `Player` is always constructed with)
 *   cameraFollow — hands the camera back to an entity once the scene is over
 *   flag         — records that this played, so it never runs twice
 *   emit         — fires a bus event other systems/listeners can react to
 *                  (GameScene re-shows the area title on `cutscene:introEnd`)
 *
 * The call site (GameScene.enter()) guards this so it only ever plays once
 * per save — `GameState.getFlag(INTRO_FLAG)` — the same "only once" pattern
 * docs/EXTENDING.md documents for the `trigger:reveal` example.
 */
export const INTRO_FLAG = 'intro_played';

/** Coordinates below are lab_atrium-specific (see maps/lab_atrium.json
 *  `spawns.default` / `spawns.atrium_centre`) — a cutscene tied to a
 *  particular map is allowed to know its geometry, same as a trigger is. */
export function playIntroCutscene() {
  Cutscene.play([
    // Open on black rather than cutting straight into a lit room.
    { type: 'fade', to: 1, seconds: 0 },
    { type: 'wait', seconds: 0.2 },
    { type: 'fade', to: 0, seconds: 1.6 },

    { type: 'wait', seconds: 0.3 },
    // Look up across the atrium before handing control to the player.
    { type: 'camera', x: 312, y: 184 },
    { type: 'wait', seconds: 1.8 },
    { type: 'sfx', key: 'door', volume: 0.5, rate: 0.8 },

    { type: 'dialogue', id: 'intro_wake' },

    { type: 'wait', seconds: 0.2 },
    // A few steps forward — reads as the player finally moving under their
    // own power once the monologue ends.
    { type: 'moveTo', entityId: 'player', x: 312, y: 432, speed: 26 },
    { type: 'wait', seconds: 0.3 },

    { type: 'cameraFollow', entityId: 'player' },
    { type: 'flag', key: INTRO_FLAG, value: true },
    { type: 'emit', event: 'cutscene:introEnd', payload: {} },
  ]);
}
