import { Events, readable, placeTrap } from '../../engine/index.js';

/**
 * Every item in the game. `onUse` receives { state, scene, entity } and may
 * return false to refuse (e.g. healing at full health), which keeps the item
 * in the bag.
 *
 * Categories drive the inventory tabs:
 *   consumable | equipment | material | ammo | trap | quest | key | currency
 * `icon` indexes assets/ui/items_placeholder.png (16x16 cells, left to right)
 * — every item has its own dedicated cell (tools/gen_art.py build_ui()).
 * `iconTint` (hex, optional) still exists for a quick recolour of a shared
 * silhouette if a future item ever wants one, but nothing currently uses it.
 *
 * Equippable items add `slot` (one of systems/InventorySystem.js EQUIP_SLOTS)
 * and an optional `bonus` object read by GameState.derivedStat(). `rarity`
 * (see data/rarity.js) is optional and defaults to 'common'. `weight` is
 * optional and opt-in — see Inventory.totalWeight().
 * `dialogueId` on an item makes it "readable": onUse just starts that tree,
 * reusing the exact machinery Prop already uses for terminals and signs.
 * `readable()`/`placeTrap()` are ready-made onUse behaviours from
 * engine/systems/ItemEffects.js.
 */
export const ITEMS = {
  stim_syringe: {
    id: 'stim_syringe', icon: 0, category: 'consumable', stackSize: 5, consumable: true, value: 10,
    name: { en: 'Field stim', pt: 'Estimulante de campo' },
    description: {
      en: 'Corporate-issue autoinjector. The label has been scratched off.',
      pt: 'Autoinjector da corporacao. O rotulo foi raspado.',
    },
    onUse: ({ state }) => {
      const maxHp = state.derivedStat('maxHp');
      if (state.player.hp >= maxHp) return false;
      state.player.hp = Math.min(maxHp, state.player.hp + 8);
      Events.emit('player:healed', { amount: 8 });
      return true;
    },
  },
  ration_tin: {
    id: 'ration_tin', icon: 24, category: 'consumable', stackSize: 9, consumable: true, value: 6,
    name: { en: 'Ration tin', pt: 'Lata de racao' },
    description: { en: 'Sealed, dented, still edible.', pt: 'Selada, amolgada, ainda comestivel.' },
    onUse: ({ state }) => {
      state.player.stamina = state.derivedStat('maxStamina');
      state.player.hunger = Math.min(state.player.maxHunger, state.player.hunger + 45);
      const maxHp = state.derivedStat('maxHp');
      if (state.player.hp < maxHp) state.player.hp = Math.min(maxHp, state.player.hp + 3);
      return true;
    },
  },
  purified_water: {
    id: 'purified_water', icon: 25, category: 'consumable', stackSize: 6, consumable: true, value: 4,
    name: { en: 'Purified water', pt: 'Agua purificada' },
    description: { en: 'Run through a hand filter twice. Tastes like the filter.', pt: 'Filtrada duas vezes a mao. Sabe ao filtro.' },
    onUse: ({ state }) => {
      if (state.player.thirst >= state.player.maxThirst) return false;
      state.player.thirst = Math.min(state.player.maxThirst, state.player.thirst + 55);
      return true;
    },
  },
  stale_bread: {
    id: 'stale_bread', icon: 27, category: 'consumable', stackSize: 6, consumable: true, value: 3,
    name: { en: 'Stale bread', pt: 'Pao velho' },
    description: { en: 'Edges cut off. The rest is fine, probably.', pt: 'As pontas foram cortadas. O resto deve estar bem.' },
    onUse: ({ state }) => {
      if (state.player.hunger >= state.player.maxHunger) return false;
      state.player.hunger = Math.min(state.player.maxHunger, state.player.hunger + 30);
      return true;
    },
  },
  bandage: {
    id: 'bandage', icon: 17, category: 'consumable', stackSize: 8, consumable: true, value: 6,
    name: { en: 'Bandage', pt: 'Ligadura' },
    description: { en: 'Stops a bleed. Does not fix what caused it.', pt: 'Para uma hemorragia. Nao resolve a causa.' },
    onUse: ({ state }) => {
      const maxHp = state.derivedStat('maxHp');
      const hasBleed = state.player.injuries.some((i) => i.type === 'bleeding');
      state.player.injuries = state.player.injuries.filter((i) => i.type !== 'bleeding');
      const canHeal = state.player.hp < maxHp;
      if (canHeal) state.player.hp = Math.min(maxHp, state.player.hp + 2);
      return hasBleed || canHeal;
    },
  },
  cell_battery: {
    id: 'cell_battery', icon: 21, category: 'consumable', stackSize: 5, consumable: true, weight: 0.5, value: 5,
    name: { en: 'Power cell', pt: 'Celula de energia' },
    description: { en: 'Half charged. Recharges the flashlight.', pt: 'Meia carga. Recarrega a lanterna.' },
    onUse: ({ state }) => state.rechargeFlashlight(),
  },
  keycard_blue: {
    id: 'keycard_blue', icon: 2, category: 'key', stackSize: 1, consumable: false, rarity: 'rare',
    // icon 2 (keycard silhouette) already fits this one; storage_key below
    // uses the new dedicated key icon (8) instead.
    name: { en: 'Blue keycard', pt: 'Cartao azul' },
    description: { en: 'Clearance markings, no name.', pt: 'Marcas de acesso, sem nome.' },
    onPickup: ({ state }) => state.setFlag('has_blue_keycard', true),
  },
  storage_key: {
    id: 'storage_key', icon: 8, category: 'key', stackSize: 1, consumable: false, rarity: 'uncommon',
    name: { en: 'Storage key', pt: 'Chave do arrumo' },
    description: { en: 'Brass, worn smooth. Fits a locker, probably the quartermaster\'s.', pt: 'Latao, gasto e liso. Serve num cacifo, provavelmente do intendente.' },
  },
  scrap_metal: {
    id: 'scrap_metal', icon: 26, category: 'material', stackSize: 20, consumable: false, weight: 0.3, value: 2,
    name: { en: 'Scrap', pt: 'Sucata' },
    description: { en: 'Useful once there is something to build.', pt: 'Util assim que houver algo para construir.' },
  },
  scrip: {
    id: 'scrip', icon: 22, category: 'currency', stackSize: 999, consumable: false,
    name: { en: 'Scrip', pt: 'Ficha' },
    description: { en: 'Stamped tokens traders still accept, for reasons nobody explains.', pt: 'Fichas marcadas que os comerciantes ainda aceitam, sem ninguem explicar porque.' },
  },
  field_notes: {
    id: 'field_notes', icon: 9, category: 'quest', stackSize: 1, consumable: false,
    name: { en: 'Field notes', pt: 'Notas de campo' },
    description: { en: 'Placeholder record. Contents to be written.', pt: 'Registo temporario. Conteudo por escrever.' },
    dialogueId: 'note_field',
    onUse: readable('note_field'),
  },
  audio_recording: {
    id: 'audio_recording', icon: 23, category: 'quest', stackSize: 1, consumable: false,
    name: { en: 'Audio recording', pt: 'Gravacao audio' },
    description: { en: 'A handheld recorder, still holding a charge.', pt: 'Um gravador portatil, ainda com carga.' },
    dialogueId: 'note_audio',
    onUse: readable('note_audio', { sfx: 'text_blip' }),
  },
  bunker_log: {
    id: 'bunker_log', icon: 19, category: 'quest', stackSize: 1, consumable: false,
    name: { en: 'Shelter logbook', pt: 'Diario do abrigo' },
    description: { en: 'Sign-in sheet. Most of the entries just stop.', pt: 'Folha de registo. A maioria das entradas para a meio.' },
    dialogueId: 'note_bunker',
    onUse: readable('note_bunker'),
  },

  // ---------------------------------------------------------------- equipment
  plated_vest: {
    id: 'plated_vest', icon: 28, category: 'equipment', stackSize: 1, consumable: false,
    slot: 'armor', bonus: { armor: 3, maxHp: 5 }, rarity: 'uncommon', weight: 3, value: 45,
    name: { en: 'Plated vest', pt: 'Colete reforcado' },
    description: { en: 'Scavenged plating over a work vest. Heavy, but it stops things.', pt: 'Placas recuperadas sobre um colete de trabalho. Pesado, mas para coisas.' },
  },
  scavenger_helmet: {
    id: 'scavenger_helmet', icon: 18, category: 'equipment', stackSize: 1, consumable: false,
    slot: 'helmet', bonus: { armor: 1 }, rarity: 'common', weight: 1, value: 12,
    name: { en: 'Scavenger helmet', pt: 'Capacete de sucateiro' },
    description: { en: 'Dented. Whatever hit it last time, it worked.', pt: 'Amolgado. O que quer que o tenha acertado, funcionou.' },
  },
  padded_gloves: {
    id: 'padded_gloves', icon: 29, category: 'equipment', stackSize: 1, consumable: false,
    slot: 'gloves', bonus: { maxStamina: 10 }, rarity: 'common', weight: 0.5, value: 9,
    name: { en: 'Padded gloves', pt: 'Luvas acolchoadas' },
    description: { en: 'Better grip, fewer blisters.', pt: 'Melhor aderencia, menos bolhas.' },
  },
  worn_boots: {
    // Every other armor-slot piece (vest, helmet) contributes to the armor
    // pool; boots only granting speed read as broken/incomplete rather than
    // a deliberate "mobility over protection" tradeoff. Steel-toed enough to
    // add a point of armor same as the helmet, on top of the speed.
    id: 'worn_boots', icon: 30, category: 'equipment', stackSize: 1, consumable: false,
    slot: 'boots', bonus: { speed: 4, armor: 1 }, rarity: 'uncommon', weight: 1, value: 22,
    name: { en: 'Worn boots', pt: 'Botas gastas' },
    description: { en: 'Someone else\'s boots, broken in already. Steel toes, at least.', pt: 'Botas de outra pessoa, ja amaciadas. Bico de aco, pelo menos.' },
  },
  lucky_charm: {
    id: 'lucky_charm', icon: 20, category: 'equipment', stackSize: 1, consumable: false,
    slot: 'accessory', bonus: { maxHp: 3, maxStamina: 5 }, rarity: 'epic', weight: 0.1,
    name: { en: 'Lucky charm', pt: 'Amuleto da sorte' },
    description: { en: 'Probably does nothing. Feels like it does something.', pt: 'Provavelmente nao faz nada. Parece que faz.' },
  },
  flashlight: {
    // No `bonus` — unlike every other equip slot, this one doesn't add a
    // passive stat. Equipping it turns interior darkness off (drains
    // GameState.player.flashlightBattery while it does — see
    // GameScene.update()/render() and cell_battery above); it does nothing
    // outdoors. Battery level shows only in the inventory (renderBatteryMeter,
    // same treatment as the armor meter), never in the gameplay HUD.
    id: 'flashlight', icon: 16, category: 'equipment', stackSize: 1, consumable: false,
    slot: 'flashlight', rarity: 'uncommon', weight: 0.8, value: 30,
    name: { en: 'Flashlight', pt: 'Lanterna' },
    description: { en: 'Aluminium body, still holds together. Eats batteries fast.', pt: 'Corpo de aluminio, ainda inteira. Gasta pilhas depressa.' },
  },

  // ---------------------------------------------------------------- weapons
  combat_knife: {
    id: 'combat_knife', icon: 10, category: 'equipment', stackSize: 1, consumable: false,
    slot: 'weapon', weaponId: 'combat_knife', rarity: 'common', weight: 1,
    durability: { max: 70 },
    name: { en: 'Combat knife', pt: 'Faca de combate' },
    description: { en: 'Standard issue, long before any of this happened.', pt: 'Equipamento padrao, muito antes disto tudo acontecer.' },
  },
  service_pistol: {
    id: 'service_pistol', icon: 11, category: 'equipment', stackSize: 1, consumable: false,
    slot: 'weapon', weaponId: 'service_pistol', rarity: 'uncommon', weight: 1.5,
    durability: { max: 180 },
    name: { en: 'Service pistol', pt: 'Pistola de servico' },
    description: { en: 'Corporate security sidearm. Still has half a magazine.', pt: 'Arma da seguranca corporativa. Ainda tem meio carregador.' },
  },
  patrol_rifle: {
    id: 'patrol_rifle', icon: 12, category: 'equipment', stackSize: 1, consumable: false,
    slot: 'weapon', weaponId: 'patrol_rifle', rarity: 'rare', weight: 3.5,
    durability: { max: 260 },
    name: { en: 'Patrol rifle', pt: 'Espingarda de patrulha' },
    description: { en: 'Carbine-length, worn smooth at the grip.', pt: 'Carabina curta, pega desgastada de uso.' },
  },
  riot_shotgun: {
    id: 'riot_shotgun', icon: 13, category: 'equipment', stackSize: 1, consumable: false,
    slot: 'weapon', weaponId: 'riot_shotgun', rarity: 'rare', weight: 4,
    durability: { max: 90 },
    name: { en: 'Riot shotgun', pt: 'Caçadeira antimotim' },
    description: { en: 'Short barrel, wide spread. Not built for precision.', pt: 'Cano curto, dispersao larga. Nao feita para precisao.' },
  },
  pistol_ammo: {
    id: 'pistol_ammo', icon: 35, category: 'ammo', stackSize: 40, consumable: true, weight: 0.02, value: 1,
    name: { en: 'Pistol rounds', pt: 'Municao de pistola' },
    description: { en: 'A handful of loose 9mm.', pt: 'Um punhado de 9mm soltas.' },
  },
  rifle_ammo: {
    id: 'rifle_ammo', icon: 36, category: 'ammo', stackSize: 60, consumable: true, weight: 0.02, value: 1,
    name: { en: 'Rifle rounds', pt: 'Municao de espingarda' },
    description: { en: 'Carbine-length casings, still bright.', pt: 'Casquilhos de carabina, ainda brilhantes.' },
  },
  shotgun_shell: {
    id: 'shotgun_shell', icon: 37, category: 'ammo', stackSize: 20, consumable: true, weight: 0.05, value: 2,
    name: { en: 'Shotgun shells', pt: 'Cartuchos de caçadeira' },
    description: { en: 'Buckshot. Loud and forgiving of bad aim.', pt: 'Chumbo grosso. Barulhento e tolerante a pontaria fraca.' },
  },
  frag_grenade: {
    id: 'frag_grenade', icon: 15, category: 'equipment', stackSize: 3, consumable: false,
    weaponId: 'frag_grenade', rarity: 'uncommon', weight: 0.4,
    name: { en: 'Frag grenade', pt: 'Granada de fragmentacao' },
    description: { en: 'Pull, throw, don\'t hold onto it. Bound to the throw key, not use.', pt: 'Puxa, atira, nao segures. Ligada a tecla de atirar, nao a de usar.' },
    onUse: () => false,
  },

  // ------------------------------------------------------------------- traps
  spike_trap_kit: {
    id: 'spike_trap_kit', icon: 31, category: 'trap', stackSize: 4, consumable: true, weight: 1.2,
    name: { en: 'Spike trap kit', pt: 'Kit de armadilha de picos' },
    description: { en: 'Folds flat until something steps on it.', pt: 'Dobra-se ate algo lhe pisar em cima.' },
    onUse: placeTrap('spike', 7),
  },
  electric_trap_kit: {
    id: 'electric_trap_kit', icon: 32, category: 'trap', stackSize: 4, consumable: true, weight: 1.5,
    name: { en: 'Electric trap kit', pt: 'Kit de armadilha eletrica' },
    description: { en: 'Wired to whatever charge is left in the cell.', pt: 'Ligada a carga que sobrar na celula.' },
    onUse: placeTrap('electric', 4),
  },
  explosive_trap_kit: {
    id: 'explosive_trap_kit', icon: 33, category: 'trap', stackSize: 3, consumable: true, weight: 2,
    name: { en: 'Explosive trap kit', pt: 'Kit de armadilha explosiva' },
    description: { en: 'Do not use this one indoors.', pt: 'Nao uses esta ca dentro.' },
    onUse: placeTrap('explosive', 20),
  },
  alarm_trap_kit: {
    id: 'alarm_trap_kit', icon: 34, category: 'trap', stackSize: 4, consumable: true, weight: 0.8,
    name: { en: 'Alarm trap kit', pt: 'Kit de armadilha de alarme' },
    description: { en: 'Does no damage. Wakes up everything nearby.', pt: 'Nao causa dano. Acorda tudo por perto.' },
    onUse: placeTrap('alarm', 0),
  },
};
