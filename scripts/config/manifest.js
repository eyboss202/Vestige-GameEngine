/**
 * Every asset the game needs up front. Anything added here is preloaded by the
 * boot scene and reachable through Assets.image(key) / Assets.sound(key).
 * Files marked "placeholder" are generated stand-ins: replace the file, keep
 * the key, and nothing else has to change.
 */
export const MANIFEST = {
  images: {
    tileset:        'assets/tiles/tileset_placeholder.png',
    player_doctor:  'assets/sprites/player_doctor_placeholder.png',
    npc_survivor:   'assets/sprites/npc_survivor_placeholder.png',
    npc_wanderer:   'assets/sprites/npc_wanderer_placeholder.png',
    enemy_husk:     'assets/sprites/enemy_husk_placeholder.png',
    portraits:      'assets/ui/portraits_placeholder.png',
    ui_panel:       'assets/ui/panel9_placeholder.png',
    ui_caret:       'assets/ui/caret_placeholder.png',
    ui_items:       'assets/ui/items_placeholder.png',
    font_main:      'assets/fonts/font_7x12_placeholder.png',
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
  },
  music: {
    menu_theme:       'assets/audio/menu_theme_placeholder.wav',
    ambient_lab:      'assets/audio/ambient_lab_placeholder.wav',
    ambient_outside:  'assets/audio/ambient_outside_placeholder.wav',
  },
  maps: {
    lab_atrium:        'maps/lab_atrium.json',
    outside_courtyard: 'maps/outside_courtyard.json',
    bunker:            'maps/bunker.json',
  },
};
