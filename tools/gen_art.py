"""Placeholder pixel-art generator for VESTIGE.

Everything produced here is a labelled PLACEHOLDER. Replace the PNGs in
/assets with real art at the same dimensions and the game keeps running.
"""
import os, random
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..", "assets")

P = {
    "void":      (7, 9, 11, 255),
    "ash":       (20, 24, 28, 255),
    "conc_d":    (35, 42, 46, 255),
    "conc":      (51, 60, 64, 255),
    "conc_l":    (74, 85, 89, 255),
    "rust_d":    (90, 47, 29, 255),
    "rust":      (138, 75, 42, 255),
    "moss_d":    (36, 64, 47, 255),
    "moss":      (61, 107, 74, 255),
    "moss_l":    (94, 148, 99, 255),
    "glow":      (127, 224, 168, 255),
    "amber":     (224, 164, 88, 255),
    "bone":      (221, 229, 226, 255),
    "coat":      (207, 216, 212, 255),
    "coat_sh":   (154, 166, 163, 255),
    "skin":      (200, 146, 107, 255),
    "skin_sh":   (160, 111, 79, 255),
    "hair":      (43, 35, 32, 255),
    "trouser":   (44, 52, 58, 255),
    "trouser_l": (60, 70, 78, 255),
    "shoe":      (24, 28, 32, 255),
    "sludge":    (40, 58, 48, 255),
    "sludge_l":  (58, 82, 66, 255),
    "glass":     (120, 150, 150, 255),
    "clear":     (0, 0, 0, 0),

    # -- player-specific accents --------------------------------------------
    "field_coat":    (52, 71, 68, 255),
    "field_coat_sh": (35, 50, 48, 255),
    "field_coat_hi": (76, 100, 92, 255),
    "copper_hair":   (150, 92, 58, 255),
    "stubble":       (58, 46, 42, 255),
    "lens":          (232, 186, 110, 255),
    "lens_dark":     (16, 14, 12, 255),
    "pack":          (110, 84, 62, 255),
    "pack_sh":       (80, 60, 44, 255),
    "pack_strap":    (58, 44, 34, 255),
    "patch":         (120, 66, 40, 255),

    # -- mutant / creature accents -------------------------------------------
    "flesh":     (146, 82, 74, 255),
    "flesh_sh":  (104, 54, 50, 255),
    "flesh_hi":  (176, 112, 100, 255),
    "sinew":     (168, 60, 52, 255),
    "boil":      (196, 140, 84, 255),
    "bone_c":    (214, 206, 182, 255),
    "bone_sh":   (168, 158, 134, 255),
    "carapace":  (70, 78, 58, 255),
    "carapace_sh": (46, 52, 38, 255),
    "eye_glow":  (127, 224, 168, 255),
    "eye_red":   (196, 85, 63, 255),
    "eye_violet": (178, 133, 224, 255),
    "maw":       (24, 16, 18, 255),
    "sac":       (108, 132, 88, 255),
    "sac_sh":    (74, 96, 60, 255),

    # -- HUD icons ------------------------------------------------------------
    "water":     (95, 168, 216, 255),
    "hud_dim":   (44, 51, 53, 255),
}

TS = 16          # tile size
COLS = 8         # tileset columns


def noise(d, x0, y0, w, h, base, spec, seed, density=0.18):
    rnd = random.Random(seed)
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            d.point((x, y), base if rnd.random() > density else spec)


