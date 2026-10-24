"""Builds the JSON maps from readable ASCII layouts.

The engine only ever reads the JSON. This script is a convenience authoring
tool: edit the ASCII, re-run, done. (Swap it for Tiled exports later — the
JSON shape is deliberately Tiled-like: flat layer arrays, row-major.)
"""
import json, os

OUT = os.path.join(os.path.dirname(__file__), "..", "game", "maps")

# char -> (ground tile, decor tile or None, solid)
LEGEND = {
    "#": (9, None, True),     # wall (face)
    ".": (1, None, False),    # concrete
    ",": (2, None, False),    # cracked concrete
    "=": (3, None, False),    # lab floor
    "g": (4, None, False),    # grass
    "G": (4, 5, False),       # tall grass
    "d": (6, None, False),    # dirt
    "m": (7, None, False),    # mossy concrete
    "~": (8, None, False),    # sludge
    "x": (17, None, False),   # broken glass
    "%": (18, None, False),   # grate
    "a": (19, None, False),   # asphalt
    "A": (20, None, False),   # cracked asphalt
    "u": (26, None, False),   # puddle
    "r": (None, 11, True),    # rubble
    "p": (None, 12, False),   # pipe
    "c": (None, 13, True),    # crate
    "T": (None, 14, True),    # terminal
    "B": (None, 24, True),    # lab bench
    "o": (None, 25, True),    # barrel
    "b": (None, 21, True),    # bush
    "t": (None, 22, True),    # dead tree
    "f": (None, 23, True),    # fence
    "s": (None, 27, True),    # sign
    "D": (15, None, False),   # door (open/walkable by default; lock via trigger.requiresFlag)
    "v": (9, 16, True),       # vines on wall
}

WALL_TOP = 10


def build(layout, w, h, floor):
    rows = []
    for y in range(h):
        line = layout[y] if y < len(layout) else ""
        line = (line + floor * w)[:w]
        line = "#" + line[1:-1] + "#" if 0 < y < h - 1 else "#" * w
        rows.append(line)

    ground = [0] * (w * h)
    decor = [-1] * (w * h)
    solid = [0] * (w * h)
    for y in range(h):
        for x in range(w):
            ch = rows[y][x]
            g, dcr, sol = LEGEND.get(ch, LEGEND[floor])
            i = y * w + x
            ground[i] = g if g is not None else LEGEND[floor][0]
            if dcr is not None:
                decor[i] = dcr
            if sol:
                solid[i] = 1
            # a wall whose southern neighbour is also a wall shows its flat top
            if ch in "#v" and y + 1 < h and rows[y + 1][x] in "#v":
                ground[i] = WALL_TOP
    return ground, decor, solid, rows


def t(x, y):
    """tile coords -> world pixel centre of that tile"""
    return x * 16 + 8, y * 16 + 8


# ---------------------------------------------------------------- LAB ATRIUM
LAB_W, LAB_H = 40, 32
LAB = [
    "########################################",
    "#....................................v.#",
    "#.====================================.#",
    "#.=..T...=.....B..B.....B..B....,,...=.#",
    "#.=......=..................o...,,...=.#",
    "#.=..c...=..x...x.......x.......,,...=.#",
    "#.=......=......................,,...=.#",
    "#.=====#####=====######=====#####=====.#",
    "#.=..................................=.#",
    "#.=...B..B.....%%%%%%.....B..B.......=.#",
    "#.=............%%%%%%................=.#",
    "#.=..T.........%%%%%%..........T.....=.#",
    "#.=............%%%%%%................=.#",
    "#.=...B..B.....%%%%%%.....B..B.......=.#",
    "#.=..................................=.#",
    "#.=====######=====########====######=..#",
    "#.=...............,,.................=.#",
    "#.=..r.....o......,,........r........=.#",
    "#.=...............,,.................=.#",
    "#.=..x.....B......,,.......B....x....=.#",
    "#.=...............,,.................=.#",
    "#.===####=========,,=========####=====.#",
    "#.=...............,,.................=.#",
    "#.=....o..........,,...........o.....=.#",
    "#.=....p..........,,...........p.....=.#",
    "#.=...............,,.................=.#",
    "#.=====######=====,,=====#######======.#",
    "#.................,,.................,.#",
    "#..u...r..........,,..........r...u..,.#",
    "#.................,,.................,.#",
    "#################.D.####################",
    "########################################",
]

