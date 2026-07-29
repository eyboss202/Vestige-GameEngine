/**
 * Weapon archetypes. An equippable item points at one via `weaponId`
 * (see entities/items/ItemDatabase.js); Player.attack()/throwItem() dispatch
 * on `category`. `mods` is reserved and empty — the seam for future upgrades,
 * read the same way everything else here is read (nothing special about it
 * yet, just a place later code can append to).
 *
 * `magazineSize`/`reloadTime` (ranged only) back the manual-reload system —
 * Player.attack() fires from GameState.weaponAmmo (the magazine), and only
 * Player.reload() pulls from the inventory's `ammoType` reserve. A weapon
 * without `magazineSize` (none currently) would just refuse to reload.
 *
 * categories: melee | pistol | rifle | shotgun | throwable
 */
export const WEAPONS = {
  combat_knife: {
    id: 'combat_knife', category: 'melee',
    damage: 6, range: 16, cooldown: 0.32,
    mods: [],
  },
  service_pistol: {
    id: 'service_pistol', category: 'pistol',
    damage: 5, cooldown: 0.38, ammoType: 'pistol_ammo',
    magazineSize: 12, reloadTime: 0.9,
    projectile: { speed: 230, pellets: 1, spread: 0.02, life: 0.9 },
    mods: [],
  },
  patrol_rifle: {
    id: 'patrol_rifle', category: 'rifle',
    damage: 4, cooldown: 0.14, ammoType: 'rifle_ammo',
    magazineSize: 30, reloadTime: 1.3,
    projectile: { speed: 280, pellets: 1, spread: 0.035, life: 1.0 },
    mods: [],
  },
  riot_shotgun: {
    id: 'riot_shotgun', category: 'shotgun',
    damage: 3, cooldown: 0.85, ammoType: 'shotgun_shell',
    magazineSize: 6, reloadTime: 1.6,
    projectile: { speed: 200, pellets: 6, spread: 0.32, life: 0.4 },
    mods: [],
  },
  frag_grenade: {
    id: 'frag_grenade', category: 'throwable',
    damage: 16, radius: 38, throwSpeed: 150, fuse: 1.0,
    mods: [],
  },
};

export function getWeapon(id) { return WEAPONS[id] || null; }
