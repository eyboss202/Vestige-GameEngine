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
    """direction: 0 down 1 left 2 right 3 up. frame 0..3 (0/2 idle, 1/3 step)."""
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
    rc(4, top + 8, 11, top + 8, skin_sh)
    if dr == 0:      # facing camera
        px(6, top + 5, pal["eye"]); px(9, top + 5, pal["eye"])
        px(6, top + 6, skin_sh); px(9, top + 6, skin_sh)
    elif dr == 3:    # away
        rc(4, top, 11, top + 6, hair)
        px(5, top + 7, hair); px(10, top + 7, hair)
    else:            # profile (left)
        rc(4, top, 11, top + 3, hair)
        px(11, top + 4, hair); px(11, top + 5, hair)
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
    elif dr == 3:
        rc(6, by, 9, by + 1, hair)
        rc(7, by + 2, 8, by + 7, coat_sh)
    else:
        rc(9, by + 1, 10, by + 6, coat_sh)
    # arms
    swing = {0: 0, 1: -1, 2: 0, 3: 1}[frame]
    rc(3, by + 1, 3, by + 6, coat_sh)
    rc(12, by + 1, 12, by + 6, coat_sh)
    px(3, by + 7 + max(swing, 0), skin)
    px(12, by + 7 - min(swing, 0), skin)

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
    doctor = dict(hair=P["hair"], skin=P["skin"], skin_sh=P["skin_sh"], coat=P["coat"],
                  coat_sh=P["coat_sh"], trouser=P["trouser"], trouser_l=P["trouser_l"],
                  shoe=P["shoe"], eye=(30, 34, 38, 255))
    npc = dict(doctor, coat=(96, 108, 116, 255), coat_sh=(70, 80, 88, 255),
               hair=(70, 48, 34, 255), trouser=(48, 40, 34, 255), trouser_l=(62, 52, 44, 255))
    npc2 = dict(doctor, coat=(120, 92, 70, 255), coat_sh=(88, 66, 50, 255),
                hair=(28, 26, 30, 255), skin=(168, 122, 92, 255), skin_sh=(132, 94, 68, 255))
    enemy = dict(doctor, coat=(58, 70, 62, 255), coat_sh=(38, 48, 42, 255),
                 hair=(24, 30, 26, 255), skin=(122, 140, 124, 255), skin_sh=(88, 104, 92, 255),
                 trouser=(30, 36, 32, 255), trouser_l=(40, 48, 42, 255), eye=P["glow"])
    sheet("player_doctor_placeholder.png", doctor)
    sheet("npc_survivor_placeholder.png", npc)
    sheet("npc_wanderer_placeholder.png", npc2)
    sheet("enemy_husk_placeholder.png", enemy)


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


# --------------------------------------------------------------------------
# BITMAP FONT ATLAS  (ASCII 32..126, thresholded -> crisp pixel glyphs)
# --------------------------------------------------------------------------
def build_font():
    fnt = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 11)
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
    build_ui()
    build_font()
    build_portraits()
    print("art done")