# ------------------------------------------------------------ OUTSIDE COURTYARD
OUT_W, OUT_H = 44, 34
OUTSIDE = [
    "############################################",
    "#vv#####vv####vv###vv####vv#####vv####vv##v#",
    "#####################D######################",
    "#ggggggggggAAAAAAAAAAaAAAAAAAAAAAggggggggggg#",
    "#gGgtgGggAAaaaaaaaaaaaaaaaaaaaaAAAgGggtgGgGg#",
    "#gggggggAAaaaaaaaaaaaaaaaaaaaaaaaAAgggGgggGg#",
    "#gGgbgGgAaaaaaaaaaaaaaaaaaaaaaaaaaAggggbgggg#",
    "#ggggggAAaaaaaaaaaaaaaaaaaaaaaaaaaAAggGggtgg#",
    "#gGgggAAaaaaaauuuaaaaaaaaaaaauuaaaaAAgggggGg#",
    "#gggtgAaaaaaaauuuaaaaaaoo.aaauuaaaaaAgGgbggg#",
    "#gGgggAaaaaaaaaaaaaaaaaoo.aaaaaaaaaaAggggggg#",
    "#ggbggAaaaaaaaaaaaaaaaa...aaaaaaaaaaAgGgggtg#",
    "#gGgggAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaAgggbgGg#",
    "#gggggAAaaaaaaaaaaaaaaaaaaaaaaaaaaaAAggGgggg#",
    "#gGgtgGAAaaaaaaaaaaaaaaaaaaaaaaaaaAAgggggGgg#",
    "#ggggggGAAAaaaaaaaaaaaaaaaaaaaaaAAAgGgggtggg#",
    "#gGgbgggggAAAAAaaaaaaaaaaaaaAAAAAgggggggggGg#",
    "#gggggGgggggggAAAAAAAaaAAAAAAAgggGggggbggggg#",
    "#gGggggggGgggggggggg,,,ggggggggggggGgggggGgg#",
    "#gggtgggggggGgggggg,,,,,ggggggtgggggggggGggg#",
    "#gGggggbgggggggggg,,,,,,,ggggggggggbgggggggg#",
    "#ggggggggggGgggggg,,mmm,,gggGgggggggggtggGgg#",
    "#gGgtggggggggggggg,,mmm,,gggggggggGgggggggGg#",
    "#gggggggbggGgggggg,,mmm,,ggggggbggggggGggggg#",
    "#gGggggggggggggggg,,,,,,,gggGggggggggggtgggg#",
    "#ffffffffffffffff,,,,,,,,,fffffffffffffffff#",
    "#ggggggggggggggg,,,,~~~,,,,gggggggggggggGggg#",
    "#gGgtgggbgggggg,,,,~~~~~,,,,gggbggggtggggggg#",
    "#ggggggggggGggg,,,,~~~~~,,,,ggggggGgggggbggg#",
    "#gGggggggggggggg,,,,~~~,,,,gggggggggggggggGg#",
    "#gggbggtgggggggggg,,,,,,,gggggtggggbgggggggg#",
    "#gGgggggggGggggggggg,,,gggggggggggGgggggGggg#",
    "#gggggggggggggggggggggggggggggggggggggggggg#",
    "############################################",
]

# ------------------------------------------------------------------- BUNKER
# A small underground shelter, reached from the courtyard hatch. Rows are
# built from arithmetic (not hand-typed ASCII) so their width is always
# exactly right regardless of edits.
BUNKER_W, BUNKER_H = 20, 14
BUNKER = [
    "#" * BUNKER_W,
    "#" + "." * 18 + "#",
    "#" + "." * 18 + "#",
    "#" + "." * 3 + "T" + "." * 4 + "p" + "." * 4 + "c" + "." * 4 + "#",
    "#" + "." * 18 + "#",
    "#" + "." * 8 + "o" + "." * 9 + "#",
    "#" + "." * 18 + "#",
    "#" + "." * 5 + "B" + "." * 12 + "#",
    "#" + "." * 18 + "#",
    "#" + "." * 18 + "#",
    "#" + "." * 4 + "r" + "." * 13 + "#",
    "#" + "." * 18 + "#",
    "#" + "." * 18 + "#",
    "#" * BUNKER_W,
]


def emit(map_id, name, w, h, layout, floor, ambient, lights, entities, triggers, spawns):
    ground, decor, solid, rows = build(layout, w, h, floor)
    data = {
        "id": map_id,
        "displayName": name,
        "width": w,
        "height": h,
        "tileSize": 16,
        "tileset": "assets/tiles/tileset_placeholder.png",
        "ambient": ambient,
        "layers": {"ground": ground, "decor": decor},
        "collision": solid,
        "lights": lights,
        "entities": entities,
        "triggers": triggers,
        "spawns": spawns,
    }
    with open(os.path.join(OUT, map_id + ".json"), "w") as f:
        json.dump(data, f, separators=(",", ":"))
    print(map_id, w, "x", h, "-", sum(solid), "solid tiles")