# --------------------------------------------------------------------------
# TILESET
# --------------------------------------------------------------------------
def build_tileset():
    rows = 4
    img = Image.new("RGBA", (COLS * TS, rows * TS), P["clear"])
    d = ImageDraw.Draw(img)

    def cell(i):
        return (i % COLS) * TS, (i // COLS) * TS

    def fill(i, c):
        x, y = cell(i)
        d.rectangle([x, y, x + TS - 1, y + TS - 1], fill=c)

    def rect(i, x0, y0, x1, y1, c):
        x, y = cell(i)
        d.rectangle([x + x0, y + y0, x + x1, y + y1], fill=c)

    def speck(i, base, spec, seed, dens=0.14):
        x, y = cell(i)
        noise(d, x, y, TS, TS, base, spec, seed, dens)

    # 0 void
    fill(0, P["void"])
    # 1 concrete floor
    speck(1, P["conc_d"], P["conc"], 11, 0.16)
    x, y = cell(1)
    d.line([x, y, x + 15, y], fill=P["conc_l"])   # faint top-lit edge for depth
    # 2 cracked concrete
    speck(2, P["conc_d"], P["conc"], 12, 0.12)
    x, y = cell(2)
    for (a, b) in [(3, 2), (4, 3), (5, 4), (5, 5), (6, 6), (7, 7), (8, 8), (8, 9), (9, 10), (11, 11), (12, 12)]:
        d.point((x + a, y + b), P["ash"])
    for (a, b) in [(6, 5), (7, 4), (9, 9), (10, 8)]:
        d.point((x + a, y + b), P["ash"])
    # 3 lab checker floor
    fill(3, P["conc"])
    rect(3, 0, 0, 7, 7, P["conc_l"])
    rect(3, 8, 8, 15, 15, P["conc_l"])
    speck(3, None, None, 0, 0) if False else None
    x, y = cell(3)
    rnd = random.Random(30)
    for _ in range(24):
        d.point((x + rnd.randrange(16), y + rnd.randrange(16)), P["conc_d"])
    # 4 grass
    speck(4, P["moss_d"], P["moss"], 14, 0.35)
    x, y = cell(4)
    rnd = random.Random(41)
    for _ in range(10):
        gx, gy = x + rnd.randrange(16), y + rnd.randrange(15)
        d.point((gx, gy), P["moss_l"])
        d.point((gx, gy + 1), P["moss"])
    # 5 tall grass
    speck(5, P["moss_d"], P["moss"], 15, 0.3)
    x, y = cell(5)
    rnd = random.Random(51)
    for _ in range(9):
        gx = x + rnd.randrange(1, 15)
        gy = y + rnd.randrange(4, 14)
        d.line([gx, gy, gx, gy - 3], fill=P["moss_l"])
    # 6 dirt
    speck(6, (58, 46, 36, 255), (76, 60, 46, 255), 16, 0.3)
    # 7 mossy concrete
    speck(7, P["conc_d"], P["moss_d"], 17, 0.4)
    x, y = cell(7)
    rnd = random.Random(71)
    for _ in range(14):
        d.point((x + rnd.randrange(16), y + rnd.randrange(16)), P["moss"])
    # 8 sludge water
    speck(8, P["sludge"], P["sludge_l"], 18, 0.25)
    x, y = cell(8)
    d.line([x + 2, y + 5, x + 7, y + 5], fill=P["moss_l"])
    d.line([x + 9, y + 11, x + 13, y + 11], fill=P["moss_l"])
    # 9 wall face
    fill(9, P["conc"])
    for by in range(0, TS, 8):
        off = 0 if (by // 8) % 2 == 0 else 8
        d.line([cell(9)[0], cell(9)[1] + by, cell(9)[0] + 15, cell(9)[1] + by], fill=P["conc_d"])
        d.line([cell(9)[0] + off, cell(9)[1] + by, cell(9)[0] + off, cell(9)[1] + by + 7], fill=P["conc_d"])
    speck_over = random.Random(91)
    x, y = cell(9)
    for _ in range(20):
        d.point((x + speck_over.randrange(16), y + speck_over.randrange(16)), P["conc_l"])
    d.line([x, y, x + 15, y], fill=(96, 108, 112, 255))   # rim-lit top edge
    # 10 wall top
    speck(10, P["conc_l"], P["conc"], 19, 0.2)
    rect(10, 0, 13, 15, 15, P["conc_d"])
    # 11 rubble
    speck(11, P["conc_d"], P["ash"], 20, 0.3)
    x, y = cell(11)
    rnd = random.Random(111)
    for _ in range(7):
        rx, ry = x + rnd.randrange(1, 13), y + rnd.randrange(1, 13)
        d.rectangle([rx, ry, rx + 2, ry + 1], fill=P["conc_l"])
    # 12 pipe (horizontal)
    speck(12, P["conc_d"], P["conc"], 21, 0.1)
    rect(12, 0, 5, 15, 10, P["rust_d"])
    rect(12, 0, 6, 15, 7, P["rust"])
    rect(12, 6, 4, 9, 11, P["conc_l"])
    # 13 crate
    speck(13, P["conc_d"], P["conc"], 22, 0.1)
    rect(13, 1, 2, 14, 15, (78, 58, 38, 255))
    rect(13, 2, 3, 13, 14, (98, 74, 48, 255))
    d.line([cell(13)[0] + 2, cell(13)[1] + 3, cell(13)[0] + 13, cell(13)[1] + 14], fill=(78, 58, 38, 255))
    d.line([cell(13)[0] + 13, cell(13)[1] + 3, cell(13)[0] + 2, cell(13)[1] + 14], fill=(78, 58, 38, 255))
    d.line([cell(13)[0] + 2, cell(13)[1] + 3, cell(13)[0] + 13, cell(13)[1] + 3], fill=(118, 92, 60, 255))   # top-lit plank edge
    # 14 terminal / desk
    speck(14, P["conc_d"], P["conc"], 23, 0.1)
    rect(14, 1, 3, 14, 15, P["conc_l"])
    rect(14, 3, 5, 12, 11, P["ash"])
    rect(14, 4, 6, 11, 10, P["glow"])
    rect(14, 4, 8, 11, 9, (60, 120, 92, 255))
    # 15 door
    fill(15, P["conc_d"])
    rect(15, 1, 1, 14, 15, P["conc_l"])
    rect(15, 2, 2, 13, 14, P["rust_d"])
    rect(15, 7, 2, 8, 14, P["conc_d"])
    rect(15, 3, 4, 6, 8, P["ash"])
    rect(15, 9, 4, 12, 8, P["ash"])
    # 16 vines (over wall)
    fill(16, P["clear"])
    x, y = cell(16)
    rnd = random.Random(161)
    for sx in (2, 6, 11, 14):
        ln = rnd.randrange(6, 15)
        for i in range(ln):
            d.point((x + sx + (1 if i % 4 == 2 else 0), y + i), P["moss"])
            if i % 3 == 0:
                d.point((x + sx - 1, y + i), P["moss_d"])
                d.point((x + sx + 2, y + i), P["moss_l"])
    # 17 broken glass floor
    speck(17, P["conc_d"], P["conc"], 24, 0.12)
    x, y = cell(17)
    rnd = random.Random(171)
    for _ in range(9):
        gx, gy = x + rnd.randrange(15), y + rnd.randrange(15)
        d.point((gx, gy), P["glass"])
        d.point((gx + 1, gy), P["bone"])
    # 18 metal grate
    fill(18, P["ash"])
    for gy in range(0, TS, 3):
        d.line([cell(18)[0], cell(18)[1] + gy, cell(18)[0] + 15, cell(18)[1] + gy], fill=P["conc_l"])
    for gx in range(0, TS, 5):
        d.line([cell(18)[0] + gx, cell(18)[1], cell(18)[0] + gx, cell(18)[1] + 15], fill=P["conc"])
    # 19 asphalt
    speck(19, (28, 30, 34, 255), (44, 47, 52, 255), 25, 0.22)
    # 20 asphalt cracked + weeds
    speck(20, (28, 30, 34, 255), (44, 47, 52, 255), 26, 0.2)
    x, y = cell(20)
    for i in range(16):
        d.point((x + i, y + 6 + (i % 3)), P["moss_d"])
        if i % 4 == 0:
            d.point((x + i, y + 5 + (i % 3)), P["moss"])
    # 21 bush
    speck(21, P["moss_d"], P["moss"], 27, 0.3)
    x, y = cell(21)
    d.ellipse([x + 2, y + 3, x + 13, y + 14], fill=P["moss_d"])
    d.ellipse([x + 3, y + 4, x + 11, y + 12], fill=P["moss"])
    rnd = random.Random(211)
    for _ in range(10):
        d.point((x + rnd.randrange(3, 13), y + rnd.randrange(4, 14)), P["moss_l"])
    # 22 dead tree
    fill(22, P["clear"])
    x, y = cell(22)
    d.rectangle([x + 6, y + 6, x + 9, y + 15], fill=(58, 46, 36, 255))
    d.rectangle([x + 7, y + 6, x + 8, y + 15], fill=(76, 60, 46, 255))
    for pts in [((6, 6), (2, 2)), ((9, 6), (13, 1)), ((7, 8), (3, 6)), ((8, 7), (12, 5))]:
        d.line([x + pts[0][0], y + pts[0][1], x + pts[1][0], y + pts[1][1]], fill=(58, 46, 36, 255))
    # 23 fence
    fill(23, P["clear"])
    x, y = cell(23)
    for fx in (2, 13):
        d.rectangle([x + fx, y + 3, x + fx + 1, y + 15], fill=P["conc_l"])
    for fy in (5, 11):
        d.rectangle([x, y + fy, x + 15, y + fy + 1], fill=P["conc"])
    # 24 lab bench
    speck(24, P["conc_d"], P["conc"], 28, 0.1)
    rect(24, 0, 4, 15, 14, P["conc_l"])
    rect(24, 0, 4, 15, 5, P["bone"])
    rect(24, 2, 7, 5, 10, P["conc_d"])
    rect(24, 9, 7, 13, 10, P["conc_d"])
    # 25 barrel
    speck(25, P["conc_d"], P["conc"], 29, 0.1)
    rect(25, 3, 2, 12, 15, P["rust_d"])
    rect(25, 4, 3, 11, 14, P["rust"])
    rect(25, 4, 6, 11, 7, P["amber"])
    rect(25, 4, 11, 11, 12, P["rust_d"])
    # 26 puddle on concrete
    speck(26, P["conc_d"], P["conc"], 30, 0.12)
    x, y = cell(26)
    d.ellipse([x + 2, y + 5, x + 13, y + 12], fill=P["sludge"])
    d.ellipse([x + 4, y + 6, x + 9, y + 9], fill=P["sludge_l"])
    # 27 sign / marker
    fill(27, P["clear"])
    x, y = cell(27)
    d.rectangle([x + 7, y + 8, x + 8, y + 15], fill=P["conc_l"])
    d.rectangle([x + 2, y + 2, x + 13, y + 9], fill=P["amber"])
    d.rectangle([x + 3, y + 3, x + 12, y + 8], fill=P["ash"])
    d.rectangle([x + 7, y + 4, x + 8, y + 6], fill=P["amber"])
    d.point((x + 7, y + 7), P["amber"])
    # 28-31 spare
    for i in range(28, 32):
        fill(i, P["clear"])

    img.save(os.path.join(ROOT, "tiles", "tileset_placeholder.png"))
    return img


# --------------------------------------------------------------------------
# CHARACTERS
# --------------------------------------------------------------------------
CW, CH = 16, 24


def draw_char(d, ox, oy, direction, frame, pal):
    """direction: 0 down 1 left 2 right 3 up. frame 0..3 (0/2 idle, 1/3 step).

    Base humanoid renderer shared by the player and every NPC/enemy sheet.
    Accessories (glasses/beard/backpack/patches) are opt-in via boolean keys
    on `pal` so this stays the one place a walk-cycle silhouette is drawn —
    see build_characters(): only the player's palette sets them.
    """
    mirror = direction == 2
    dr = 1 if mirror else direction

    def px(x, y, c):
        if c is None:
            return
        if mirror:
            x = CW - 1 - x
        d.point((ox + x, oy + y), c)

    def rc(x0, y0, x1, y1, c):
        for yy in range(y0, y1 + 1):
            for xx in range(x0, x1 + 1):
                px(xx, yy, c)

    bob = 1 if frame in (1, 3) else 0
    hair, skin, skin_sh = pal["hair"], pal["skin"], pal["skin_sh"]
    coat, coat_sh, tr, tr_l, shoe = pal["coat"], pal["coat_sh"], pal["trouser"], pal["trouser_l"], pal["shoe"]
    top = 2 + bob

    # head
    rc(4, top, 11, top + 8, skin)
    rc(4, top, 11, top + 2, hair)
    px(4, top + 3, hair); px(11, top + 3, hair)
    px(3, top + 1, hair); px(12, top + 1, hair)
    if pal.get("tuft"):
        px(6, top - 1, hair); px(8, top - 1, hair)
    rc(4, top + 8, 11, top + 8, skin_sh)
    if dr == 0:      # facing camera
        px(6, top + 5, pal["eye"]); px(9, top + 5, pal["eye"])
        px(6, top + 6, skin_sh); px(9, top + 6, skin_sh)
        if pal.get("beard"):
            rc(4, top + 7, 11, top + 8, pal.get("beard_color", hair))
            px(5, top + 6, pal.get("beard_color", hair)); px(10, top + 6, pal.get("beard_color", hair))
        if pal.get("glasses"):
            frame_c = pal.get("lens_frame", P["ash"])
            lens_c = pal.get("lens", P["bone"])
            rc(4, top + 4, 11, top + 4, frame_c)
            px(4, top + 5, frame_c); px(11, top + 5, frame_c)
            px(7, top + 4, frame_c)   # bridge
            rc(5, top + 5, 6, top + 5, lens_c)
            rc(9, top + 5, 10, top + 5, lens_c)
    elif dr == 3:    # away
        rc(4, top, 11, top + 6, hair)
        px(5, top + 7, hair); px(10, top + 7, hair)
    else:            # profile (left)
        rc(4, top, 11, top + 3, hair)
        px(11, top + 4, hair); px(11, top + 5, hair)
        if pal.get("beard"):
            rc(4, top + 6, 6, top + 8, pal.get("beard_color", hair))
        if pal.get("glasses"):
            frame_c = pal.get("lens_frame", P["ash"])
            px(4, top + 4, frame_c); px(4, top + 6, frame_c)
            px(5, top + 5, pal.get("lens", P["bone"]))
        else:
            px(5, top + 5, pal["eye"])
        px(4, top + 6, skin_sh)

    # body / coat
    by = top + 9
    rc(3, by, 12, by + 8, coat)
    rc(3, by + 8, 12, by + 8, coat_sh)
    if dr == 0:
        px(7, by, coat_sh); px(8, by, coat_sh)
        rc(7, by + 1, 8, by + 6, coat_sh)      # coat opening
        px(6, by, skin_sh); px(9, by, skin_sh)
        if pal.get("trim"):
            px(7, by + 1, pal["trim"]); px(8, by + 1, pal["trim"])
    elif dr == 3:
        rc(6, by, 9, by + 1, hair)
        rc(7, by + 2, 8, by + 7, coat_sh)
    else:
        rc(9, by + 1, 10, by + 6, coat_sh)
    if pal.get("patch") and dr != 3:
        px(4, by + 4, pal["patch"]); px(4, by + 5, pal["patch"])
    # waist belt reads as "worn gear" from any angle
    if pal.get("belt"):
        rc(3, by + 7, 12, by + 7, pal["belt"])
    # arms
    swing = {0: 0, 1: -1, 2: 0, 3: 1}[frame]
    rc(3, by + 1, 3, by + 6, coat_sh)
    rc(12, by + 1, 12, by + 6, coat_sh)
    px(3, by + 7 + max(swing, 0), skin)
    px(12, by + 7 - min(swing, 0), skin)

    # backpack: mainly visible walking away from camera, plus a shoulder-strap
    # hint from the side, so turning around always reads as "still there".
    if pal.get("backpack"):
        pack, pack_sh, strap = pal["backpack"], pal.get("backpack_sh", coat_sh), pal.get("backpack_strap", coat_sh)
        if dr == 3:
            rc(5, by, 10, by + 7, pack)
            rc(5, by + 6, 10, by + 7, pack_sh)
            rc(7, by, 8, by + 7, strap)
            px(5, by - 1, pack); px(10, by - 1, pack)
        else:
            edge = 11 if dr == 0 else 11
            px(edge, by + 1, pack_sh); px(edge, by + 2, pack)

    # legs
    ly = by + 9
    if frame in (1,):
        rc(4, ly, 6, ly + 3, tr_l); rc(8, ly, 10, ly + 2, tr)
        rc(4, ly + 4, 6, ly + 4, shoe); rc(8, ly + 3, 11, ly + 3, shoe)
    elif frame in (3,):
        rc(5, ly, 7, ly + 2, tr); rc(9, ly, 11, ly + 3, tr_l)
        rc(4, ly + 3, 7, ly + 3, shoe); rc(9, ly + 4, 11, ly + 4, shoe)
    else:
        rc(5, ly, 7, ly + 3, tr); rc(8, ly, 10, ly + 3, tr_l)
        rc(5, ly + 4, 7, ly + 4, shoe); rc(8, ly + 4, 10, ly + 4, shoe)


def sheet(name, pal):
    img = Image.new("RGBA", (CW * 4, CH * 4), P["clear"])
    d = ImageDraw.Draw(img)
    for row in range(4):
        for col in range(4):
            draw_char(d, col * CW, row * CH, row, col, pal)
    img.save(os.path.join(ROOT, "sprites", name))


def build_characters():
    """NPC walk sheets. The player has their own palette below (build_player) and
    every enemy archetype gets a genuinely different silhouette (build_enemies) —
    only the two ordinary NPCs still share this plain base look."""
    base = dict(hair=P["hair"], skin=P["skin"], skin_sh=P["skin_sh"], coat=P["coat"],
                coat_sh=P["coat_sh"], trouser=P["trouser"], trouser_l=P["trouser_l"],
                shoe=P["shoe"], eye=(30, 34, 38, 255))
    npc = dict(base, coat=(96, 108, 116, 255), coat_sh=(70, 80, 88, 255),
               hair=(70, 48, 34, 255), trouser=(48, 40, 34, 255), trouser_l=(62, 52, 44, 255))
    npc2 = dict(base, coat=(120, 92, 70, 255), coat_sh=(88, 66, 50, 255),
                hair=(28, 26, 30, 255), skin=(168, 122, 92, 255), skin_sh=(132, 94, 68, 255))
    sheet("npc_survivor_placeholder.png", npc)
    sheet("npc_wanderer_placeholder.png", npc2)


def build_player():
    """The player reads instantly against both NPCs (grey/tan coats) and the
    mutated enemies (sickly green/red flesh tones): a weathered teal field
    jacket with amber trim, copper hair, stubble, cracked glasses and a
    patched-up backpack. Every accessory is a flag on this one palette dict —
    see draw_char() — nothing about the shared renderer changed for NPCs."""
    player = dict(
        hair=P["copper_hair"], skin=P["skin"], skin_sh=P["skin_sh"],
        coat=P["field_coat"], coat_sh=P["field_coat_sh"],
        trouser=(38, 42, 33, 255), trouser_l=(52, 57, 44, 255),
        shoe=(24, 22, 20, 255), eye=(30, 34, 38, 255),
        glasses=True, lens=P["lens"], lens_frame=P["ash"],
        beard=True, beard_color=P["stubble"],
        backpack=P["pack"], backpack_sh=P["pack_sh"], backpack_strap=P["pack_strap"],
        patch=P["patch"], belt=P["shoe"], trim=P["field_coat_hi"], tuft=True,
    )
    sheet("player_doctor_placeholder.png", player)


# --------------------------------------------------------------------------
# ENEMIES — one distinct silhouette per archetype instead of a recolored
# zombie. Sheets stay 16x24, 4 cols x 4 rows (down/left/right/up, idle-step-
# idle-step) so core/Animation.js needs no changes; data/enemies.js just
# points each archetype's `sprite` key at one of these files.
# --------------------------------------------------------------------------
def _frame_helpers(d, ox, oy, direction):
    mirror = direction == 2
    dr = 1 if mirror else direction

    def px(x, y, c):
        if c is None:
            return
        xx = CW - 1 - x if mirror else x
        d.point((ox + xx, oy + y), c)

    def rc(x0, y0, x1, y1, c):
        for yy in range(y0, y1 + 1):
            for xx in range(x0, x1 + 1):
                px(xx, yy, c)

    return px, rc, mirror, dr


def _walk_legs(rc, px, ly, frame, tr, tr_l, shoe, x0=4, x1=11):
    """Shared biped stride math — every upright creature below reuses this
    instead of re-deriving the walk cycle."""
    mid = (x0 + x1) // 2
    if frame == 1:
        rc(x0, ly, mid - 1, ly + 3, tr_l); rc(mid, ly, x1, ly + 2, tr)
        rc(x0, ly + 4, mid - 1, ly + 4, shoe); rc(mid, ly + 3, x1, ly + 3, shoe)
    elif frame == 3:
        rc(x0 + 1, ly, mid, ly + 2, tr); rc(mid + 1, ly, x1, ly + 3, tr_l)
        rc(x0, ly + 3, mid, ly + 3, shoe); rc(mid + 1, ly + 4, x1, ly + 4, shoe)
    else:
        rc(x0 + 1, ly, mid, ly + 3, tr); rc(mid + 1, ly, x1, ly + 3, tr_l)
        rc(x0 + 1, ly + 4, mid, ly + 4, shoe); rc(mid + 1, ly + 4, x1, ly + 4, shoe)


def _arms(rc, px, by, frame, sh, hand, x0=3, x1=12, droop=0):
    swing = {0: 0, 1: -1, 2: 0, 3: 1}[frame]
    rc(x0, by + 1, x0, by + 6 + droop, sh)
    rc(x1, by + 1, x1, by + 6 + droop, sh)
    px(x0, by + 7 + droop + max(swing, 0), hand)
    px(x1, by + 7 + droop - min(swing, 0), hand)


def draw_husk(d, ox, oy, direction, frame):
    """Gaunt scavenger, patchy scalp, torn shirt, sunken glowing eye sockets
    instead of a face. The baseline threat — unremarkable size and speed."""
    px, rc, mirror, dr = _frame_helpers(d, ox, oy, direction)
    bob = 1 if frame in (1, 3) else 0
    top = 2 + bob
    skin, skin_sh = P["flesh"], P["flesh_sh"]
    cloth, cloth_sh = (50, 54, 45, 255), (34, 38, 32, 255)

    rc(5, top, 10, top + 8, skin)
    rc(5, top + 7, 10, top + 8, skin_sh)
    px(5, top, P["ash"]); px(7, top, P["ash"]); px(9, top, P["ash"])   # scalp gone in patches
    if dr == 0:
        px(6, top + 4, P["eye_glow"]); px(9, top + 4, P["eye_glow"])
        rc(7, top + 6, 8, top + 6, P["maw"])
    elif dr == 3:
        rc(5, top + 1, 10, top + 6, (38, 40, 34, 255))
    else:
        px(5, top + 4, P["eye_glow"])
        rc(4, top + 6, 6, top + 6, P["maw"])

    by = top + 9
    rc(4, by, 11, by + 8, cloth)
    rc(4, by + 7, 11, by + 8, cloth_sh)
    if dr != 3:
        rc(6, by + 1, 9, by + 5, skin_sh)   # torn shirt, ribs showing through
    _arms(rc, px, by, frame, skin_sh, skin, x0=3, x1=12, droop=1)

    _walk_legs(rc, px, by + 9, frame, cloth, cloth_sh, P["ash"])


def draw_mutant(d, ox, oy, direction, frame):
    """Bulkier — one grossly overgrown arm, boil-studded flesh, red eyeshine."""
    px, rc, mirror, dr = _frame_helpers(d, ox, oy, direction)
    bob = 1 if frame in (1, 3) else 0
    top = 2 + bob
    skin, skin_sh = P["flesh"], P["sinew"]

    rc(4, top, 11, top + 8, skin)
    rc(4, top + 7, 11, top + 8, skin_sh)
    if dr == 0:
        px(6, top + 5, P["eye_red"]); px(9, top + 5, P["eye_red"])
        px(7, top + 2, P["boil"])
    elif dr == 3:
        rc(4, top, 11, top + 6, skin_sh)
        px(6, top + 2, P["boil"])
    else:
        px(5, top + 5, P["eye_red"])
        px(9, top + 2, P["boil"])

    by = top + 9
    rc(3, by, 12, by + 8, skin)
    rc(3, by + 7, 12, by + 8, skin_sh)
    rc(11, by, 13, by + 8, skin_sh)      # oversized right arm/shoulder mass
    px(8, by + 2, P["boil"]); px(6, by + 4, P["boil"]); px(4, by + 6, P["boil"])
    _arms(rc, px, by, frame, skin_sh, skin, x0=2, x1=13, droop=1)

    _walk_legs(rc, px, by + 9, frame, (46, 34, 28, 255), (60, 44, 36, 255), P["ash"])


def draw_brute(d, ox, oy, direction, frame):
    """Hunched tank — small head sunk between huge shoulders, bone spikes
    down the back. Reads as dangerous mass before the runtime `scale` even
    enlarges it further (data/enemies.js)."""
    px, rc, mirror, dr = _frame_helpers(d, ox, oy, direction)
    bob = 1 if frame in (1, 3) else 0
    top = 3 + bob
    skin, skin_sh = (108, 118, 96, 255), (76, 86, 66, 255)

    rc(5, top, 10, top + 6, skin)
    rc(5, top + 5, 10, top + 6, skin_sh)
    if dr == 0:
        px(6, top + 3, P["eye_red"]); px(9, top + 3, P["eye_red"])
    elif dr == 3:
        rc(5, top, 10, top + 5, skin_sh)
    else:
        px(5, top + 3, P["eye_red"])

    by = top + 7
    rc(2, by, 13, by + 9, skin)
    rc(2, by + 8, 13, by + 9, skin_sh)
    for bx, byy in [(2, by), (13, by), (5, by - 1), (9, by - 1)]:
        px(bx, byy, P["bone_c"]); px(bx, byy - 1, P["bone_sh"])
    _arms(rc, px, by, frame, skin_sh, skin, x0=1, x1=14, droop=2)

    _walk_legs(rc, px, by + 10, frame, (40, 44, 36, 255), (52, 58, 46, 255), P["ash"], x0=3, x1=12)


def draw_stalker(d, ox, oy, direction, frame):
    """Thin, crouched sprinter — small head, spindly overlong arms, violet
    eyeshine. Short detect radius, long reach once it notices you."""
    px, rc, mirror, dr = _frame_helpers(d, ox, oy, direction)
    bob = 1 if frame in (1, 3) else 0
    top = 3 + bob
    skin, skin_sh = (70, 58, 82, 255), (48, 40, 58, 255)

    rc(6, top, 9, top + 6, skin)
    rc(6, top + 5, 9, top + 6, skin_sh)
    if dr == 0:
        px(7, top + 3, P["eye_violet"]); px(8, top + 3, P["eye_violet"])
    elif dr == 3:
        rc(6, top, 9, top + 5, skin_sh)
    else:
        px(6, top + 3, P["eye_violet"])

    by = top + 7
    rc(6, by, 9, by + 8, skin)
    rc(6, by + 7, 9, by + 8, skin_sh)
    rc(2, by + 1, 2, by + 9, skin_sh); rc(13, by + 1, 13, by + 9, skin_sh)   # unnaturally long arms
    px(2, by + 10, skin); px(13, by + 10, skin)

    _walk_legs(rc, px, by + 9, frame, skin, skin_sh, (20, 16, 24, 255), x0=5, x1=10)


def draw_spitter(d, ox, oy, direction, frame):
    """Bloated acid sac where a torso should be. Holds range and lobs
    Projectiles (behavior: 'ranged' in data/enemies.js) instead of closing in."""
    px, rc, mirror, dr = _frame_helpers(d, ox, oy, direction)
    bob = 1 if frame in (1, 3) else 0
    top = 3 + bob
    skin, skin_sh = (72, 96, 74, 255), (48, 68, 52, 255)

    rc(5, top, 10, top + 6, skin)
    rc(5, top + 5, 10, top + 6, skin_sh)
    if dr == 0:
        px(6, top + 3, P["eye_glow"]); px(9, top + 3, P["eye_glow"])
        rc(7, top + 5, 8, top + 5, P["maw"])
    elif dr == 3:
        rc(5, top, 10, top + 5, skin_sh)
    else:
        px(5, top + 3, P["eye_glow"])

    by = top + 7
    rc(3, by, 12, by + 9, P["sac"])
    rc(3, by + 8, 12, by + 9, P["sac_sh"])
    px(5, by + 3, P["sac_sh"]); px(10, by + 4, P["sac_sh"]); px(7, by + 6, P["boil"])
    _arms(rc, px, by, frame, skin_sh, skin, x0=2, x1=13, droop=0)

    _walk_legs(rc, px, by + 10, frame, skin, skin_sh, (24, 30, 22, 255), x0=5, x1=10)


def draw_swarmling(d, ox, oy, direction, frame):
    """Small and low — pushed down in the frame with extra limb stubs so it
    reads as a many-legged crawler even before the 0.7x runtime scale."""
    px, rc, mirror, dr = _frame_helpers(d, ox, oy, direction)
    bob = 1 if frame in (1, 3) else 0
    top = 7 + bob
    skin, skin_sh = (128, 96, 60, 255), (92, 66, 40, 255)

    rc(6, top, 9, top + 5, skin)
    rc(6, top + 4, 9, top + 5, skin_sh)
    if dr == 0:
        px(6, top + 2, P["eye_glow"]); px(9, top + 2, P["eye_glow"])
    elif dr == 3:
        rc(6, top, 9, top + 4, skin_sh)
    else:
        px(6, top + 2, P["eye_glow"])

    by = top + 6
    rc(5, by, 10, by + 6, skin)
    rc(5, by + 5, 10, by + 6, skin_sh)
    for lx in (3, 4, 11, 12):
        px(lx, by + 3, skin_sh)   # extra limb stubs either side
    _arms(rc, px, by, frame, skin_sh, skin, x0=4, x1=11, droop=-2)

    _walk_legs(rc, px, by + 7, frame, skin, skin_sh, (40, 30, 20, 255), x0=6, x1=9)


def draw_sentinel(d, ox, oy, direction, frame):
    """Unique boss — a bone crown, three amber eyes, the widest frame here.
    `unique: true` in data/enemies.js, biggest scale of the set."""
    px, rc, mirror, dr = _frame_helpers(d, ox, oy, direction)
    bob = 1 if frame in (1, 3) else 0
    top = 1 + bob
    skin, skin_sh = (86, 62, 96, 255), (56, 40, 64, 255)

    rc(4, top, 11, top + 8, skin)
    rc(4, top + 7, 11, top + 8, skin_sh)
    for cx in (4, 6, 9, 11):
        px(cx, top - 1, P["bone_c"])
    if dr == 0:
        px(5, top + 4, P["amber"]); px(8, top + 4, P["amber"]); px(6, top + 6, P["amber"])
    elif dr == 3:
        rc(4, top, 11, top + 6, skin_sh)
        px(5, top - 1, P["bone_c"]); px(8, top - 1, P["bone_c"])
    else:
        px(5, top + 4, P["amber"]); px(5, top + 6, P["amber"])

    by = top + 9
    rc(2, by, 13, by + 9, skin)
    rc(2, by + 8, 13, by + 9, skin_sh)
    px(2, by - 1, P["bone_c"]); px(13, by - 1, P["bone_c"])
    _arms(rc, px, by, frame, skin_sh, skin, x0=1, x1=14, droop=1)

    _walk_legs(rc, px, by + 10, frame, (44, 32, 52, 255), (58, 44, 68, 255), P["ash"], x0=4, x1=11)


def build_enemies():
    def sheet_fn(name, drawer):
        img = Image.new("RGBA", (CW * 4, CH * 4), P["clear"])
        d = ImageDraw.Draw(img)
        for row in range(4):
            for col in range(4):
                drawer(d, col * CW, row * CH, row, col)
        img.save(os.path.join(ROOT, "sprites", name))

    sheet_fn("enemy_husk_placeholder.png", draw_husk)
    sheet_fn("enemy_mutant_placeholder.png", draw_mutant)
    sheet_fn("enemy_brute_placeholder.png", draw_brute)
    sheet_fn("enemy_stalker_placeholder.png", draw_stalker)
    sheet_fn("enemy_spitter_placeholder.png", draw_spitter)
    sheet_fn("enemy_swarmling_placeholder.png", draw_swarmling)
    sheet_fn("enemy_sentinel_placeholder.png", draw_sentinel)


# --------------------------------------------------------------------------
# UI
# --------------------------------------------------------------------------
def build_ui():
    # 9-slice panel, 24x24, corner 8
    img = Image.new("RGBA", (24, 24), P["clear"])
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 23, 23], fill=(14, 18, 21, 240))
    d.rectangle([1, 1, 22, 22], outline=(74, 85, 89, 255))
    d.rectangle([2, 2, 21, 21], outline=(20, 26, 30, 255))
    d.rectangle([3, 3, 20, 20], outline=(120, 134, 132, 255))
    for (x, y) in [(3, 3), (20, 3), (3, 20), (20, 20)]:
        d.point((x, y), P["glow"])
    img.save(os.path.join(ROOT, "ui", "panel9_placeholder.png"))

    # selector caret 6x8
    car = Image.new("RGBA", (6, 8), P["clear"])
    dc = ImageDraw.Draw(car)
    dc.polygon([(0, 0), (5, 4), (0, 8)], fill=P["glow"])
    dc.polygon([(0, 1), (3, 4), (0, 7)], fill=P["bone"])
    car.save(os.path.join(ROOT, "ui", "caret_placeholder.png"))

    # item icons, 16x16 grid of 8
    ic = Image.new("RGBA", (16 * 8, 16), P["clear"])
    di = ImageDraw.Draw(ic)

    def at(i, x0, y0, x1, y1, c):
        di.rectangle([i * 16 + x0, y0, i * 16 + x1, y1], fill=c)
    # 0 syringe
    at(0, 4, 3, 11, 5, P["bone"]); at(0, 5, 5, 10, 11, P["glow"]); at(0, 7, 11, 8, 14, P["conc_l"])
    # 1 pill bottle
    at(1, 4, 4, 11, 14, (180, 190, 188, 255)); at(1, 5, 2, 10, 4, P["rust"]); at(1, 6, 7, 9, 11, P["amber"])
    # 2 keycard
    at(2, 3, 5, 12, 12, P["conc_l"]); at(2, 4, 6, 11, 8, P["glow"]); at(2, 4, 9, 8, 11, P["ash"])
    # 3 notebook
    at(3, 4, 3, 12, 13, (150, 140, 118, 255)); at(3, 3, 3, 4, 13, P["rust_d"]); at(3, 6, 6, 11, 6, P["ash"]); at(3, 6, 9, 10, 9, P["ash"])
    # 4 battery
    at(4, 5, 4, 10, 13, P["conc"]); at(4, 6, 3, 9, 4, P["conc_l"]); at(4, 6, 8, 9, 12, P["amber"])
    # 5 canteen
    at(5, 4, 5, 11, 14, (86, 96, 92, 255)); at(5, 6, 2, 9, 5, P["conc_l"]); at(5, 5, 8, 10, 11, P["sludge_l"])
    # 6 scrap
    at(6, 3, 6, 12, 10, P["conc_l"]); at(6, 5, 4, 9, 6, P["rust"]); at(6, 6, 10, 11, 12, P["rust_d"])
    # 7 unknown / fallback
    at(7, 3, 3, 12, 12, P["conc_d"]); at(7, 4, 4, 11, 11, P["ash"]); at(7, 7, 5, 8, 8, P["glow"]); at(7, 7, 9, 8, 10, P["glow"])
    ic.save(os.path.join(ROOT, "ui", "items_placeholder.png"))


