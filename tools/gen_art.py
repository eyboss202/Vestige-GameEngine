"""Placeholder pixel-art generator for VESTIGE.

Everything produced here is a labelled PLACEHOLDER. Replace the PNGs in
/assets with real art at the same dimensions and the game keeps running.
"""
import os, random
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..", "game", "assets")

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
    "wound":     (74, 14, 16, 255),
    "wound_d":   (44, 8, 10, 255),
    "pus":       (150, 168, 74, 255),
    "bone_dark":  (58, 52, 46, 255),

    # -- HUD icons ------------------------------------------------------------
    "water":     (95, 168, 216, 255),
    "hud_dim":   (44, 51, 53, 255),
    "steel":     (154, 178, 196, 255),
    "steel_hi":  (204, 222, 232, 255),
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


def _draw_held_item(px, held, dr, hx, hy, fx):
    """Weapon/tool glyph baked onto the hand pixel computed in draw_char()'s
    arms block — see that call site for `hx, hy, fx`. Kept intentionally
    tiny and inside the sprite's own 16px width (no separate overlay, no
    hand-offset heuristics at runtime): this *is* the held-item art, part of
    the same texture as the arm that's holding it, so it inherits the walk
    cycle's bob/swing for free. `held` is a game/data/weapons.js category."""
    # Bright, saturated tones on purpose — the dark coat/belt already occupy
    # this part of the frame, so a held item drawn in a close, muted tone
    # (concrete grey against a near-black coat) just disappears at gameplay
    # scale. High-contrast steel/bone/amber reads clearly at a glance instead.
    grip, rust, blade = (58, 46, 36, 255), P["rust"], P["bone"]
    steel, steel_hi = P["steel"], P["steel_hi"]
    short = dr == 3   # facing away — character's back hides most of it

    if held == 'melee':
        px(hx, hy, rust)
        px(hx + fx, hy - 1, blade)
        if not short:
            px(hx + fx, hy - 2, blade)
            px(hx + fx * 2, hy - 2, steel_hi)
    elif held == 'pistol':
        px(hx, hy, grip)
        px(hx, hy - 1, steel)
        px(hx + fx, hy - 1, steel_hi if short else steel)
        if not short:
            px(hx + fx * 2, hy - 1, steel_hi)
    elif held in ('rifle', 'shotgun'):
        tone = steel if held == 'shotgun' else steel_hi
        px(hx - fx, hy, grip)
        px(hx, hy - 1, steel)
        px(hx + fx, hy - 1, steel if short else tone)
        if not short:
            px(hx + fx * 2, hy - 1, tone)
            px(hx + fx * 3, hy - 1, steel_hi)