emit(
    "lab_atrium", "SUBLEVEL 2 - ATRIUM", LAB_W, LAB_H, LAB, ".",
    {"music": "ambient_lab", "darkness": 0.78, "tint": "#08140f", "vignette": 0.55},
    [
        {"x": 8 * 16, "y": 4 * 16, "radius": 62, "color": "#7fe0a8", "intensity": 0.9, "flicker": 0.10},
        {"x": 31 * 16, "y": 11 * 16, "radius": 58, "color": "#7fe0a8", "intensity": 0.8, "flicker": 0.35},
        {"x": 18 * 16, "y": 11 * 16, "radius": 90, "color": "#9fd8ff", "intensity": 0.55, "flicker": 0.05},
        {"x": 11 * 16, "y": 17 * 16, "radius": 54, "color": "#e0a458", "intensity": 0.7, "flicker": 0.45},
        {"x": 19 * 16, "y": 24 * 16, "radius": 70, "color": "#e0a458", "intensity": 0.6, "flicker": 0.15},
        {"x": 19 * 16, "y": 29 * 16, "radius": 80, "color": "#cfe6df", "intensity": 0.7, "flicker": 0.0},
    ],
    [
        {"type": "npc", "id": "npc_atrium_a", "x": t(9, 9)[0], "y": t(9, 9)[1] + 6,
         "sprite": "npc_survivor", "facing": "down", "dialogue": "npc_placeholder_a", "wander": True},
        {"type": "npc", "id": "npc_atrium_b", "x": t(30, 19)[0], "y": t(30, 19)[1] + 6,
         "sprite": "npc_wanderer", "facing": "left", "dialogue": "npc_placeholder_b", "wander": False,
         "schedule": [
             {"startHour": 0, "x": t(30, 19)[0], "y": t(30, 19)[1] + 6},
             {"startHour": 8, "x": t(25, 19)[0], "y": t(25, 19)[1]},
             {"startHour": 16, "x": t(30, 19)[0], "y": t(30, 19)[1] + 6},
         ]},
        {"type": "enemy", "id": "husk_lab_1", "archetype": "husk", "x": t(24, 17)[0], "y": t(24, 17)[1],
         "patrol": [[t(24, 17)[0], t(24, 17)[1]], [t(33, 17)[0], t(33, 17)[1]], [t(33, 23)[0], t(33, 23)[1]]]},
        {"type": "enemy", "id": "husk_lab_2", "archetype": "husk", "x": t(6, 23)[0], "y": t(6, 23)[1],
         "patrol": [[t(6, 23)[0], t(6, 23)[1]], [t(6, 28)[0], t(6, 28)[1]], [t(14, 28)[0], t(14, 28)[1]]]},
        {"type": "enemy", "id": "mutant_lab_1", "archetype": "mutant", "x": t(19, 11)[0], "y": t(19, 11)[1]},
        {"type": "item", "id": "pickup_lab_1", "itemId": "stim_syringe", "qty": 2, "x": t(13, 5)[0], "y": t(13, 5)[1]},
        {"type": "item", "id": "pickup_lab_2", "itemId": "keycard_blue", "qty": 1, "x": t(31, 11)[0], "y": t(31, 11)[1] + 12},
        {"type": "item", "id": "pickup_lab_3", "itemId": "cell_battery", "qty": 1, "x": t(11, 17)[0], "y": t(11, 17)[1] + 12},
        {"type": "item", "id": "pickup_lab_4", "itemId": "combat_knife", "qty": 1, "x": t(15, 5)[0], "y": t(15, 5)[1]},
        {"type": "item", "id": "pickup_lab_5", "itemId": "pistol_ammo", "qty": 8, "x": t(29, 11)[0], "y": t(29, 11)[1] + 12},
        {"type": "item", "id": "pickup_lab_6", "itemId": "plated_vest", "qty": 1, "x": t(9, 17)[0], "y": t(9, 17)[1]},
        {"type": "item", "id": "pickup_lab_7", "itemId": "bandage", "qty": 3, "x": t(33, 17)[0], "y": t(33, 17)[1]},
        {"type": "item", "id": "pickup_lab_8", "itemId": "spike_trap_kit", "qty": 2, "x": t(33, 23)[0], "y": t(33, 23)[1]},
        {"type": "trap", "id": "trap_lab_1", "trapType": "spike", "damage": 5, "faction": "enemy",
         "x": t(19, 17)[0], "y": t(19, 17)[1]},
        {"type": "item", "id": "pickup_lab_9", "itemId": "audio_recording", "qty": 1, "x": t(33, 5)[0], "y": t(33, 5)[1]},
        {"type": "prop", "id": "terminal_a", "x": t(5, 3)[0], "y": t(5, 3)[1] + 10, "dialogue": "prop_terminal", "label": "TERMINAL"},
        {"type": "prop", "id": "terminal_b", "x": t(5, 11)[0], "y": t(5, 11)[1] + 10, "dialogue": "prop_terminal", "label": "TERMINAL"},
        {"type": "prop", "id": "terminal_c", "x": t(31, 11)[0], "y": t(31, 11)[1] + 10, "dialogue": "prop_locked", "label": "TERMINAL"},
    ],
    [{"type": "portal", "x": 18 * 16, "y": 30 * 16, "w": 16, "h": 16,
      "target": "outside_courtyard", "spawn": "from_lab", "sfx": "door"},
     {"type": "ambush", "x": 19 * 16, "y": 20 * 16, "w": 16, "h": 16,
      "flag": "lab_ambush_triggered", "radius": 130}],
    {"default": {"x": t(19, 28)[0], "y": t(19, 28)[1], "facing": "up"},
     "from_outside": {"x": t(19, 29)[0], "y": t(19, 29)[1], "facing": "up"},
     "atrium_centre": {"x": t(19, 11)[0], "y": t(19, 11)[1], "facing": "down"}},
)

