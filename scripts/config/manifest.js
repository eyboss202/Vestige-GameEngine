/**
 * Every asset the game needs up front. Anything added here is preloaded by the
 * boot scene and reachable through Assets.image(key) / Assets.sound(key).
 * Files marked "placeholder" are generated stand-ins: replace the file, keep
 * the key, and nothing else has to change.
 */

/** Per-archetype voice cues — one idle/alert/attack/death set per entry,
 *  played positionally by Enemy.js (Enemy.playVoice(), pitched per archetype
 *  by data/enemies.js `voicePitch`). Real recordings from creature-sfx-16bit/
 *  (see tools/gen_audio.py's mapping comment above MONSTER_VOICES for which
 *  file went where); tools/gen_audio.py's monster_voices() is a synthesized
 *  fallback for a new archetype that doesn't have real audio picked yet. A
 *  new archetype just needs its four files at the paths below — this loop
 *  picks them up automatically once they exist. */
const MONSTER_VOICE_IDS = ['husk', 'mutant', 'brute', 'stalker', 'spitter', 'swarmling', 'sentinel'];
const MONSTER_SOUND_TYPES = ['idle', 'alert', 'attack', 'death'];
const MONSTER_SOUNDS = {};
for (const id of MONSTER_VOICE_IDS) {
  for (const type of MONSTER_SOUND_TYPES) {
    MONSTER_SOUNDS[`${id}_${type}`] = `assets/audio/${id}_${type}_placeholder.wav`;
  }
}

/** Shared-by-size-class pools (hurt reaction + footsteps), 3 variants each —
 *  Enemy.js's playSizeVoice() picks one at random per play, never repeating
 *  the immediately-previous pick, so even these generic (not per-archetype)
 *  cues avoid feeling like a loop. `hurt` has a small/mid/big tier;
 *  `steps` only small/big (see data/enemies.js `sizeClass`, Enemy.js
 *  mapping mid -> the 'big' step pool). */
const SIZE_VOICE_SOUNDS = {};
for (const tier of ['small', 'mid', 'big']) {
  for (let i = 1; i <= 3; i++) SIZE_VOICE_SOUNDS[`hurt_${tier}_${i}`] = `assets/audio/hurt_${tier}_${i}_placeholder.wav`;
}
for (const tier of ['small', 'big']) {
  for (let i = 1; i <= 3; i++) SIZE_VOICE_SOUNDS[`step_${tier}_${i}`] = `assets/audio/step_${tier}_${i}_placeholder.wav`;
}

export const MANIFEST = {
  images: {
    tileset:        'assets/tiles/tileset_placeholder.png',
    player_doctor:  'assets/sprites/player_doctor_placeholder.png',
    // Swapped onto the animator by entities/player/Player.js startDeath() —
    // a bloodied corpse variant shown for the (unchanged) collapse
    // animation, same 16x24 4x4 grid as the sheet above.
    player_doctor_dead: 'assets/sprites/player_doctor_dead_placeholder.png',
    // One dedicated walk-cycle sheet per weapon category — the held item is
    // baked onto the hand pixel at generation time (tools/gen_art.py
    // build_player() / draw_char() `held` param); Player.js swaps
    // this.animator.image to the matching key instead of compositing a
    // separate floating icon over the base sheet.
    player_doctor_melee:   'assets/sprites/player_doctor_melee_placeholder.png',
    player_doctor_pistol:  'assets/sprites/player_doctor_pistol_placeholder.png',
    player_doctor_rifle:   'assets/sprites/player_doctor_rifle_placeholder.png',
    player_doctor_shotgun: 'assets/sprites/player_doctor_shotgun_placeholder.png',
    npc_survivor:   'assets/sprites/npc_survivor_placeholder.png',
    npc_wanderer:   'assets/sprites/npc_wanderer_placeholder.png',
    enemy_husk:      'assets/sprites/enemy_husk_placeholder.png',
    enemy_mutant:    'assets/sprites/enemy_mutant_placeholder.png',
    enemy_brute:     'assets/sprites/enemy_brute_placeholder.png',
    enemy_stalker:   'assets/sprites/enemy_stalker_placeholder.png',
    enemy_spitter:   'assets/sprites/enemy_spitter_placeholder.png',
    enemy_swarmling: 'assets/sprites/enemy_swarmling_placeholder.png',
    enemy_sentinel:  'assets/sprites/enemy_sentinel_placeholder.png',
    portraits:      'assets/ui/portraits_placeholder.png',
    ui_panel:       'assets/ui/panel9_placeholder.png',
    ui_caret:       'assets/ui/caret_placeholder.png',
    ui_items:       'assets/ui/items_placeholder.png',
    hud_icons:      'assets/ui/hud_icons_placeholder.png',
    font_main:      'assets/fonts/font_7x12_placeholder.png',
    containers:     'assets/sprites/containers_placeholder.png',
    phone:          'assets/sprites/phone_placeholder.png',
  },
  sounds: {
    ui_move:          'assets/audio/ui_move_placeholder.wav',
    ui_select:        'assets/audio/ui_select_placeholder.wav',
    ui_back:          'assets/audio/ui_back_placeholder.wav',
    text_blip:        'assets/audio/text_blip_placeholder.wav',
    pickup:           'assets/audio/pickup_placeholder.wav',
    hurt:             'assets/audio/hurt_placeholder.wav',
    footstep:         'assets/audio/footstep_placeholder.wav',
    door:             'assets/audio/door_placeholder.wav',
    attack_melee:     'assets/audio/attack_melee_placeholder.wav',
    attack_gun:       'assets/audio/attack_gun_placeholder.wav',
    throw:            'assets/audio/throw_placeholder.wav',
    explosion:        'assets/audio/explosion_placeholder.wav',
    trap:             'assets/audio/trap_placeholder.wav',
    page_turn:        'assets/audio/page_turn_placeholder.wav',
    reload:           'assets/audio/reload_placeholder.wav',
    death_sting:      'assets/audio/death_sting_placeholder.wav',
    ...MONSTER_SOUNDS,
    ...SIZE_VOICE_SOUNDS,
  },
  music: {
    menu_theme:       'assets/audio/menu_theme_placeholder.wav',
    ambient_lab:      'assets/audio/ambient_lab_placeholder.wav',
    ambient_outside:  'assets/audio/ambient_outside_placeholder.wav',
    death_ambient:    'assets/audio/death_ambient_placeholder.wav',
    // Real track from ChaseSong/ (not synthesized) — .ogg rather than .wav
    // like everything else here purely for size: the source .wav is ~9MB,
    // the .ogg ~950KB, and AssetManager preloads every music track up front
    // (loadManifest()) so that difference is real load time. See
    // GameScene.js `updateChaseMusic()` for when it actually plays.
    chase_theme:      'assets/audio/chase_theme_placeholder.ogg',
  },
  maps: {
    lab_atrium:        'maps/lab_atrium.json',
    outside_courtyard: 'maps/outside_courtyard.json',
    bunker:            'maps/bunker.json',
  },
};