def build_hud_icons():
    """Segmented HUD icons — heart / ration / water-droplet, each with
    empty/half/full states, for HUD.js's Minecraft-style meters (segments,
    not continuous bars). 3 rows (type) x 3 cols (state) of 8x8 cells."""
    cw = ch = 8
    img = Image.new("RGBA", (cw * 3, ch * 3), P["clear"])
    d = ImageDraw.Draw(img)

    def stamp(row, col, shape, main, dim, halfable):
        ox, oy = col * cw, row * ch
        for (x, y) in shape:
            if col == 2:
                color = main                                  # full
            elif col == 1 and halfable and x <= 3:
                color = main                                   # half: left side lit
            else:
                color = dim                                    # empty (or right half of "half")
            d.point((ox + x, oy + y), color)

    heart = [(1, 0), (2, 0), (5, 0), (6, 0),
             (0, 1), (1, 1), (2, 1), (3, 1), (4, 1), (5, 1), (6, 1), (7, 1),
             (0, 2), (1, 2), (2, 2), (3, 2), (4, 2), (5, 2), (6, 2), (7, 2),
             (1, 3), (2, 3), (3, 3), (4, 3), (5, 3), (6, 3),
             (2, 4), (3, 4), (4, 4), (5, 4),
             (3, 5), (4, 5)]
    ration = [(3, 0), (4, 0)] + [(x, y) for y in range(1, 6) for x in range(1, 7)]
    drop = [(3, 0), (4, 0), (2, 1), (3, 1), (4, 1), (5, 1),
            (1, 2), (2, 2), (3, 2), (4, 2), (5, 2), (6, 2),
            (1, 3), (2, 3), (3, 3), (4, 3), (5, 3), (6, 3),
            (1, 4), (2, 4), (3, 4), (4, 4), (5, 4), (6, 4),
            (2, 5), (3, 5), (4, 5), (5, 5)]

    rows = [(heart, P["eye_red"]), (ration, P["amber"]), (drop, P["water"])]
    for row, (shape, main) in enumerate(rows):
        for col in range(3):
            stamp(row, col, shape, main, P["hud_dim"], halfable=True)

    img.save(os.path.join(ROOT, "ui", "hud_icons_placeholder.png"))