emit(
    "outside_courtyard", "FACILITY GROUNDS - NORTH YARD", OUT_W, OUT_H, OUTSIDE, "g",
    {"music": "ambient_outside", "darkness": 0.42, "tint": "#101c22", "vignette": 0.35},
    [
        {"x": 21 * 16, "y": 3 * 16, "radius": 70, "color": "#e0a458", "intensity": 0.75, "flicker": 0.25},
        {"x": 8 * 16, "y": 12 * 16, "radius": 64, "color": "#cfe6df", "intensity": 0.45, "flicker": 0.0},
        {"x": 34 * 16, "y": 14 * 16, "radius": 64, "color": "#cfe6df", "intensity": 0.45, "flicker": 0.0},
        {"x": 21 * 16, "y": 27 * 16, "radius": 76, "color": "#7fe0a8", "intensity": 0.5, "flicker": 0.2},
    ],
    [
        {"type": "npc", "id": "npc_yard_a", "x": t(26, 10)[0], "y": t(26, 10)[1],
         "sprite": "npc_wanderer", "facing": "left", "dialogue": "npc_placeholder_c", "wander": True},
        {"type": "npc", "id": "npc_trader_a", "x": t(9, 9)[0], "y": t(9, 9)[1],
         "sprite": "npc_survivor", "facing": "down", "dialogue": "npc_trader", "shop": "wanderer_trades", "wander": False},
        {"type": "enemy", "id": "husk_yard_1", "archetype": "husk", "x": t(12, 20)[0], "y": t(12, 20)[1],
         "patrol": [[t(12, 20)[0], t(12, 20)[1]], [t(30, 20)[0], t(30, 20)[1]]]},
        {"type": "enemy", "id": "husk_yard_2", "archetype": "husk", "x": t(21, 30)[0], "y": t(21, 30)[1],
         "patrol": [[t(21, 30)[0], t(21, 30)[1]], [t(21, 26)[0], t(21, 26)[1]], [t(28, 28)[0], t(28, 28)[1]]]},
        {"type": "enemy", "id": "spitter_yard_1", "archetype": "spitter", "x": t(30, 14)[0], "y": t(30, 14)[1]},
        {"type": "item", "id": "pickup_yard_1", "itemId": "ration_tin", "qty": 3, "x": t(24, 9)[0], "y": t(24, 9)[1]},
        {"type": "item", "id": "pickup_yard_2", "itemId": "scrap_metal", "qty": 4, "x": t(21, 22)[0], "y": t(21, 22)[1]},
        {"type": "item", "id": "pickup_yard_3", "itemId": "service_pistol", "qty": 1, "x": t(26, 20)[0], "y": t(26, 20)[1]},
        {"type": "item", "id": "pickup_yard_4", "itemId": "purified_water", "qty": 2, "x": t(15, 8)[0], "y": t(15, 8)[1]},
        {"type": "item", "id": "pickup_yard_5", "itemId": "scrip", "qty": 15, "x": t(30, 9)[0], "y": t(30, 9)[1]},
        {"type": "item", "id": "pickup_yard_6", "itemId": "electric_trap_kit", "qty": 2, "x": t(12, 14)[0], "y": t(12, 14)[1]},
        {"type": "trap", "id": "trap_yard_1", "trapType": "spike", "damage": 4, "faction": "enemy",
         "x": t(21, 20)[0], "y": t(21, 20)[1]},
        {"type": "prop", "id": "yard_sign", "x": t(23, 9)[0], "y": t(23, 9)[1] + 8, "dialogue": "prop_sign", "label": "SIGN"},
    ],
    [{"type": "portal", "x": 21 * 16, "y": 2 * 16, "w": 16, "h": 16,
      "target": "lab_atrium", "spawn": "from_outside", "sfx": "door"},
     {"type": "portal", "x": t(22, 12)[0] - 8, "y": t(22, 12)[1] - 8, "w": 16, "h": 16,
      "target": "bunker", "spawn": "from_courtyard", "sfx": "door"}],
    {"default": {"x": t(21, 4)[0], "y": t(21, 4)[1], "facing": "down"},
     "from_lab": {"x": t(21, 4)[0], "y": t(21, 4)[1], "facing": "down"},
     "from_bunker": {"x": t(22, 14)[0], "y": t(22, 14)[1], "facing": "up"}},
)