def draw_char(d, ox, oy, direction, frame, pal, held=None):
    """direction: 0 down 1 left 2 right 3 up. frame 0..3 (0/2 idle, 1/3 step).

    Base humanoid renderer shared by the player and every NPC/enemy sheet.
    Accessories (glasses/beard/backpack/patches) are opt-in via boolean keys
    on `pal` so this stays the one place a walk-cycle silhouette is drawn —
    see build_characters(): only the player's palette sets them. `held` (a
    game/data/weapons.js category, or None) bakes a held-item glyph onto the hand
    — see build_player_holding() — instead of Player.js compositing a
    separate floating icon at runtime.
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
    if held:
        # Profile view is always drawn "facing left" locally (px() mirrors it
        # for direction 2/right — see the head-drawing block above), so the
        # forward hand there is the low-x one; down/away use the high-x hand
        # with the item leaning toward screen-right.
        if dr == 1:
            _draw_held_item(px, held, dr, 3, by + 7 + max(swing, 0), -1)
        else:
            _draw_held_item(px, held, dr, 12, by + 7 - min(swing, 0), 1)

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


def sheet(name, pal, held=None):
    img = Image.new("RGBA", (CW * 4, CH * 4), P["clear"])
    d = ImageDraw.Draw(img)
    for row in range(4):
        for col in range(4):
            draw_char(d, col * CW, row * CH, row, col, pal, held=held)
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
    # One dedicated walk-cycle sheet per weapon category, the held item baked
    # onto the hand pixel by draw_char()'s `held` param — see Player.js,
    # which swaps this.animator.image to the matching sheet the instant the
    # equipped weapon's category changes, instead of compositing a separate
    # floating icon over the base sheet at runtime.
    for category in ("melee", "pistol", "rifle", "shotgun"):
        sheet(f"player_doctor_{category}_placeholder.png", player, held=category)


def build_player_dead():
    """Severely wounded corpse variant, same 16x24 grid/silhouette as
    build_player()'s base sheet — entities/player/Player.js startDeath()
    swaps the animator onto this instead of the normal sheet, so the
    (unmodified) collapse animation shows a bloodied body falling rather than
    the ordinary one. Paler shock-pallor skin, a darker torn coat and a
    blood-red trim replace the normal palette; hand-placed spatter and a
    pooling stain (not achievable through draw_char()'s accessory flags, so
    added as a post-process pass over the finished sheet) do the rest."""
    pal = dict(
        hair=P["copper_hair"], skin=(158, 128, 122, 255), skin_sh=(110, 82, 80, 255),
        coat=(52, 36, 36, 255), coat_sh=(34, 22, 22, 255),
        trouser=(28, 22, 22, 255), trouser_l=(40, 32, 32, 255),
        shoe=(20, 16, 16, 255), eye=(30, 34, 38, 255),
        glasses=True, lens=P["lens"], lens_frame=P["ash"],
        beard=True, beard_color=P["stubble"],
        backpack=P["pack"], backpack_sh=P["pack_sh"], backpack_strap=P["pack_strap"],
        patch=P["patch"], belt=P["shoe"], trim=(110, 26, 26, 255), tuft=True,
    )
    img = Image.new("RGBA", (CW * 4, CH * 4), P["clear"])
    d = ImageDraw.Draw(img)
    for row in range(4):
        for col in range(4):
            draw_char(d, col * CW, row * CH, row, col, pal, held=None)

    blood, blood_d = (128, 20, 20, 255), (76, 10, 10, 255)
    rnd = random.Random(99)
    for row in range(4):
        for col in range(4):
            ox, oy = col * CW, row * CH
            for _ in range(8):                       # torso/head spatter
                x, y = ox + rnd.randint(3, 12), oy + rnd.randint(3, 17)
                c = blood if rnd.random() < 0.6 else blood_d
                d.point((x, y), c)
                if rnd.random() < 0.5:
                    d.point((x + 1, y), c)
            for x in range(ox + 3, ox + 13):          # pooling stain at the feet
                if rnd.random() < 0.65:
                    d.point((x, oy + 23), blood_d)

    img.save(os.path.join(ROOT, "sprites", "player_doctor_dead_placeholder.png"))


# --------------------------------------------------------------------------
# ENEMIES — one distinct silhouette per archetype instead of a recolored
# zombie. Sheets stay 16x24, 4 cols x 4 rows (down/left/right/up, idle-step-
# idle-step) so core/Animation.js needs no changes; game/data/enemies.js just
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


def _gash(px, x0, y0, x1, y1, c):
    """One-pixel diagonal scar/gash/vein line — routed through px() so it
    mirrors correctly for the right-facing frame like every structural
    detail here, unlike the noise() texture calls below (which fill an
    already left/right-symmetric rectangle and so don't need to)."""
    steps = max(abs(x1 - x0), abs(y1 - y0), 1)
    for i in range(steps + 1):
        px(round(x0 + (x1 - x0) * i / steps), round(y0 + (y1 - y0) * i / steps), c)


def _drip(px, x, y0, y1, c):
    """A thin vertical drip (blood/drool/acid) trailing down from a wound or
    a maw — y0 the source, y1 the furthest it's run down."""
    for y in range(y0, y1 + 1):
        px(x, y, c)


def draw_husk(d, ox, oy, direction, frame):
    """Gaunt scavenger, patchy scalp, torn shirt over a visible ribcage,
    sunken glowing eye sockets instead of a face, a thin trail of dried
    blood from the jaw. The baseline threat — unremarkable size and speed,
    but the most decayed-looking of the lot; everything scarier past this
    one is a further mutation away from this starting point."""
    px, rc, mirror, dr = _frame_helpers(d, ox, oy, direction)
    bob = 1 if frame in (1, 3) else 0
    top = 2 + bob
    skin, skin_sh = P["flesh"], P["flesh_sh"]
    cloth, cloth_sh = (50, 54, 45, 255), (34, 38, 32, 255)

    noise(d, ox + 5, oy + top, 6, 9, skin, skin_sh, seed=ox * 7 + oy + 1, density=0.22)
    rc(5, top + 7, 10, top + 8, skin_sh)
    px(5, top, P["ash"]); px(7, top, P["ash"]); px(9, top, P["ash"])   # scalp gone in patches
    px(6, top + 2, skin_sh); px(9, top + 2, skin_sh)                    # sunken cheeks
    if dr == 0:
        px(6, top + 4, P["eye_glow"]); px(9, top + 4, P["eye_glow"])
        rc(7, top + 6, 8, top + 6, P["maw"])
        _drip(px, 8, top + 7, top + 8, P["wound_d"])                     # dried blood off the jaw
    elif dr == 3:
        rc(5, top + 1, 10, top + 6, (38, 40, 34, 255))
    else:
        px(5, top + 4, P["eye_glow"])
        rc(4, top + 6, 6, top + 6, P["maw"])
        _drip(px, 5, top + 7, top + 7, P["wound_d"])

    by = top + 9
    noise(d, ox + 4, oy + by, 8, 9, cloth, cloth_sh, seed=ox * 5 + oy + 2, density=0.3)
    if dr != 3:
        for rib_y in (by + 1, by + 3, by + 5):                            # ribs showing through torn shirt
            rc(6, rib_y, 9, rib_y, skin_sh)
        px(7, by + 2, skin); px(8, by + 4, skin)
    # Ragged, staggered hem instead of one straight cut.
    for hx, drop in [(4, 0), (5, 1), (6, 0), (7, 1), (8, 0), (9, 1), (10, 0), (11, 1)]:
        px(hx, by + 7 + drop, cloth_sh)
    _arms(rc, px, by, frame, skin_sh, skin, x0=3, x1=12, droop=1)
    px(12, by + 8 + (1 if frame == 3 else 0), P["bone_c"])                # one skeletal fingertip

    _walk_legs(rc, px, by + 9, frame, cloth, cloth_sh, P["ash"])


def draw_mutant(d, ox, oy, direction, frame):
    """Bulkier — one grossly overgrown arm laced with bulging veins, a
    tumorous shoulder where it joins the body, boil-studded flesh (a couple
    swollen into dark-centred cysts), red eyeshine."""
    px, rc, mirror, dr = _frame_helpers(d, ox, oy, direction)
    bob = 1 if frame in (1, 3) else 0
    top = 2 + bob
    skin, skin_sh = P["flesh"], P["sinew"]

    noise(d, ox + 4, oy + top, 8, 9, skin, skin_sh, seed=ox * 3 + oy + 10, density=0.2)
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
    noise(d, ox + 3, oy + by, 10, 9, skin, skin_sh, seed=ox * 3 + oy + 11, density=0.16)
    rc(3, by + 7, 12, by + 8, skin_sh)
    rc(11, by, 13, by + 8, skin_sh)      # oversized right arm/shoulder mass
    rc(10, by - 1, 12, by, P["boil"])    # tumorous growth at the join
    px(11, by - 1, P["wound_d"])
    _gash(px, 12, by + 1, 12, by + 6, P["sinew"])    # bulging vein down the oversized arm
    _gash(px, 11, by + 2, 13, by + 5, P["sinew"])
    px(8, by + 2, P["boil"]); px(6, by + 4, P["boil"]); px(4, by + 6, P["boil"])
    px(7, by + 5, P["boil"]); px(7, by + 6, P["wound_d"])          # a cyst swollen enough to have gone dark at the core
    _arms(rc, px, by, frame, skin_sh, skin, x0=2, x1=13, droop=1)

    _walk_legs(rc, px, by + 9, frame, (46, 34, 28, 255), (60, 44, 36, 255), P["ash"])


def draw_brute(d, ox, oy, direction, frame):
    """Hunched tank — small head sunk between huge shoulders, a ragged row
    of bone spikes down the back, old scars crossing the chest, a
    permanently drooling maw and a snapped restraint still cuffed to one
    wrist (something kept this contained, once). Reads as dangerous mass
    before the runtime `scale` even enlarges it further (game/data/enemies.js)."""
    px, rc, mirror, dr = _frame_helpers(d, ox, oy, direction)
    bob = 1 if frame in (1, 3) else 0
    top = 3 + bob
    skin, skin_sh = (108, 118, 96, 255), (76, 86, 66, 255)

    noise(d, ox + 5, oy + top, 6, 7, skin, skin_sh, seed=ox * 9 + oy + 20, density=0.18)
    if dr == 0:
        px(6, top + 3, P["eye_red"]); px(9, top + 3, P["eye_red"])
        rc(7, top + 5, 8, top + 5, P["maw"])
        _drip(px, 7, top + 6, top + 7, P["wound_d"])
    elif dr == 3:
        rc(5, top, 10, top + 5, skin_sh)
    else:
        px(5, top + 3, P["eye_red"])
        px(5, top + 5, P["maw"])
        _drip(px, 5, top + 6, top + 7, P["wound_d"])

    by = top + 7
    noise(d, ox + 2, oy + by, 12, 9, skin, skin_sh, seed=ox * 9 + oy + 21, density=0.14)
    rc(2, by + 8, 13, by + 9, skin_sh)
    for bx, byy in [(2, by), (13, by), (5, by - 1), (9, by - 1), (7, by - 1)]:
        px(bx, byy, P["bone_c"]); px(bx, byy - 1, P["bone_sh"])
    if dr != 3:
        _gash(px, 5, by + 2, 9, by + 4, P["wound_d"])     # old scar across the chest
        _gash(px, 6, by + 5, 8, by + 6, P["wound"])
    _arms(rc, px, by, frame, skin_sh, skin, x0=1, x1=14, droop=2)
    swing = {0: 0, 1: -1, 2: 0, 3: 1}[frame]
    wrist_y = by + 6 + max(swing, 0)                       # snapped shackle, left wrist
    px(1, wrist_y, P["bone_dark"]); px(1, wrist_y + 1, P["conc_d"])

    _walk_legs(rc, px, by + 10, frame, (40, 44, 36, 255), (52, 58, 46, 255), P["ash"], x0=3, x1=12)


def draw_stalker(d, ox, oy, direction, frame):
    """Thin, crouched sprinter — small head, spindly arms jointed at an
    inward elbow and ending in claws, a visible knobbed spine ridge from
    behind, violet eyeshine, a grin too wide for the face. Short detect
    radius, long reach once it notices you."""
    px, rc, mirror, dr = _frame_helpers(d, ox, oy, direction)
    bob = 1 if frame in (1, 3) else 0
    top = 3 + bob
    skin, skin_sh = (70, 58, 82, 255), (48, 40, 58, 255)

    rc(6, top, 9, top + 6, skin)
    rc(6, top + 5, 9, top + 6, skin_sh)
    if dr == 0:
        px(7, top + 3, P["eye_violet"]); px(8, top + 3, P["eye_violet"])
        rc(6, top + 5, 9, top + 5, P["maw"])
    elif dr == 3:
        rc(6, top, 9, top + 5, skin_sh)
        for spy in (top + 7, top + 9, top + 11):
            px(7, spy, P["bone_c"])
    else:
        px(6, top + 3, P["eye_violet"])
        px(6, top + 5, P["maw"])

    by = top + 7
    rc(6, by, 9, by + 8, skin)
    rc(6, by + 7, 9, by + 8, skin_sh)
    if dr != 3:
        px(7, by + 3, skin_sh)   # gaunt ribcage hint
    rc(2, by + 1, 2, by + 5, skin_sh); rc(3, by + 5, 3, by + 9, skin_sh)      # left arm, jointed at the elbow
    rc(13, by + 1, 13, by + 5, skin_sh); rc(12, by + 5, 12, by + 9, skin_sh)  # right arm, mirrored joint
    px(3, by + 10, skin_sh); px(12, by + 10, skin_sh)
    px(3, by + 11, P["ash"]); px(12, by + 11, P["ash"])                       # clawed fingertip

    _walk_legs(rc, px, by + 9, frame, skin, skin_sh, (20, 16, 24, 255), x0=5, x1=10)


def draw_spitter(d, ox, oy, direction, frame):
    """Bloated acid sac where a torso should be, its membrane mottled and
    laced with veins, drooling a thin trail of caustic drool. Holds range
    and lobs Projectiles (behavior: 'ranged' in game/data/enemies.js) instead of
    closing in."""
    px, rc, mirror, dr = _frame_helpers(d, ox, oy, direction)
    bob = 1 if frame in (1, 3) else 0
    top = 3 + bob
    skin, skin_sh = (72, 96, 74, 255), (48, 68, 52, 255)

    rc(5, top, 10, top + 6, skin)
    rc(5, top + 5, 10, top + 6, skin_sh)
    if dr == 0:
        px(6, top + 3, P["eye_glow"]); px(9, top + 3, P["eye_glow"])
        rc(7, top + 5, 8, top + 5, P["maw"])
        _drip(px, 8, top + 6, top + 8, P["pus"])
    elif dr == 3:
        rc(5, top, 10, top + 5, skin_sh)
    else:
        px(5, top + 3, P["eye_glow"])
        _drip(px, 5, top + 5, top + 7, P["pus"])

    by = top + 7
    noise(d, ox + 3, oy + by, 10, 9, P["sac"], P["sac_sh"], seed=ox * 11 + oy + 30, density=0.22)
    rc(3, by + 8, 12, by + 9, P["sac_sh"])
    px(5, by + 3, P["sac_sh"]); px(10, by + 4, P["sac_sh"]); px(7, by + 6, P["boil"])
    _gash(px, 4, by + 2, 6, by + 5, P["sac_sh"])      # veins tracing the membrane
    _gash(px, 9, by + 1, 11, by + 6, P["sac_sh"])
    px(6, by + 7, P["pus"])                             # a weeping pustule low on the sac
    _arms(rc, px, by, frame, skin_sh, skin, x0=2, x1=13, droop=0)

    _walk_legs(rc, px, by + 10, frame, skin, skin_sh, (24, 30, 22, 255), x0=5, x1=10)


def draw_swarmling(d, ox, oy, direction, frame):
    """Small and low, a many-legged crawler pushed down in the frame —
    chitin-plated segments, a cluster of small compound-eye dots, twitching
    mandibles and a faint glowing marking on the abdomen, even before the
    0.7x runtime scale makes it look more insectile still."""
    px, rc, mirror, dr = _frame_helpers(d, ox, oy, direction)
    bob = 1 if frame in (1, 3) else 0
    top = 7 + bob
    skin, skin_sh = (128, 96, 60, 255), (92, 66, 40, 255)

    rc(6, top, 9, top + 5, skin)
    rc(6, top + 4, 9, top + 5, skin_sh)
    if dr == 0:
        px(6, top + 2, P["eye_glow"]); px(9, top + 2, P["eye_glow"])
        px(7, top + 1, P["eye_glow"]); px(8, top + 1, P["eye_glow"])   # extra compound-eye dots
        px(6, top + 4, P["ash"]); px(9, top + 4, P["ash"])              # twitching mandibles
    elif dr == 3:
        rc(6, top, 9, top + 4, skin_sh)
    else:
        px(6, top + 2, P["eye_glow"]); px(6, top + 1, P["eye_glow"])
        px(6, top + 4, P["ash"])

    by = top + 6
    rc(5, by, 10, by + 6, P["carapace"])
    rc(5, by + 2, 10, by + 2, P["carapace_sh"])
    rc(5, by + 4, 10, by + 4, P["carapace_sh"])
    rc(5, by + 5, 10, by + 6, skin_sh)
    px(7, by + 3, P["eye_glow"])   # faint glow marking the abdomen
    for lx in (2, 3, 4, 11, 12, 13):
        px(lx, by + 3, skin_sh)   # extra limb stubs either side
    _arms(rc, px, by, frame, skin_sh, skin, x0=4, x1=11, droop=-2)

    _walk_legs(rc, px, by + 7, frame, skin, skin_sh, (40, 30, 20, 255), x0=6, x1=9)


def draw_sentinel(d, ox, oy, direction, frame):
    """Unique boss — an uneven crown of bone spikes, three amber eyes, bone
    plating fused directly into the chest with visible crack lines, faint
    rune-like amber markings tracing down the torso, an asymmetric spur on
    one shoulder, clawed oversized hands, a tattered cloak-shadow trailing
    off the shoulders from behind. The widest frame here even before
    `unique: true` (game/data/enemies.js) applies the biggest scale of the set."""
    px, rc, mirror, dr = _frame_helpers(d, ox, oy, direction)
    bob = 1 if frame in (1, 3) else 0
    top = 1 + bob
    skin, skin_sh = (86, 62, 96, 255), (56, 40, 64, 255)

    noise(d, ox + 4, oy + top, 8, 9, skin, skin_sh, seed=ox * 13 + oy + 40, density=0.16)
    for cx, ch_ in ((4, 0), (6, 1), (9, 1), (11, 0)):
        px(cx, top - 1 - ch_, P["bone_c"]); px(cx, top - ch_, P["bone_sh"])
    if dr == 0:
        px(5, top + 4, P["amber"]); px(8, top + 4, P["amber"]); px(6, top + 6, P["amber"])
    elif dr == 3:
        rc(4, top, 11, top + 6, skin_sh)
        px(5, top - 1, P["bone_c"]); px(8, top - 1, P["bone_c"])
    else:
        px(5, top + 4, P["amber"]); px(5, top + 6, P["amber"])

    by = top + 9
    noise(d, ox + 2, oy + by, 12, 9, skin, skin_sh, seed=ox * 13 + oy + 41, density=0.12)
    rc(2, by + 8, 13, by + 9, skin_sh)
    px(2, by - 1, P["bone_c"]); px(13, by - 1, P["bone_c"])
    px(11, by - 2, P["bone_c"]); px(11, by - 1, P["bone_sh"])   # asymmetric shoulder spur
    if dr != 3:
        rc(6, by + 1, 9, by + 4, P["bone_c"])                     # bone plate fused into the chest
        px(6, by + 2, P["bone_sh"]); px(9, by + 3, P["bone_sh"])  # crack lines
        px(7, by + 6, P["amber"]); px(8, by + 8, P["amber"])       # rune markings tracing down
    else:
        for cy in range(by + 1, by + 8, 2):
            px(3, cy, (30, 20, 34, 255)); px(12, cy, (30, 20, 34, 255))   # tattered cloak-shadow
    _arms(rc, px, by, frame, skin_sh, skin, x0=1, x1=14, droop=1)
    swing = {0: 0, 1: -1, 2: 0, 3: 1}[frame]
    px(1, by + 8 + max(swing, 0), P["bone_c"]); px(14, by + 8 - min(swing, 0), P["bone_c"])   # clawed hands

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

    # item icons, 16x16 grid — 38 cells. Every item in game/data/items.js gets
    # its own dedicated cell now; nothing on the sheet is shared and
    # recoloured with iconTint anymore (see ui/ItemIcon.js).
    ITEM_ICON_COLS = 38
    ic = Image.new("RGBA", (16 * ITEM_ICON_COLS, 16), P["clear"])
    di = ImageDraw.Draw(ic)

    def at(i, x0, y0, x1, y1, c):
        di.rectangle([i * 16 + x0, y0, i * 16 + x1, y1], fill=c)

    # 0 syringe — glass barrel with a visible fluid level and graduation
    # ticks, a plunger rod poking out the top, an angled needle off the
    # bottom — the same "angled accent off a solid base" trick icon 10
    # (combat knife) uses, instead of three flat stacked rectangles.
    so = 0 * 16
    at(0, 5, 5, 10, 12, P["glass"])
    at(0, 5, 8, 10, 12, P["glow"])
    di.line([so + 5, 8, so + 10, 8], fill=P["ash"])
    di.line([so + 5, 10, so + 10, 10], fill=P["ash"])
    at(0, 6, 4, 9, 5, P["conc_l"])
    di.line([(so + 7, 4), (so + 7, 1)], fill=P["bone"], width=1)
    di.point((so + 7, 0), P["bone"])
    di.line([(so + 10, 12), (so + 13, 15)], fill=P["conc_l"], width=1)
    di.point((so + 13, 15), P["conc_d"])

    # 1 pill bottle — ridged cap, a wrapped paper label and a glossy edge
    # highlight instead of three flat rectangles.
    po = 1 * 16
    at(1, 4, 5, 11, 14, P["amber"])
    di.rectangle([po + 4, 5, po + 11, 14], outline=P["rust_d"])
    at(1, 5, 7, 10, 10, (230, 226, 214, 255))
    di.line([po + 5, 8, po + 9, 8], fill=P["rust"])
    at(1, 5, 2, 10, 5, (225, 229, 227, 255))
    for cx_ in (6, 8, 10):
        di.line([po + cx_, 2, po + cx_, 4], fill=P["conc_l"])
    di.line([po + 5, 6, po + 5, 13], fill=(255, 214, 150, 255))

    # 2 keycard — magnetic stripe, gold chip and a diagonal clearance band
    # instead of three flat rectangles (keycard_blue — entities/items/
    # game/data/items.js, core/Locks.js).
    ko = 2 * 16
    at(2, 2, 4, 13, 12, P["conc_l"])
    at(2, 2, 4, 13, 5, P["ash"])
    at(2, 3, 8, 6, 10, P["amber"])
    di.line([ko + 4, 11, ko + 5, 11], fill=P["rust_d"])          # chip pin, below the chip, not through it
    di.line([ko + 8, 8, ko + 12, 11], fill=P["glow"], width=1)
    di.point((ko + 12, 8), P["bone"])

    # 3 notebook
    at(3, 4, 3, 12, 13, (150, 140, 118, 255)); at(3, 3, 3, 4, 13, P["rust_d"]); at(3, 6, 6, 11, 6, P["ash"]); at(3, 6, 9, 10, 9, P["ash"])
    # bent page corner + a thin hanging bookmark ribbon, close to the right
    # edge so it doesn't cut across the existing text lines.
    no = 3 * 16
    di.polygon([(no + 10, 3), (no + 12, 3), (no + 12, 5)], fill=(170, 160, 138, 255))
    di.line([no + 11, 3, no + 11, 14], fill=P["rust"], width=1)

    # 4 battery — beveled terminal nub, a charge stripe with a gloss edge
    # and a bottom ridge line instead of three flat rectangles. Also the
    # base shape scrip/audio_recording tint over (game/data/items.js) — see
    # ui/ItemIcon.js iconTint — so it stays a plausible "small sealed
    # device" silhouette rather than something battery-literal enough to
    # look wrong recoloured as a coin or a recorder.
    bo = 4 * 16
    at(4, 6, 2, 9, 4, P["conc_d"])              # terminal nub
    at(4, 4, 4, 11, 13, P["conc_d"])             # casing (reads as a border once the lighter body sits inside it)
    at(4, 5, 5, 10, 12, P["conc"])               # body
    at(4, 6, 6, 9, 10, P["amber"])               # charge stripe, inset so the casing border stays visible
    di.line([bo + 6, 6, bo + 6, 10], fill=(255, 200, 130, 255))   # gloss edge on the stripe
    di.point((bo + 5, 7), P["conc_l"]); di.point((bo + 5, 9), P["conc_l"])   # casing ridge ticks
    di.point((bo + 7, 5), P["bone"])

    # 5 canteen — rounded flask body, liquid level with a surface glint,
    # a neck/cap and a strap-loop hint instead of three flat rectangles.
    co = 5 * 16
    di.ellipse([co + 3, 5, co + 12, 14], fill=(86, 96, 92, 255))
    di.ellipse([co + 3, 9, co + 12, 14], fill=P["sludge_l"])
    di.line([co + 4, 9, co + 11, 9], fill=(150, 190, 176, 255))
    at(5, 6, 2, 9, 5, P["conc_l"])
    at(5, 5, 1, 10, 2, P["conc_d"])
    di.line([(co + 3, 6), (co + 2, 8)], fill=P["conc_d"], width=1)
    di.line([co + 5, 6, co + 5, 13], fill=(120, 132, 128, 255))

    # 6 scrap — overlapping jagged shards with rust texture and an edge
    # highlight instead of a clean rectangle stack.
    sc = 6 * 16
    di.polygon([(sc + 3, 10), (sc + 7, 4), (sc + 10, 6), (sc + 6, 12)], fill=P["conc_l"])
    di.polygon([(sc + 7, 8), (sc + 12, 5), (sc + 13, 9), (sc + 9, 12)], fill=P["conc"])
    di.polygon([(sc + 4, 9), (sc + 8, 11), (sc + 6, 14), (sc + 3, 13)], fill=P["rust"])
    di.point((sc + 5, 7), P["rust_d"]); di.point((sc + 10, 7), P["rust_d"]); di.point((sc + 7, 11), P["ash"])
    di.line([(sc + 3, 10), (sc + 7, 4)], fill=P["bone"])

    # 7 unknown / fallback
    at(7, 3, 3, 12, 12, P["conc_d"]); at(7, 4, 4, 11, 11, P["ash"]); at(7, 7, 5, 8, 8, P["glow"]); at(7, 7, 9, 8, 10, P["glow"])
    # 8 key — a real bow-and-teeth silhouette for lock/key items (Locks.js)
    kx = 8 * 16
    di.ellipse([kx + 3, 2, kx + 9, 8], outline=P["amber"], width=2)
    di.rectangle([kx + 8, 6, kx + 9, 12], fill=P["amber"])
    di.rectangle([kx + 8, 10, kx + 12, 11], fill=P["amber"])
    di.rectangle([kx + 8, 12, kx + 11, 13], fill=P["amber"])
    # 9 folded letter — for readable notes/letters/documents (readable())
    lx = 9 * 16
    at(9, 3, 4, 12, 12, (150, 140, 118, 255))
    di.line([lx + 3, 4, lx + 7, 8], fill=(110, 100, 82, 255))
    di.line([lx + 12, 4, lx + 8, 8], fill=(110, 100, 82, 255))
    di.line([lx + 3, 4, lx + 12, 4], fill=(180, 168, 142, 255))
    # wax seal — one more accent for a touch more personality.
    di.ellipse([lx + 10, 8, lx + 13, 11], fill=P["rust_d"])
    di.point((lx + 11, 9), P["rust"])

    # 10 combat knife — angled blade + wrapped grip, its own silhouette
    # instead of the tinted-scrap shape every weapon used to share.
    kx = 10 * 16
    di.polygon([(kx + 5, 12), (kx + 11, 3), (kx + 13, 4), (kx + 8, 13)], fill=P["bone"])
    di.line([(kx + 5, 12), (kx + 11, 3)], fill=P["conc_l"])
    di.line([(kx + 3, 14), (kx + 6, 11)], fill=P["rust"], width=2)
    di.point((kx + 3, 13), P["rust_d"])
    # 11 service pistol — side profile: slide, barrel, grip
    px_ = 11 * 16
    di.rectangle([px_ + 3, 5, px_ + 12, 8], fill=P["conc_l"])
    di.rectangle([px_ + 3, 5, px_ + 12, 6], fill=(94, 106, 110, 255))
    di.rectangle([px_ + 11, 6, px_ + 13, 7], fill=P["conc_d"])
    di.polygon([(px_ + 5, 9), (px_ + 9, 9), (px_ + 8, 14), (px_ + 6, 14)], fill=(58, 46, 36, 255))
    di.line([(px_ + 6, 10), (px_ + 6, 13)], fill=(78, 62, 48, 255))
    # 12 patrol rifle — long barrel, stock and a magazine hanging down
    rx = 12 * 16
    di.rectangle([rx + 1, 6, rx + 14, 7], fill=P["conc_l"])
    di.rectangle([rx + 1, 6, rx + 14, 6], fill=(94, 106, 110, 255))
    di.rectangle([rx + 2, 8, rx + 6, 12], fill=(58, 46, 36, 255))
    di.rectangle([rx + 9, 8, rx + 12, 9], fill=P["conc"])
    di.polygon([(rx + 9, 9), (rx + 11, 9), (rx + 10, 13), (rx + 9, 13)], fill=P["conc_d"])
    # 13 riot shotgun — wide double-barrel, wood stock, pump grip
    sx = 13 * 16
    di.rectangle([sx + 1, 5, sx + 12, 6], fill=P["rust_d"])
    di.rectangle([sx + 1, 7, sx + 12, 8], fill=P["rust_d"])
    di.rectangle([sx + 1, 5, sx + 2, 8], fill=(60, 32, 18, 255))
    di.rectangle([sx + 4, 9, sx + 7, 10], fill=(58, 46, 36, 255))
    di.polygon([(sx + 8, 9), (sx + 14, 9), (sx + 14, 13), (sx + 10, 13)], fill=(98, 74, 48, 255))
    # 14 ammo box — open case with three brass-tipped rounds showing
    ax = 14 * 16
    at(14, 3, 6, 12, 13, (70, 60, 46, 255))
    at(14, 3, 6, 12, 7, (96, 82, 62, 255))
    for rx0 in (5, 7.5, 10):
        rx0 = int(rx0)
        di.rectangle([ax + rx0, 3, ax + rx0 + 1, 7], fill=P["amber"])
        di.point((ax + rx0, 2), P["bone"])
        di.point((ax + rx0 + 1, 2), P["bone"])
    # 15 frag grenade — segmented body, pin and spoon lever
    gx = 15 * 16
    di.ellipse([gx + 4, 6, gx + 12, 14], fill=P["moss_d"])
    di.ellipse([gx + 5, 7, gx + 9, 11], fill=P["moss"])
    di.line([gx + 4, 10, gx + 12, 10], fill=(30, 40, 32, 255))
    di.line([gx + 8, 10, gx + 4, 6], fill=(30, 40, 32, 255))
    di.rectangle([gx + 7, 2, gx + 9, 6], fill=P["conc_l"])
    di.line([gx + 9, 3, gx + 12, 1], fill=P["amber"], width=1)

    # 16 flashlight — cylindrical body, wider lens head with a lit-amber
    # lens and a soft light cone, tail cap and switch nub, so it reads
    # distinctly from every other tool silhouette on the sheet.
    fx = 16 * 16
    di.polygon([(fx + 13, 4), (fx + 15, 1), (fx + 15, 13), (fx + 13, 10)], fill=(224, 164, 88, 55))
    at(16, 2, 7, 3, 9, P["conc_d"])                              # tail cap
    at(16, 3, 6, 10, 10, P["conc_l"])                             # body
    di.rectangle([fx + 3, 6, fx + 10, 7], fill=(158, 168, 166, 255))  # top highlight
    di.rectangle([fx + 6, 4, fx + 7, 5], fill=P["ash"])           # switch nub
    at(16, 10, 5, 13, 11, P["conc_d"])                            # lens head
    di.ellipse([fx + 11, 6, fx + 13, 10], fill=P["amber"])        # lit lens
    di.point((fx + 12, 7), P["bone"])

    # Everything below used to share one of the base shapes above via
    # iconTint (see ui/ItemIcon.js) — a recolour standing in for real art.
    # One dedicated silhouette per item now; game/data/items.js's iconTint on
    # each of these is gone, the colour is baked into the art itself.

    # 17 bandage roll — off-white gauze wrap with a loose end and a blood spot.
    bo = 17 * 16
    at(17, 4, 4, 11, 12, (232, 226, 214, 255))
    di.line([bo + 4, 6, bo + 11, 6], fill=(200, 192, 176, 255))
    di.line([bo + 4, 9, bo + 11, 9], fill=(200, 192, 176, 255))
    di.polygon([(bo + 11, 10), (bo + 14, 11), (bo + 13, 13), (bo + 10, 12)], fill=(232, 226, 214, 255))
    di.ellipse([bo + 5, 5, bo + 7, 7], fill=P["wound"])

    # 18 scavenger helmet — dented dome with a chin strap.
    ho = 18 * 16
    di.ellipse([ho + 3, 3, ho + 12, 10], fill=(90, 100, 88, 255))
    di.rectangle([ho + 3, 8, ho + 12, 10], fill=(60, 68, 58, 255))
    di.line([ho + 5, 10, ho + 5, 13], fill=(40, 44, 38, 255), width=1)
    di.line([ho + 10, 10, ho + 10, 13], fill=(40, 44, 38, 255), width=1)
    di.point((ho + 9, 5), (140, 150, 136, 255))
    di.point((ho + 7, 4), P["rust_d"])

    # 19 shelter logbook — metal-ring binder with a tabbed page, distinct
    # from the personal notebook (3) and the folded letter (9).
    lo = 19 * 16
    at(19, 4, 3, 12, 13, (74, 84, 70, 255))
    for ry in (4, 6, 8, 10, 12):
        di.point((lo + 4, ry), P["conc_l"]); di.point((lo + 5, ry), P["conc_l"])
    at(19, 7, 5, 11, 11, (150, 156, 138, 255))
    di.line([lo + 7, 7, lo + 11, 7], fill=(90, 96, 82, 255))
    di.line([lo + 7, 9, lo + 11, 9], fill=(90, 96, 82, 255))
    at(19, 11, 6, 12, 7, P["amber"])

    # 20 lucky charm — a gem pendant on a string.
    ch = 20 * 16
    di.line([ch + 8, 2, ch + 8, 6], fill=(90, 90, 90, 255))
    di.ellipse([ch + 5, 6, ch + 11, 13], fill=P["eye_violet"])
    di.ellipse([ch + 6, 7, ch + 10, 11], fill=(200, 170, 224, 255))
    di.point((ch + 7, 8), P["bone"])
    di.point((ch + 8, 3), (60, 60, 60, 255))

    # 21 power cell — the flashlight's battery (dedicated, was a tinted
    # share of icon 4). Same design as the earlier icon-4 rework.
    ce = 21 * 16
    at(21, 6, 2, 9, 4, P["conc_d"])
    at(21, 4, 4, 11, 13, P["conc_d"])
    at(21, 5, 5, 10, 12, P["conc"])
    at(21, 6, 6, 9, 10, P["amber"])
    di.line([ce + 6, 6, ce + 6, 10], fill=(255, 200, 130, 255))
    di.point((ce + 5, 7), P["conc_l"]); di.point((ce + 5, 9), P["conc_l"])
    di.point((ce + 7, 5), P["bone"])

    # 22 scrip — a small stack of stamped coins.
    cn = 22 * 16
    di.ellipse([cn + 4, 9, cn + 11, 13], fill=(180, 140, 70, 255))
    di.ellipse([cn + 4, 7, cn + 11, 11], fill=P["amber"])
    di.ellipse([cn + 4, 5, cn + 11, 9], fill=(224, 180, 110, 255))
    di.line([cn + 5, 6, cn + 10, 6], fill=(255, 220, 160, 255))
    di.point((cn + 7, 7), (150, 110, 55, 255))

    # 23 audio recorder — handheld dictaphone with twin tape reels.
    ar = 23 * 16
    at(23, 4, 5, 12, 12, (60, 64, 66, 255))
    at(23, 4, 5, 12, 6, (84, 90, 92, 255))
    di.ellipse([ar + 5, 7, ar + 8, 10], fill=P["ash"])
    di.ellipse([ar + 9, 7, ar + 12, 10], fill=P["ash"])
    di.point((ar + 6, 8), (140, 150, 148, 255)); di.point((ar + 10, 8), (140, 150, 148, 255))
    at(23, 5, 11, 7, 11, P["eye_red"])

    # 24 ration tin — a can with a pull-ring lid and a paper label band.
    tn = 24 * 16
    at(24, 4, 6, 11, 13, (150, 156, 148, 255))
    at(24, 4, 6, 11, 7, (180, 186, 178, 255))
    di.ellipse([tn + 5, 5, tn + 10, 7], fill=(120, 126, 118, 255))
    di.line([tn + 7, 5, tn + 9, 4], fill=P["conc_l"], width=1)
    at(24, 5, 9, 10, 9, P["rust"])

    # 25 canteen — dedicated to purified_water now (was shared with the
    # ration tin above via iconTint); water-blue fill instead of sludge.
    wa = 25 * 16
    di.ellipse([wa + 3, 5, wa + 12, 14], fill=(86, 96, 92, 255))
    di.ellipse([wa + 3, 9, wa + 12, 14], fill=P["water"])
    di.line([wa + 4, 9, wa + 11, 9], fill=(180, 220, 236, 255))
    at(25, 6, 2, 9, 5, P["conc_l"])
    at(25, 5, 1, 10, 2, P["conc_d"])
    di.line([(wa + 3, 6), (wa + 2, 8)], fill=P["conc_d"], width=1)
    di.line([wa + 5, 6, wa + 5, 13], fill=(140, 170, 190, 255))

    # 26 scrap metal — dedicated (was shared by nine different items via
    # iconTint). Overlapping jagged shards with rust texture.
    sc = 26 * 16
    di.polygon([(sc + 3, 10), (sc + 7, 4), (sc + 10, 6), (sc + 6, 12)], fill=P["conc_l"])
    di.polygon([(sc + 7, 8), (sc + 12, 5), (sc + 13, 9), (sc + 9, 12)], fill=P["conc"])
    di.polygon([(sc + 4, 9), (sc + 8, 11), (sc + 6, 14), (sc + 3, 13)], fill=P["rust"])
    di.point((sc + 5, 7), P["rust_d"]); di.point((sc + 10, 7), P["rust_d"]); di.point((sc + 7, 11), P["ash"])
    di.line([(sc + 3, 10), (sc + 7, 4)], fill=P["bone"])

    # 27 stale bread — a scored loaf.
    br = 27 * 16
    di.ellipse([br + 3, 6, br + 12, 13], fill=(196, 158, 100, 255))
    for sx_ in (5, 7, 9):
        di.line([br + sx_, 7, br + sx_ - 1, 9], fill=(150, 116, 64, 255))
    di.point((br + 6, 11), (222, 190, 140, 255))

    # 28 plated vest — a torso silhouette with a chest plate and rivet.
    ve = 28 * 16
    di.polygon([(ve + 5, 3), (ve + 11, 3), (ve + 12, 13), (ve + 4, 13)], fill=(70, 78, 74, 255))
    di.polygon([(ve + 5, 3), (ve + 11, 3), (ve + 11, 6), (ve + 5, 6)], fill=(90, 98, 94, 255))
    di.rectangle([ve + 6, 7, ve + 10, 9], fill=P["conc_l"])
    di.line([ve + 8, 3, ve + 8, 13], fill=(50, 56, 52, 255))
    di.point((ve + 6, 8), P["conc_d"])

    # 29 padded gloves — a visibly separate pair (a dark gap between them,
    # not just two similar-toned shapes touching) with finger and cuff seams.
    gl = 29 * 16
    di.polygon([(gl + 3, 5), (gl + 7, 4), (gl + 7, 10), (gl + 3, 11)], fill=(140, 108, 68, 255))
    di.line([gl + 5, 5, gl + 5, 9], fill=(96, 72, 44, 255))
    at(29, 3, 10, 7, 11, (96, 72, 44, 255))
    di.point((gl + 3, 6), (166, 130, 84, 255))
    di.polygon([(gl + 9, 4), (gl + 13, 5), (gl + 13, 11), (gl + 9, 10)], fill=(140, 108, 68, 255))
    di.line([gl + 11, 5, gl + 11, 9], fill=(96, 72, 44, 255))
    at(29, 9, 10, 13, 11, (96, 72, 44, 255))
    di.point((gl + 13, 6), (166, 130, 84, 255))

    # 30 worn boots — a pair, laces on each shaft.
    bt = 30 * 16
    di.rectangle([bt + 4, 3, bt + 7, 10], fill=P["conc"])
    di.polygon([(bt + 4, 10), (bt + 8, 10), (bt + 8, 13), (bt + 3, 13)], fill=P["conc_d"])
    di.rectangle([bt + 9, 3, bt + 12, 10], fill=(60, 70, 74, 255))
    di.polygon([(bt + 9, 10), (bt + 13, 10), (bt + 12, 13), (bt + 8, 13)], fill=(44, 52, 56, 255))
    di.line([bt + 4, 5, bt + 7, 5], fill=P["conc_l"])
    di.line([bt + 9, 5, bt + 12, 5], fill=(84, 95, 99, 255))

    # 31 spike trap kit — a folded strip of angled spikes.
    sp = 31 * 16
    at(31, 3, 9, 12, 12, (60, 64, 58, 255))
    for sx_ in (4, 6, 8, 10):
        di.polygon([(sp + sx_, 9), (sp + sx_ + 1, 4), (sp + sx_ + 2, 9)], fill=P["conc_l"])
    di.point((sp + 5, 5), P["bone"])

    # 32 electric trap kit — a coiled wire housing with a live spark.
    el = 32 * 16
    at(32, 4, 8, 11, 12, (50, 56, 58, 255))
    di.ellipse([el + 5, 3, el + 10, 8], outline=(90, 100, 102, 255), width=1)
    di.polygon([(el + 7, 3), (el + 9, 6), (el + 7, 6), (el + 9, 9)], fill=P["water"])
    di.point((el + 6, 9), P["water"])

    # 33 explosive trap kit — a pressure-plate mine with an armed light.
    ex = 33 * 16
    di.ellipse([ex + 4, 7, ex + 11, 13], fill=(46, 50, 44, 255))
    di.ellipse([ex + 6, 6, ex + 9, 9], fill=P["rust"])
    di.point((ex + 7, 7), P["eye_red"])
    for sx_ in (5, 10):
        di.line([ex + sx_, 7, ex + sx_, 10], fill=(30, 32, 28, 255))

    # 34 alarm trap kit — a tripwire bell.
    al = 34 * 16
    di.ellipse([al + 5, 5, al + 10, 10], fill=P["amber"])
    di.rectangle([al + 7, 3, al + 8, 5], fill=P["conc_l"])
    di.point((al + 7, 7), P["ash"])
    di.line([al + 3, 11, al + 12, 11], fill=(200, 200, 200, 150))
    di.point((al + 3, 11), P["bone"]); di.point((al + 12, 11), P["bone"])

    # 35 pistol ammo — a short stubby round.
    pa = 35 * 16
    di.rectangle([pa + 6, 4, pa + 9, 10], fill=(196, 166, 100, 255))
    di.polygon([(pa + 6, 4), (pa + 9, 4), (pa + 8, 2), (pa + 7, 2)], fill=P["amber"])
    di.line([pa + 6, 7, pa + 9, 7], fill=(150, 124, 70, 255))
    di.rectangle([pa + 6, 10, pa + 9, 11], fill=(120, 98, 54, 255))

    # 36 rifle ammo — a longer, pointed round with a cannelure ring.
    ra = 36 * 16
    di.rectangle([ra + 6, 2, ra + 9, 11], fill=(196, 166, 100, 255))
    di.polygon([(ra + 6, 2), (ra + 9, 2), (ra + 7, 0), (ra + 8, 0)], fill=(150, 80, 60, 255))
    di.line([ra + 6, 9, ra + 9, 9], fill=(150, 124, 70, 255))
    di.rectangle([ra + 6, 11, ra + 9, 12], fill=(120, 98, 54, 255))

    # 37 shotgun shell — a red plastic hull over a brass base.
    sh = 37 * 16
    di.rectangle([sh + 5, 4, sh + 10, 9], fill=(196, 85, 63, 255))
    di.rectangle([sh + 5, 9, sh + 10, 11], fill=(196, 166, 100, 255))
    di.line([sh + 5, 6, sh + 10, 6], fill=(230, 120, 100, 255))
    di.ellipse([sh + 6, 10, sh + 9, 11], fill=(150, 124, 70, 255))

    ic.save(os.path.join(ROOT, "ui", "items_placeholder.png"))


def build_hud_icons():
    """Segmented HUD icons — heart / ration / water-droplet / armor-shield /
    flashlight-battery, each with empty/half/full states, for HUD.js's
    Minecraft-style meters (segments, not continuous bars) and
    InventoryUI.js's armor + battery readouts. 5 rows (type) x 3 cols
    (state) of 8x8 cells."""
    cw = ch = 8
    img = Image.new("RGBA", (cw * 3, ch * 5), P["clear"])
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
    # heater-shield outline — flat top, tapering to a point, for the armor
    # meter (InventoryUI.js renderArmorMeter()).
    shield = [(1, 0), (2, 0), (3, 0), (4, 0), (5, 0), (6, 0),
              (1, 1), (2, 1), (3, 1), (4, 1), (5, 1), (6, 1),
              (1, 2), (2, 2), (3, 2), (4, 2), (5, 2), (6, 2),
              (1, 3), (2, 3), (3, 3), (4, 3), (5, 3), (6, 3),
              (2, 4), (3, 4), (4, 4), (5, 4),
              (2, 5), (3, 5), (4, 5), (5, 5),
              (3, 6), (4, 6)]

    # AA-cell battery outline with a narrower terminal nub on top — for
    # InventoryUI.js's flashlight battery meter (renderBatteryMeter()).
    battery = [(3, 0), (4, 0),
               (1, 1), (2, 1), (3, 1), (4, 1), (5, 1), (6, 1),
               (1, 2), (2, 2), (3, 2), (4, 2), (5, 2), (6, 2),
               (1, 3), (2, 3), (3, 3), (4, 3), (5, 3), (6, 3),
               (1, 4), (2, 4), (3, 4), (4, 4), (5, 4), (6, 4),
               (1, 5), (2, 5), (3, 5), (4, 5), (5, 5), (6, 5),
               (1, 6), (2, 6), (3, 6), (4, 6), (5, 6), (6, 6)]

    rows = [(heart, P["eye_red"]), (ration, P["amber"]), (drop, P["water"]), (shield, P["steel"]), (battery, P["glow"])]
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


# --------------------------------------------------------------------------
# CONTAINERS  (openable furniture/storage — entities/Container.js)
# --------------------------------------------------------------------------
def build_containers():
    """One row per container type, 2 columns (closed, open), 16x16 cells —
    see entities/Container.js CONTAINER_ROW. Every type gets its own body
    tone and detailing rather than one shape recoloured, same principle the
    enemy archetypes already follow."""
    types = ["drawer", "cabinet", "locker", "wardrobe", "cupboard", "chest", "box", "shelf", "nightstand"]
    cw = ch = 16
    img = Image.new("RGBA", (cw * 2, ch * len(types)), P["clear"])
    d = ImageDraw.Draw(img)

    def cell(row, col):
        return col * cw, row * ch

    def body(row, col, top_c, body_c, shade_c):
        x, y = cell(row, col)
        d.rectangle([x + 1, y + 3, x + 14, y + 15], fill=body_c)
        d.rectangle([x + 1, y + 3, x + 14, y + 5], fill=top_c)
        d.rectangle([x + 1, y + 13, x + 14, y + 15], fill=shade_c)
        d.line([x + 1, y + 3, x + 14, y + 3], fill=(255, 255, 255, 40))

    wood = ((110, 84, 62, 255), (90, 68, 48, 255), (68, 50, 36, 255))
    wood_l = ((150, 118, 82, 255), (120, 92, 64, 255), (90, 68, 48, 255))
    metal = (P["conc_l"], P["conc"], P["conc_d"])
    dark_metal = ((90, 100, 104, 255), (70, 80, 84, 255), (48, 56, 60, 255))
    chest_c = ((132, 92, 52, 255), (108, 74, 42, 255), (80, 54, 30, 255))
    box_c = ((118, 92, 60, 255), (98, 74, 48, 255), (78, 58, 38, 255))

    palette = {
        "drawer": wood, "cabinet": metal, "locker": dark_metal, "wardrobe": wood_l,
        "cupboard": wood, "chest": chest_c, "box": box_c, "shelf": metal, "nightstand": wood,
    }

    for row, kind in enumerate(types):
        top_c, body_c, shade_c = palette[kind]

        # closed
        body(row, 0, top_c, body_c, shade_c)
        x0, y0 = cell(row, 0)
        if kind in ("drawer", "nightstand"):
            for dy in (7, 11):
                d.line([x0 + 2, y0 + dy, x0 + 13, y0 + dy], fill=shade_c)
                d.rectangle([x0 + 6, y0 + dy - 1, x0 + 9, y0 + dy], fill=top_c)
        elif kind in ("cabinet", "wardrobe", "cupboard"):
            d.line([x0 + 7, y0 + 5, x0 + 7, y0 + 15], fill=shade_c)
            d.rectangle([x0 + 5, y0 + 9, x0 + 6, y0 + 10], fill=top_c)
            d.rectangle([x0 + 9, y0 + 9, x0 + 10, y0 + 10], fill=top_c)
        elif kind == "locker":
            for lx in (4, 7, 10):
                d.line([x0 + lx, y0 + 6, x0 + lx, y0 + 12], fill=shade_c)
            d.rectangle([x0 + 6, y0 + 9, x0 + 9, y0 + 10], fill=top_c)
        elif kind == "chest":
            d.rectangle([x0 + 1, y0 + 3, x0 + 14, y0 + 7], fill=top_c)
            d.rectangle([x0 + 6, y0 + 7, x0 + 9, y0 + 8], fill=P["amber"])
        elif kind == "box":
            d.line([x0 + 1, y0 + 3, x0 + 7, y0 + 8], fill=shade_c)
            d.line([x0 + 14, y0 + 3, x0 + 8, y0 + 8], fill=shade_c)
        elif kind == "shelf":
            for dy in (6, 9, 12):
                d.line([x0 + 1, y0 + dy, x0 + 14, y0 + dy], fill=top_c)

        # open — a dark cut-out plus a glint so the silhouette unmistakably
        # reads as "opened" rather than a palette swap of the same shape
        body(row, 1, top_c, body_c, shade_c)
        x1, y1 = cell(row, 1)
        d.rectangle([x1 + 3, y1 + 5, x1 + 12, y1 + 14], fill=P["ash"])
        d.rectangle([x1 + 4, y1 + 6, x1 + 11, y1 + 13], fill=(10, 12, 14, 255))
        d.point((x1 + 6, y1 + 9), P["glow"])
        d.point((x1 + 9, y1 + 10), P["amber"])
        if kind in ("cabinet", "wardrobe", "cupboard", "locker"):
            d.line([x1 + 3, y1 + 5, x1 + 2, y1 + 15], fill=shade_c)
            d.line([x1 + 12, y1 + 5, x1 + 13, y1 + 15], fill=shade_c)
        if kind in ("drawer", "nightstand"):
            d.rectangle([x1 + 2, y1 + 12, x1 + 13, y1 + 16], fill=body_c)
            d.rectangle([x1 + 2, y1 + 12, x1 + 13, y1 + 13], fill=top_c)

    img.save(os.path.join(ROOT, "sprites", "containers_placeholder.png"))
    print("containers done")


# --------------------------------------------------------------------------
# PHONE  (fixed save-point object — entities/Phone.js)
# --------------------------------------------------------------------------
def build_phone():
    """Standalone wall payphone — the game's only manual-save trigger. Single
    16x24 frame; the screen's breathing glow is animated at runtime
    (Phone.js render()) rather than baked into extra sheet frames, the same
    trick build_containers()'s loot glints use."""
    w, h = 16, 24
    img = Image.new("RGBA", (w, h), P["clear"])
    d = ImageDraw.Draw(img)

    # booth frame
    d.rectangle([2, 2, 13, 23], fill=P["conc_l"])
    d.rectangle([2, 2, 13, 4], fill=P["steel_hi"])
    d.rectangle([2, 20, 13, 23], fill=P["conc_d"])
    d.line([2, 2, 2, 23], fill=P["conc"])
    d.line([13, 2, 13, 23], fill=P["conc_d"])

    # glass panel
    d.rectangle([4, 5, 11, 14], fill=P["glass"])
    d.line([4, 5, 11, 5], fill=(255, 255, 255, 60))

    # screen (baked-in "off" tone; the runtime glow overlay lights it up)
    d.rectangle([6, 8, 9, 11], fill=P["glow"])

    # keypad
    d.rectangle([5, 15, 10, 18], fill=P["steel"])
    for xx in (6, 8):
        d.point((xx, 16), P["hud_dim"])
        d.point((xx, 17), P["hud_dim"])

    # handset hanging off its cradle hook, right edge
    d.line([11, 12, 13, 17], fill=P["shoe"])
    d.rectangle([12, 16, 14, 19], fill=P["shoe"])

    img.save(os.path.join(ROOT, "sprites", "phone_placeholder.png"))
    print("phone done")


if __name__ == "__main__":
    build_tileset()
    build_characters()
    build_player()
    build_player_dead()
    build_enemies()
    build_ui()
    build_hud_icons()
    build_font()
    build_portraits()
    build_containers()
    build_phone()
    print("art done")