# --------------------------------------------------------------------------
# BITMAP FONT ATLAS  (ASCII 32..126, thresholded -> crisp pixel glyphs)
# --------------------------------------------------------------------------
def build_font():
    font_path = next(
        (p for p in (
            "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
            "C:/Windows/Fonts/consola.ttf",
            "C:/Windows/Fonts/cour.ttf",
        ) if os.path.exists(p)),
        None,
    )
    fnt = ImageFont.truetype(font_path, 11) if font_path else ImageFont.load_default()
    cw, ch = 7, 12
    cols = 16
    rows = 6
    atlas = Image.new("RGBA", (cols * cw, rows * ch), P["clear"])
    for i in range(95):
        ch_ = chr(32 + i)
        g = Image.new("L", (cw, ch), 0)
        gd = ImageDraw.Draw(g)
        gd.text((0, -1), ch_, font=fnt, fill=255)
        g = g.point(lambda v: 255 if v > 110 else 0)
        rgba = Image.new("RGBA", (cw, ch), (255, 255, 255, 0))
        rgba.putalpha(g)
        px = rgba.load()
        for y in range(ch):
            for x in range(cw):
                if px[x, y][3] > 0:
                    px[x, y] = (255, 255, 255, 255)
        atlas.paste(rgba, ((i % cols) * cw, (i // cols) * ch))
    atlas.save(os.path.join(ROOT, "fonts", "font_7x12_placeholder.png"))
    print("font cell", cw, ch)




def build_portraits():
    """32x32 bust portraits, one per speaker, derived from the walk sheets."""
    names = [
        ("player_doctor_placeholder.png", 0),
        ("npc_survivor_placeholder.png", 1),
        ("npc_wanderer_placeholder.png", 2),
        ("enemy_husk_placeholder.png", 3),
    ]
    out = Image.new("RGBA", (32 * len(names), 32), P["clear"])
    for fname, i in names:
        src = Image.open(os.path.join(ROOT, "sprites", fname))
        bust = src.crop((0, 1, 16, 17)).resize((32, 32), Image.NEAREST)
        bg = Image.new("RGBA", (32, 32), (16, 20, 24, 255))
        d = ImageDraw.Draw(bg)
        for y in range(32):
            d.line([0, y, 31, y], fill=(16 + y // 4, 20 + y // 5, 24 + y // 6, 255))
        bg.alpha_composite(bust)
        out.paste(bg, (i * 32, 0))
    out.save(os.path.join(ROOT, "ui", "portraits_placeholder.png"))
    print("portraits done")


if __name__ == "__main__":
    build_tileset()
    build_characters()
    build_player()
    build_enemies()
    build_ui()
    build_hud_icons()
    build_font()
    build_portraits()
    print("art done")