emit(
    # A small worked example that exercises every system built on top of the
    # foundation: a shop (trading), a guardian enemy (variety framework), an
    # alarm trap, a placeable trap item, a readable log, and a one-shot
    # reveal cutscene — see EXTENDING.md.
    "bunker", "SUBLEVEL 3 - SUPPLY SHELTER", BUNKER_W, BUNKER_H, BUNKER, ".",
    {"music": "ambient_lab", "darkness": 0.82, "tint": "#0a0f10", "vignette": 0.5},
    [
        {"x": 10 * 16, "y": 3 * 16, "radius": 50, "color": "#9fd8ff", "intensity": 0.6, "flicker": 0.2},
        {"x": 6 * 16, "y": 7 * 16, "radius": 46, "color": "#e0a458", "intensity": 0.7, "flicker": 0.3},
        {"x": 15 * 16, "y": 9 * 16, "radius": 40, "color": "#e0a458", "intensity": 0.4, "flicker": 0.1},
    ],
    [
        {"type": "npc", "id": "npc_quartermaster", "x": t(14, 8)[0], "y": t(14, 8)[1],
         "sprite": "npc_survivor", "facing": "down", "dialogue": "npc_trader", "shop": "bunker_quartermaster", "wander": False},
        {"type": "enemy", "id": "sentinel_bunker_1", "archetype": "sentinel", "x": t(15, 9)[0], "y": t(15, 9)[1]},
        {"type": "trap", "id": "trap_bunker_1", "trapType": "alarm", "faction": "enemy",
         "x": t(10, 4)[0], "y": t(10, 4)[1]},
        {"type": "item", "id": "pickup_bunker_1", "itemId": "bunker_log", "qty": 1, "x": t(9, 3)[0], "y": t(9, 3)[1]},
        {"type": "item", "id": "pickup_bunker_2", "itemId": "explosive_trap_kit", "qty": 2, "x": t(16, 10)[0], "y": t(16, 10)[1]},
        {"type": "item", "id": "pickup_bunker_3", "itemId": "rifle_ammo", "qty": 12, "x": t(7, 5)[0], "y": t(7, 5)[1]},
        {"type": "prop", "id": "bunker_terminal", "x": t(4, 3)[0], "y": t(4, 3)[1] + 8, "dialogue": "prop_terminal", "label": "TERMINAL"},
    ],
    [{"type": "portal", "x": t(10, 1)[0] - 8, "y": t(10, 1)[1] - 8, "w": 16, "h": 16,
      "target": "outside_courtyard", "spawn": "from_bunker", "sfx": "door"},
     {"type": "reveal", "x": t(10, 2)[0] - 8, "y": t(10, 2)[1] - 8, "w": 16, "h": 16,
      "flag": "bunker_reveal_seen", "revealX": t(15, 9)[0], "revealY": t(15, 9)[1], "dialogueId": "note_bunker_reveal"}],
    {"default": {"x": t(10, 3)[0], "y": t(10, 3)[1], "facing": "down"},
     "from_courtyard": {"x": t(10, 3)[0], "y": t(10, 3)[1], "facing": "down"}},
)
print("maps done")
