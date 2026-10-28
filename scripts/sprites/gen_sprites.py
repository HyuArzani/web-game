#!/usr/bin/env python3
"""
Kraepelin Keep — character sprite generator (reference-guided).

Recreates the wizard (24x32, 3 frames) and four enemies (24x24 each, 13-16
frames) as CLEAN pixel art, guided by the attached reference sheet. Outputs:
  - individual frame PNGs (transparent RGBA)
  - horizontal spritesheets (no gaps, no padding)
  - 8x nearest-neighbor previews
  - a combined contact sheet for review

Palette = the 11 approved project colors (tuning.ts / pixelmaps.ts) + 8
DOCUMENTED character-essential extensions (green goblin, purple shadow,
royal-blue wizard, gold accents). See PALETTE below.
"""

import os
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))  # .../scripts/sprites
PROJECT = os.path.dirname(os.path.dirname(ROOT))  # .../my-project
PUBLIC = os.path.join(PROJECT, "public")
WIZ_DIR = os.path.join(PUBLIC, "sprites", "wizard")
ENM_DIR = os.path.join(PUBLIC, "sprites", "enemies")
QC_DIR = os.path.join(PUBLIC, "sprites", "_qc")
for d in (WIZ_DIR, ENM_DIR, QC_DIR):
    os.makedirs(d, exist_ok=True)
# clean up any wrongly-placed dirs from earlier runs
import shutil
for wrong in [
    os.path.join(os.path.dirname(ROOT), "public"),       # .../scripts/public
    "/home/z/public",
]:
    if os.path.isdir(wrong):
        shutil.rmtree(wrong)

# ---------------------------------------------------------------------------
# PALETTE — 11 approved project colors + 8 documented character extensions.
# ---------------------------------------------------------------------------
# Existing 11 (from tuning.ts / pixelmaps.ts):
#   ink #14110f, bone #f2e9d8, ember #ff6b35, outline #241c18,
#   boneHi #fffaf0, boneShade #cfc2a6, emberHi #ffa76b, inkHi #2b241e,
#   stoneLight #3d342b, fxSpark #cfe3ff, fxGale #7fd8c8
#
# Documented extensions (needed to preserve reference character identity):
#   goblin   #5a8c3a  goblin skin (reference: lime green)
#   goblinHi #8bbf5e  goblin skin highlight
#   shadow    #4a2d6b  wraith cloak + shadow bat body/wings (reference: deep purple)
#   shadowHi  #6b4a8a  shadow highlight
#   royal     #2a3a8a  wizard hat + robe (reference: royal blue)
#   royalHi   #4a5abf  royal highlight
#   gold      #f5c542  wizard trim, buckle, staff orb (reference: gold)
#   goldHi    #ffe066  orb glow / flame core
# ---------------------------------------------------------------------------
PALETTE = {
    ".": None,           # transparent
    "o": "#241c18",      # outline
    "i": "#14110f",      # ink
    "I": "#2b241e",      # inkHi (dark stone)
    "b": "#f2e9d8",      # bone
    "H": "#fffaf0",      # boneHi (rim light upper-left)
    "s": "#cfc2a6",      # boneShade (lower-right)
    "e": "#ff6b35",      # ember
    "E": "#ffa76b",      # emberHi
    "L": "#3d342b",      # stoneLight (mortar / staff wood)
    "k": "#cfe3ff",      # fxSpark (lightning / staff orb spark)
    "g": "#7fd8c8",      # fxGale
    # --- documented extensions ---
    "Q": "#5a8c3a",      # goblin skin
    "q": "#8bbf5e",      # goblin skin highlight
    "P": "#4a2d6b",      # shadow purple (wraith cloak, bat body)
    "p": "#6b4a8a",      # shadow purple highlight
    "R": "#2a3a8a",      # royal blue (wizard hat/robe)
    "r": "#4a5abf",      # royal blue highlight
    "G": "#f5c542",      # gold (trim, buckle, orb)
    "Y": "#ffe066",      # goldHi (orb glow, flame core)
}

# Numeric RGBA tuples for fast PIL drawing
def hex_to_rgba(h: str):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)

PAL_RGBA = {k: (hex_to_rgba(v) if v else (0, 0, 0, 0)) for k, v in PALETTE.items()}


# ---------------------------------------------------------------------------
# Grid helpers
# ---------------------------------------------------------------------------
class Grid:
    def __init__(self, w, h):
        self.w = w
        self.h = h
        self.g = [["."] * w for _ in range(h)]

    def set(self, x, y, ch):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.g[y][x] = ch

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.g[y][x]
        return "."

    def hline(self, x0, x1, y, ch):
        for x in range(min(x0, x1), max(x0, x1) + 1):
            self.set(x, y, ch)

    def vline(self, x, y0, y1, ch):
        for y in range(min(y0, y1), max(y0, y1) + 1):
            self.set(x, y, ch)

    def rect(self, x0, y0, x1, y1, ch):
        for y in range(min(y0, y1), max(y0, y1) + 1):
            for x in range(min(x0, x1), max(x0, x1) + 1):
                self.set(x, y, ch)

    def disc(self, cx, cy, r, ch):
        for y in range(-r, r + 1):
            for x in range(-r, r + 1):
                if x * x + y * y <= r * r:
                    self.set(cx + x, cy + y, ch)

    def ellipse(self, cx, cy, rx, ry, ch):
        for y in range(-ry, ry + 1):
            for x in range(-rx, rx + 1):
                if (x * x) * ry * ry + (y * y) * rx * rx <= rx * rx * ry * ry:
                    self.set(cx + x, cy + y, ch)

    def rows(self):
        return ["".join(r) for r in self.g]

    def copy(self):
        g = Grid(self.w, self.h)
        g.g = [row[:] for row in self.g]
        return g


def render_grid(grid: Grid) -> Image.Image:
    """Render a Grid to a transparent RGBA PIL Image at native resolution."""
    img = Image.new("RGBA", (grid.w, grid.h), (0, 0, 0, 0))
    px = img.load()
    for y in range(grid.h):
        row = grid.g[y]
        for x in range(grid.w):
            ch = row[x]
            if ch != ".":
                px[x, y] = PAL_RGBA[ch]
    return img


def save_frame(img: Image.Image, path: str):
    img.save(path)
    return path


def assemble_sheet(frames: list, w: int, h: int, path: str):
    """Assemble a horizontal spritesheet (no gaps, no padding)."""
    sheet = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, grid in enumerate(frames):
        frame_img = render_grid(grid)
        sheet.paste(frame_img, (i * w, 0))
    sheet.save(path)
    return path


def enlarge(img: Image.Image, scale: int) -> Image.Image:
    """Nearest-neighbor enlargement."""
    return img.resize((img.width * scale, img.height * scale), Image.NEAREST)


def checker_bg(w, h, light=(58, 58, 64, 255), dark=(40, 40, 46, 255)):
    """Neutral dark checkerboard for previews (NOT used in actual sprites)."""
    bg = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = bg.load()
    sz = 8
    for y in range(0, h, sz):
        for x in range(0, w, sz):
            c = light if ((x // sz) + (y // sz)) % 2 == 0 else dark
            for dy in range(min(sz, h - y)):
                for dx in range(min(sz, w - x)):
                    px[x + dx, y + dy] = c
    return bg


def frame_on_checker(grid: Grid, scale: int) -> Image.Image:
    """Render one frame enlarged over a dark checkerboard (for QC preview)."""
    img = render_grid(grid)
    big = enlarge(img, scale)
    bg = checker_bg(big.width, big.height)
    bg.alpha_composite(big)
    return bg


# ===========================================================================
# WIZARD — 24x32, 3 frames (idle_a, idle_b, cast_1)
# Reference: royal-blue pointed hat + gold band, long white beard, blue robe,
# wooden staff with glowing gold orb. 3/4 view facing right.
# ===========================================================================
WIZ_W, WIZ_H = 24, 32


def _wiz_hat(g: Grid, lean: int = 0):
    """Draw the pointed wizard hat (royal blue, highlight upper-left, brim, gold band).
    lean: 0 = upright, +1 = tip leans right (idle_b breathing)."""
    cx = 12 + (lean if lean > 0 else 0)
    # Cone rows (tip -> widening). Each row: outline + highlight + fill.
    # y=0 tip
    g.set(cx, 0, "R")
    g.set(cx - 1, 0, "o"); g.set(cx + 1, 0, "o")
    # y=1..5 widening cone
    cone = [
        (1, 1, 1),   # (y, half-width, has-highlight)
        (2, 2, 1),
        (3, 2, 1),
        (4, 3, 1),
        (5, 3, 1),
    ]
    for y, hw, _ in cone:
        # outline left/right
        g.set(cx - hw - 1, y, "o")
        g.set(cx + hw + 1, y, "o")
        # highlight on left edge
        g.set(cx - hw, y, "r")
        # fill
        for x in range(cx - hw + 1, cx + hw):
            g.set(x, y, "R")
        # last fill pixel on right stays R (shadow side would be Dk but keep simple)
    # Brim — widest part of hat. y=6-7.
    brim_hw = 8  # half-width 8 -> total 17px (cols 4..20)
    for y in (6, 7):
        g.set(cx - brim_hw - 1, y, "o")
        g.set(cx + brim_hw + 1, y, "o")
        g.set(cx - brim_hw, y, "r")  # highlight left edge
        for x in range(cx - brim_hw + 1, cx + brim_hw):
            g.set(x, y, "R")
        # gold band at y=7 (under-side of brim)
        if y == 7:
            for x in range(cx - 6, cx + 6):
                g.set(x, y, "G")
            g.set(cx - 6, y, "o"); g.set(cx + 5, y, "o")
            # buckle center
            g.set(cx - 1, y, "Y"); g.set(cx, y, "Y")
    # Gold band continues just under brim at y=8 (hat base around face)
    g.hline(cx - 5, cx + 4, 8, "G")
    g.set(cx - 6, 8, "o"); g.set(cx + 5, 8, "o")


def _wiz_face(g: Grid, blink: bool = False):
    """Face + beard. Face is bone; eyes are dark; beard flows bone/boneHi."""
    cx = 12
    # Face row y=9 (between gold band and beard)
    g.hline(cx - 3, cx + 2, 9, "b")
    g.set(cx - 4, 9, "o"); g.set(cx + 3, 9, "o")
    g.set(cx - 3, 9, "H")  # highlight
    # Eyes (y=9, looking right toward action)
    if blink:
        g.set(cx - 2, 9, "I"); g.set(cx - 1, 9, "I")  # closed eye (line)
        g.set(cx + 1, 9, "I"); g.set(cx + 2, 9, "I")
    else:
        g.set(cx - 2, 9, "i")  # left eye (dark)
        g.set(cx + 1, 9, "i")  # right eye
    # Beard starts y=10, flows to y=19. Widens slightly.
    beard = [
        (10, 3), (11, 4), (12, 4), (13, 5), (14, 5), (15, 5),
        (16, 4), (17, 4), (18, 3), (19, 2),
    ]
    for y, hw in beard:
        g.set(cx - hw - 1, y, "o")
        g.set(cx + hw, y, "o")
        g.set(cx - hw, y, "H")  # left rim highlight
        for x in range(cx - hw + 1, cx + hw):
            g.set(x, y, "b")
        # shade lower-right edge
        g.set(cx + hw - 1, y, "s")


def _wiz_robe(g: Grid, flare: int = 0):
    """Royal-blue robe widening to a flared hem. flare>0 = wider hem (cast pose)."""
    cx = 12
    # Shoulders y=12 (just under beard overlap)
    g.hline(cx - 4, cx + 3, 12, "R")
    g.set(cx - 5, 12, "o"); g.set(cx + 4, 12, "o")
    g.set(cx - 4, 12, "r")
    # Body y=13..24 — gradual widening
    body = [
        (13, 5), (14, 5), (15, 5), (16, 6), (17, 6), (18, 6),
        (19, 6), (20, 7), (21, 7), (22, 7), (23, 7), (24, 7),
    ]
    for y, hw in body:
        g.set(cx - hw - 1, y, "o")
        g.set(cx + hw, y, "o")
        g.set(cx - hw, y, "r")  # left highlight
        for x in range(cx - hw + 1, cx + hw):
            g.set(x, y, "R")
        g.set(cx + hw - 1, y, "I")  # right shadow (inkHi)
    # Hem y=25..31 — widest, flared
    hem_hw = 8 + flare
    for y in range(25, 32):
        hw = hem_hw if y >= 27 else hem_hw - 1
        g.set(cx - hw - 1, y, "o")
        g.set(cx + hw, y, "o")
        g.set(cx - hw, y, "r")
        for x in range(cx - hw + 1, cx + hw):
            g.set(x, y, "R")
        g.set(cx + hw - 1, y, "I")
    # Gold trim along hem (y=31)
    g.hline(cx - hem_hw, cx + hem_hw - 1, 31, "G")


def _wiz_staff(g: Grid, raised: bool = False):
    """Wooden staff (stoneLight) with glowing gold orb at top.
    raised=False: staff vertical on right side, orb at y=5.
    raised=True: staff tilted forward (orb moves up-right to y=2, x=20)."""
    if raised:
        # Tilted staff: shaft from (18,28) up to (20,3), orb at (20-21, 2-3)
        shaft = [(18, 28), (18, 27), (18, 26), (19, 25), (19, 24), (19, 23),
                 (19, 22), (19, 21), (20, 20), (20, 19), (20, 18), (20, 17),
                 (20, 16), (20, 15), (20, 14), (20, 13), (20, 12), (20, 11),
                 (20, 10), (20, 9), (20, 8), (20, 7), (20, 6), (20, 5), (20, 4)]
        for x, y in shaft:
            g.set(x, y, "L")
            g.set(x + 1, y, "o")  # right outline
        # Orb at top — bright (cast pose: goldHi core + ember glow)
        g.set(20, 2, "Y"); g.set(21, 2, "Y")
        g.set(20, 3, "Y"); g.set(21, 3, "G")
        g.set(19, 2, "G"); g.set(22, 3, "G")
        # Sparkles around orb
        g.set(18, 1, "k"); g.set(23, 2, "k"); g.set(22, 4, "k")
        # Orb glow halo
        g.set(19, 3, "e")
    else:
        # Vertical staff at x=18-19, from y=30 (hem) up to y=5 (orb)
        for y in range(6, 31):
            g.set(18, y, "L")
            g.set(19, y, "o")  # right outline of shaft
        g.set(17, 6, "o")  # left outline top
        # Orb at y=4-5
        g.set(18, 4, "G"); g.set(19, 4, "G")
        g.set(18, 5, "Y"); g.set(19, 5, "G")
        g.set(17, 4, "G"); g.set(20, 5, "G")
        g.set(17, 5, "e"); g.set(20, 4, "e")
        # Tiny sparkle
        g.set(21, 3, "k")


def build_wiz(frame: int) -> Grid:
    """frame 0 = idle_a (upright), 1 = idle_b (breathing, hat lean + hem wobble),
    2 = cast_1 (staff raised forward, robe flares, orb glows)."""
    g = Grid(WIZ_W, WIZ_H)
    if frame == 0:
        _wiz_hat(g, lean=0)
        _wiz_face(g, blink=False)
        _wiz_robe(g, flare=0)
        _wiz_staff(g, raised=False)
    elif frame == 1:
        # idle_b: hat tip leans right 1px, beard juts 1px right, hem wobbles.
        # NOT a vertical translate — distinct redrawn parts.
        _wiz_hat(g, lean=1)
        _wiz_face(g, blink=True)  # subtle eye change
        _wiz_robe(g, flare=0)
        # Hem wobble: add a 1px notch on the left side at y=30
        g.set(3, 30, "."); g.set(4, 30, ".")
        g.set(3, 29, "o")
        _wiz_staff(g, raised=False)
        # Staff shifts 1px right (breathing sway)
        # (leave as-is — the hat lean already differentiates)
    else:  # frame 2 = cast
        _wiz_hat(g, lean=-1)  # leans slightly back (left)
        _wiz_face(g, blink=False)
        _wiz_robe(g, flare=2)  # robe flares wider
        _wiz_staff(g, raised=True)  # staff raised forward, orb glows
        # Add casting particle at staff tip (already added in _wiz_staff raised)
    return g


# ===========================================================================
# Render + save wizard frames + sheet + preview
# ===========================================================================
def gen_wizard():
    frames = [build_wiz(i) for i in range(3)]
    names = ["wiz_idle_a", "wiz_idle_b", "wiz_cast_1"]
    paths = []
    for name, grid in zip(names, frames):
        img = render_grid(grid)
        p = os.path.join(WIZ_DIR, name + ".png")
        save_frame(img, p)
        paths.append(p)
        # 8x preview on checker
        prev = frame_on_checker(grid, 8)
        prev.save(os.path.join(WIZ_DIR, name + "_preview.png"))
    # Contact sheet (3 frames side by side, 8x, on checker)
    cs_w = WIZ_W * 3 * 8 + 16 * 2  # 8px gaps
    cs_h = WIZ_H * 8 + 16
    cs = Image.new("RGBA", (cs_w, cs_h), (30, 30, 34, 255))
    for i, grid in enumerate(frames):
        big = enlarge(render_grid(grid), 8)
        cs.alpha_composite(big, (i * (WIZ_W * 8 + 16) + 8, 8))
    cs.save(os.path.join(WIZ_DIR, "wiz_contact_sheet.png"))
    print(f"[wizard] {len(frames)} frames -> {paths}")
    print(f"[wizard] contact sheet -> {os.path.join(WIZ_DIR, 'wiz_contact_sheet.png')}")
    return frames


# (main block moved to end of file)


# ===========================================================================
# GOBLIN JETPACK — 24x24, 16 frames (4 enter + 4 idle + 3 attack + 5 death)
# Reference: lime-green skin, large round head, big ears, aviator goggles,
# jetpack on back with flame trail below.
# ===========================================================================
GOB_W, GOB_H = 24, 24


def _goblin_head(g: Grid, cy: int, ear_out: bool = False, goggle_glow: bool = False):
    """Draw goblin head: green disc + ears + goggles. cy = head center y."""
    cx = 12
    # Head disc (radius 5), green with highlight upper-left
    for y in range(-5, 6):
        for x in range(-5, 6):
            if x * x + y * y <= 25:
                px, py = cx + x, cy + y
                d2 = x * x + y * y
                if x <= -3 and y <= -2:
                    g.set(px, py, "q")  # highlight upper-left
                elif x >= 3 and y >= 2:
                    g.set(px, py, "I")  # shadow lower-right (inkHi)
                else:
                    g.set(px, py, "Q")
    # Ears: pointed, sticking out left/right at y=cy-1..cy+1
    ear_y = cy - 1
    # left ear
    g.set(4, ear_y, "o"); g.set(5, ear_y, "Q"); g.set(6, ear_y, "q")
    g.set(5, ear_y + 1, "Q")
    if ear_out:
        g.set(3, ear_y, "Q"); g.set(4, ear_y - 1, "Q")
    # right ear
    g.set(19, ear_y, "o"); g.set(18, ear_y, "Q"); g.set(17, ear_y, "Q")
    g.set(18, ear_y + 1, "Q")
    if ear_out:
        g.set(20, ear_y, "Q"); g.set(19, ear_y - 1, "Q")
    # Goggles: dark band across eyes (y = cy-1, cy)
    gy = cy - 1
    for x in range(8, 17):
        g.set(x, gy, "o")
        g.set(x, gy + 1, "i")
    # goggle lens highlights (2 lenses)
    g.set(9, gy + 1, "k")  # left lens glint (fxSpark)
    g.set(15, gy + 1, "k")  # right lens glint
    if goggle_glow:
        g.set(9, gy, "k"); g.set(15, gy, "k")
    # goggle frame separator
    g.set(12, gy, "o"); g.set(12, gy + 1, "o")
    # nose/mouth hint
    g.set(cx, cy + 2, "i")  # nose
    g.set(cx - 1, cy + 3, "i"); g.set(cx, cy + 3, "i"); g.set(cx + 1, cy + 3, "i")  # mouth


def _goblin_body(g: Grid, top_y: int, lean: int = 0):
    """Draw green torso + jetpack silhouette. top_y = top of torso."""
    cx = 12 + lean
    # Torso: rounded rect, y=top_y..top_y+5
    for y in range(top_y, top_y + 6):
        hw = 4 if y < top_y + 1 else 5
        g.set(cx - hw - 1, y, "o")
        g.set(cx + hw, y, "o")
        g.set(cx - hw, y, "q")
        for x in range(cx - hw + 1, cx + hw):
            g.set(x, y, "Q")
        g.set(cx + hw - 1, y, "I")
    # Jetpack: visible behind torso, sticking out at sides (cols 5-6 and 18-19)
    jp_top = top_y - 1
    jp_bot = top_y + 4
    for y in range(jp_top, jp_bot + 1):
        # left tank
        g.set(5, y, "o"); g.set(6, y, "e")  # ember = bronze tank
        if y == jp_top:
            g.set(6, y, "E")
        # right tank
        g.set(18, y, "o"); g.set(17, y, "e")
        if y == jp_top:
            g.set(17, y, "E")
    # jetpack nozzle (below tanks, where flame starts)
    for y in range(jp_bot + 1, jp_bot + 2):
        g.set(6, y, "L"); g.set(17, y, "L")
    # arms (lean forward = arms out front)
    if lean != 0:
        # arm reaching forward
        g.set(cx + 5, top_y + 1, "Q"); g.set(cx + 6, top_y + 1, "Q")
        g.set(cx + 5, top_y + 2, "Q")
    # legs (dangling)
    leg_y = top_y + 6
    for y in range(leg_y, leg_y + 3):
        g.set(cx - 2, y, "Q"); g.set(cx - 1, y, "Q")
        g.set(cx + 1, y, "Q"); g.set(cx + 2, y, "Q")
        g.set(cx - 3, y, "o"); g.set(cx + 3, y, "o")


def _goblin_flame(g: Grid, top_y: int, intensity: int = 2):
    """Draw flame trail below jetpack. intensity 0..3 (0=tiny, 3=huge)."""
    # Flame at cols 6 and 17 (under the nozzles), spans down from top_y
    # Use ember (e), emberHi (E), goldHi (Y) for the core
    heights = {
        0: 1,   # tiny — just a flicker
        1: 2,   # small
        2: 3,   # normal
        3: 5,   # huge (enter/attack)
    }
    h = heights.get(intensity, 2)
    for col_x, side in [(6, -1), (17, 1)]:
        for i in range(h):
            y = top_y + i
            if y >= 24:
                break
            # Outer flame (ember), inner (emberHi), core (goldHi)
            if i == 0:
                g.set(col_x, y, "E")
            elif i == 1:
                g.set(col_x, y, "e"); g.set(col_x - 1, y, "e") if side < 0 else g.set(col_x + 1, y, "e")
            elif i == h - 1:
                g.set(col_x, y, "e")  # tail tip
            else:
                g.set(col_x, y, "Y"); g.set(col_x - 1, y, "e") if side < 0 else g.set(col_x + 1, y, "e")
        # flame outline at bottom tip
        if h > 1:
            g.set(col_x, top_y + h - 1, "o") if top_y + h - 1 < 24 else None


def build_goblin(state: str, frame: int) -> Grid:
    """Build one goblin frame. state in {enter, idle, attack, death}."""
    g = Grid(GOB_W, GOB_H)

    if state == "enter":
        # 4 frames: fly in from above. Body descends + grows; flame big.
        # frame 0: high up (y_offset -6), small flame, no body yet
        # frame 3: landed position, flame settling
        y_off = [-6, -3, -1, 0][frame]
        head_cy = 8 + y_off
        body_top = 14 + y_off
        flame_intensity = [3, 3, 2, 2][frame]
        if y_off < -3:
            # mostly flame + small head
            _goblin_flame(g, top_y=body_top + 2, intensity=flame_intensity)
            _goblin_head(g, cy=head_cy, ear_out=True)
        else:
            _goblin_head(g, cy=head_cy, ear_out=(frame < 2))
            _goblin_body(g, top_y=body_top)
            _goblin_flame(g, top_y=body_top + 9, intensity=flame_intensity)

    elif state == "idle":
        # 4 frames: bob up/down, flame flicker, ears wiggle.
        # frame 0: neutral (cy=8), flame 2
        # frame 1: up 1px (cy=7), flame 1
        # frame 2: neutral (cy=8), flame 2
        # frame 3: down 1px (cy=9), flame 3 (flame surges to stay aloft)
        bobs = [-1, 0, 1, 0]
        flames = [1, 2, 3, 2]
        ear_wiggle = [False, True, False, True]
        y_off = bobs[frame]
        head_cy = 8 + y_off
        body_top = 14 + y_off
        _goblin_head(g, cy=head_cy, ear_out=ear_wiggle[frame])
        _goblin_body(g, top_y=body_top)
        _goblin_flame(g, top_y=body_top + 9, intensity=flames[frame])

    elif state == "attack":
        # 3 frames: lean forward, flame surge, lunge.
        # frame 0: wind back (lean=-1)
        # frame 1: thrust forward (lean=+2, flame=3)
        # frame 2: follow through (lean=+1, flame=2)
        leans = [-1, 2, 1]
        flames = [2, 3, 2]
        glows = [False, True, False]
        head_cy = 8
        body_top = 14
        _goblin_head(g, cy=head_cy, ear_out=True, goggle_glow=glows[frame])
        _goblin_body(g, top_y=body_top, lean=leans[frame])
        _goblin_flame(g, top_y=body_top + 9, intensity=flames[frame])

    elif state == "death":
        # 5 frames: tumble, flame dies, break apart, fade.
        # frame 0: flame out (smoke), body intact
        # frame 1: body tilts, head separates
        # frame 2: pieces scatter
        # frame 3: more scatter, fade
        # frame 4: remnants (few pixels)
        if frame == 0:
            # flame dies (small smoke puff), body intact, leaning
            _goblin_head(g, cy=8, ear_out=False)
            _goblin_body(g, top_y=14, lean=1)
            # smoke instead of flame
            for col_x in [6, 17]:
                g.set(col_x, 23, "s"); g.set(col_x - 1, 22, "s")
        elif frame == 1:
            # body tilts right, head lifts off
            _goblin_head(g, cy=7, ear_out=True)
            _goblin_body(g, top_y=13, lean=2)
            # single smoke puff
            g.set(8, 23, "s"); g.set(16, 22, "s")
        elif frame == 2:
            # pieces scatter: head upper-right, body lower-left
            # head fragment
            for y in range(3):
                for x in range(3):
                    g.set(16 + x, 2 + y, "Q")
            g.set(15, 2, "o"); g.set(19, 4, "o")
            # body fragment
            for y in range(3):
                for x in range(4):
                    g.set(3 + x, 14 + y, "Q")
            g.set(2, 14, "o"); g.set(7, 16, "o")
            # jetpack fragment
            g.set(11, 9, "e"); g.set(12, 9, "e"); g.set(13, 9, "e")
        elif frame == 3:
            # more scatter, fewer pixels
            g.set(18, 1, "Q"); g.set(19, 2, "Q")
            g.set(2, 16, "Q"); g.set(3, 17, "Q")
            g.set(12, 10, "e"); g.set(13, 11, "e")
            g.set(7, 6, "o"); g.set(16, 18, "o")
        else:  # frame 4
            # remnants — a few fading pixels
            g.set(19, 0, "s"); g.set(2, 19, "s")
            g.set(12, 11, "s")
    return g


def gen_goblin():
    states = [("enter", 4), ("idle", 4), ("attack", 3), ("death", 5)]
    frames = []
    for state, count in states:
        for i in range(count):
            frames.append(build_goblin(state, i))
    # save individual frames
    names = [f"goblin_jetpack_{i:02d}" for i in range(len(frames))]
    for name, grid in zip(names, frames):
        save_frame(render_grid(grid), os.path.join(ENM_DIR, name + ".png"))
    # assemble sheet (384x24)
    sheet_path = os.path.join(ENM_DIR, "goblin_jetpack_sheet.png")
    assemble_sheet(frames, GOB_W, GOB_H, sheet_path)
    print(f"[goblin] {len(frames)} frames -> {sheet_path} ({GOB_W * len(frames)}x{GOB_H})")
    return frames


# (no main block here — the final main block at end-of-file runs everything)


# ===========================================================================
# SLIME FLYER — 24x24, 13 frames (3 enter + 3 idle + 3 attack + 4 death)
# Reference: orange-red circular blob, angry face, yellow core, small flames.
# ===========================================================================
SLM_W, SLM_H = 24, 24


def _slime_body(g: Grid, cx: int, cy: int, rx: int, ry: int, squish: int = 0):
    """Draw slime body: ember ellipse with lighter core, boneHi rim, outline.
    squish: 0=normal, +N = wider/shorter, -N = narrower/taller."""
    rx = rx + squish
    ry = ry - squish
    # outline + fill (ellipse)
    for y in range(-ry, ry + 1):
        for x in range(-rx, rx + 1):
            if (x * x) * ry * ry + (y * y) * rx * rx <= rx * rx * ry * ry:
                px, py = cx + x, cy + y
                d2n = (x * x) * ry * ry + (y * y) * rx * rx
                edge2 = rx * rx * ry * ry
                if d2n >= edge2 * 0.78:  # outer ring
                    g.set(px, py, "o")
                elif d2n >= edge2 * 0.55:  # shade lower-right
                    if x >= 0 and y >= 0:
                        g.set(px, py, "e")  # ember (darker outer)
                    else:
                        g.set(px, py, "E")  # emberHi (lighter inner ring)
                elif d2n <= edge2 * 0.22:  # core
                    g.set(px, py, "Y")  # goldHi (bright core)
                else:
                    g.set(px, py, "E")  # emberHi (mid)
    # rim highlight upper-left
    g.set(cx - rx + 1, cy - ry + 1, "H")
    g.set(cx - rx, cy - ry + 1, "H")


def _slime_face(g: Grid, cx: int, cy: int, angry: bool = True, mouth_open: bool = False):
    """Angry eyes + zigzag mouth."""
    eye_y = cy - 2
    # angry eyebrows (slanted)
    g.set(cx - 4, eye_y - 1, "i"); g.set(cx - 3, eye_y - 1, "i")
    g.set(cx + 3, eye_y - 1, "i"); g.set(cx + 4, eye_y - 1, "i")
    # eyes
    g.set(cx - 3, eye_y, "i"); g.set(cx + 3, eye_y, "i")
    # mouth
    my = cy + 2
    if mouth_open:
        # wide open mouth (attack)
        for x in range(cx - 3, cx + 4):
            g.set(x, my, "i")
            g.set(x, my + 1, "i")
        g.set(cx - 4, my, "o"); g.set(cx + 4, my, "o")
    else:
        # zigzag mouth
        g.set(cx - 3, my, "i"); g.set(cx - 2, my + 1, "i")
        g.set(cx - 1, my, "i"); g.set(cx, my + 1, "i")
        g.set(cx + 1, my, "i"); g.set(cx + 2, my + 1, "i")
        g.set(cx + 3, my, "i")


def _slime_flames(g: Grid, cy_bot: int, intensity: int = 1):
    """Small flame propulsion below the slime. intensity 0..2."""
    if intensity == 0:
        return
    cols = [10, 12, 14]
    h = intensity * 2
    for col_x in cols:
        for i in range(h):
            y = cy_bot + 1 + i
            if y >= 24:
                break
            if i == 0:
                g.set(col_x, y, "Y")
            elif i == h - 1:
                g.set(col_x, y, "e")
            else:
                g.set(col_x, y, "E")


def build_slime(state: str, frame: int) -> Grid:
    g = Grid(SLM_W, SLM_H)
    cx, cy = 12, 10
    if state == "enter":
        # 3 frames: drop from top, stretch tall then squish wide.
        # frame 0: tall + thin, high up
        # frame 1: mid position, normal
        # frame 2: squished wide (landed)
        if frame == 0:
            _slime_body(g, cx, cy - 5, rx=5, ry=7)  # tall thin
            _slime_face(g, cx, cy - 5)
        elif frame == 1:
            _slime_body(g, cx, cy - 2, rx=6, ry=6)
            _slime_face(g, cx, cy - 2)
        else:
            _slime_body(g, cx, cy + 1, rx=8, ry=5, squish=1)  # squished
            _slime_face(g, cx, cy + 1)
            _slime_flames(g, cy + 6, 1)
    elif state == "idle":
        # 3 frames: jiggle (squish/stretch cycle).
        squishes = [0, 1, -1]
        ys = [0, 1, -1]
        for i, (sq, yo) in enumerate(zip(squishes, ys)):
            if i == frame:
                _slime_body(g, cx, cy + yo, rx=7, ry=6, squish=sq)
                _slime_face(g, cx, cy + yo)
                _slime_flames(g, cy + yo + 6, 1)
                break
    elif state == "attack":
        # 3 frames: wind down (squish), lunge forward (mouth open), recover.
        if frame == 0:
            _slime_body(g, cx, cy + 2, rx=8, ry=4, squish=2)  # squished down
            _slime_face(g, cx, cy + 2)
            _slime_flames(g, cy + 6, 2)  # flame surge
        elif frame == 1:
            # lunge forward: body shifts right + taller + mouth open
            _slime_body(g, cx + 2, cy, rx=6, ry=7, squish=-1)  # stretched forward
            _slime_face(g, cx + 2, cy, mouth_open=True)
            _slime_flames(g, cy + 7, 2)
        else:
            _slime_body(g, cx + 1, cy, rx=7, ry=6)
            _slime_face(g, cx + 1, cy)
            _slime_flames(g, cy + 6, 1)
    elif state == "death":
        # 4 frames: distend, split into droplets, fly out, splatter.
        if frame == 0:
            # body distends (wider, jagged)
            _slime_body(g, cx, cy + 1, rx=9, ry=5, squish=2)
            _slime_face(g, cx, cy + 1, mouth_open=True)
        elif frame == 1:
            # split into 4 droplets
            for dx, dy, r in [(-5, -2, 3), (5, -2, 3), (-4, 3, 2), (4, 3, 2)]:
                _slime_body(g, cx + dx, cy + dy, rx=r, ry=r)
            # central burst
            g.set(cx, cy, "Y"); g.set(cx - 1, cy, "E"); g.set(cx + 1, cy, "E")
        elif frame == 2:
            # droplets fly outward
            for dx, dy, r in [(-8, -4, 2), (8, -4, 2), (-7, 4, 2), (7, 4, 2),
                              (0, -5, 2)]:
                _slime_body(g, cx + dx, cy + dy, rx=r, ry=r)
        else:
            # tiny splatter remnants
            for px, py in [(2, 4), (4, 18), (20, 5), (18, 19), (12, 11)]:
                g.set(px, py, "e"); g.set(px + 1, py, "E")
            g.set(3, 11, "Y"); g.set(20, 12, "Y")
    return g


def gen_slime():
    states = [("enter", 3), ("idle", 3), ("attack", 3), ("death", 4)]
    frames = []
    for state, count in states:
        for i in range(count):
            frames.append(build_slime(state, i))
    names = [f"slime_flyer_{i:02d}" for i in range(len(frames))]
    for name, grid in zip(names, frames):
        save_frame(render_grid(grid), os.path.join(ENM_DIR, name + ".png"))
    sheet_path = os.path.join(ENM_DIR, "slime_flyer_sheet.png")
    assemble_sheet(frames, SLM_W, SLM_H, sheet_path)
    print(f"[slime] {len(frames)} frames -> {sheet_path} ({SLM_W * len(frames)}x{SLM_H})")
    return frames


# ===========================================================================
# SKELETON WRAITH — 24x24, 13 frames (3 enter + 3 idle + 3 attack + 4 death)
# Reference: skull head, deep purple cloak, ghostly tail (no legs), red eyes.
# ===========================================================================
WRH_W, WRH_H = 24, 24


def _wraith_skull(g: Grid, cx: int, top_y: int, eye_glow: bool = False):
    """Skull: bone cranium + dark eye sockets (red glow if eye_glow)."""
    # cranium: rounded, bone color
    for y in range(top_y, top_y + 6):
        hw = 4 if y >= top_y + 1 else 2 if y == top_y else 3
        if y == top_y:
            g.set(cx, top_y, "H"); g.set(cx - 1, top_y, "b")
            g.set(cx + 1, top_y, "b")
            g.set(cx - 2, top_y, ".")
        else:
            g.set(cx - hw - 1, y, "o"); g.set(cx + hw, y, "o")
            g.set(cx - hw, y, "H")
            for x in range(cx - hw + 1, cx + hw):
                g.set(x, y, "b")
            g.set(cx + hw - 1, y, "s")
    # eye sockets (y = top_y+2, +3)
    ey = top_y + 2
    for ex in [cx - 2, cx + 1]:
        g.set(ex, ey, "i"); g.set(ex + 1, ey, "i")
        g.set(ex, ey + 1, "i"); g.set(ex + 1, ey + 1, "i")
        if eye_glow:
            g.set(ex, ey, "e"); g.set(ex + 1, ey, "e")
    # nose (small dark triangle)
    g.set(cx, top_y + 4, "i")
    # teeth (y = top_y+5)
    for x in range(cx - 3, cx + 4):
        g.set(x, top_y + 5, "b")
    g.set(cx - 4, top_y + 5, "o"); g.set(cx + 4, top_y + 5, "o")
    # teeth gaps
    g.set(cx - 1, top_y + 5, "i"); g.set(cx + 1, top_y + 5, "i")


def _wraith_cloak(g: Grid, cx: int, top_y: int, tail_sway: int = 0, flare: int = 0):
    """Purple cloak + ghost tail. tail_sway: -1 left, 0 neutral, +1 right.
    flare > 0 = wider cloak (attack wind-up)."""
    # Cloak shoulders (y=top_y..top_y+3)
    for y in range(top_y, top_y + 4):
        hw = 5 + flare if y >= top_y + 1 else 4
        g.set(cx - hw - 1, y, "o"); g.set(cx + hw, y, "o")
        g.set(cx - hw, y, "p")  # shadowHi highlight left
        for x in range(cx - hw + 1, cx + hw):
            g.set(x, y, "P")
        g.set(cx + hw - 1, y, "I")  # dark shadow right
    # Body taper (y=top_y+4..top_y+8)
    for y in range(top_y + 4, top_y + 9):
        hw = max(2, 5 - (y - top_y - 4))
        g.set(cx - hw - 1, y, "o"); g.set(cx + hw, y, "o")
        g.set(cx - hw, y, "p")
        for x in range(cx - hw + 1, cx + hw):
            g.set(x, y, "P")
    # Ghost tail (y=top_y+9..23): wavy, tapers
    tail_top = top_y + 9
    for y in range(tail_top, 24):
        # wave the tail
        wave = tail_sway * 2 if y >= tail_top + 2 else 0
        if y >= tail_top + 4:
            wave = tail_sway * 3
        hw = max(0, 4 - (y - tail_top) // 2)
        cx_w = cx + wave
        if hw > 0:
            g.set(cx_w - hw - 1, y, "o"); g.set(cx_w + hw, y, "o")
            g.set(cx_w - hw, y, "p")
            for x in range(cx_w - hw + 1, cx_w + hw):
                g.set(x, y, "P")
        else:
            # tail tip
            g.set(cx_w, y, "P"); g.set(cx_w - 1, y, "p")
    # tattered cloak edges (a few pixel notches)
    g.set(cx - 6, top_y + 5, ".")
    g.set(cx + 6, top_y + 6, ".")


def build_wraith(state: str, frame: int) -> Grid:
    g = Grid(WRH_W, WRH_H)
    cx = 12
    skull_top = 1
    cloak_top = 7
    if state == "enter":
        # 3 frames: materialize. Few pixels -> half -> full.
        if frame == 0:
            # faint outline only (sparse pixels)
            _wraith_skull(g, cx, skull_top)
            # cloak as faint outline
            for y in range(cloak_top, cloak_top + 6):
                g.set(cx - 4, y, "P"); g.set(cx + 4, y, "P")
                g.set(cx, y, "P")
        elif frame == 1:
            # half-formed (skull + partial cloak)
            _wraith_skull(g, cx, skull_top)
            _wraith_cloak(g, cx, cloak_top, tail_sway=0)
            # erase lower tail (still forming)
            for y in range(20, 24):
                for x in range(24):
                    g.set(x, y, ".")
        else:
            # fully formed
            _wraith_skull(g, cx, skull_top, eye_glow=False)
            _wraith_cloak(g, cx, cloak_top, tail_sway=0)
    elif state == "idle":
        # 3 frames: float, tail sways left/neutral/right.
        sways = [-1, 0, 1]
        yos = [-1, 0, -1]  # subtle float
        _wraith_skull(g, cx, skull_top + yos[frame])
        _wraith_cloak(g, cx, cloak_top + yos[frame], tail_sway=sways[frame])
    elif state == "attack":
        # 3 frames: wind up (cloak back), arms reach forward (eyes glow), recoil.
        if frame == 0:
            _wraith_skull(g, cx, skull_top)
            _wraith_cloak(g, cx, cloak_top, flare=1)  # cloak flares
        elif frame == 1:
            # arms reach forward: bony arms extend from sides toward viewer
            _wraith_skull(g, cx, skull_top, eye_glow=True)  # eyes glow
            _wraith_cloak(g, cx, cloak_top, flare=2)
            # bony arm reaching right (toward action)
            for x in range(cx + 5, cx + 9):
                g.set(x, cloak_top + 1, "b"); g.set(x, cloak_top + 2, "b")
            g.set(cx + 9, cloak_top + 1, "o")
            # claw
            g.set(cx + 9, cloak_top, "b"); g.set(cx + 10, cloak_top + 1, "b")
        else:
            # recoil
            _wraith_skull(g, cx, skull_top, eye_glow=False)
            _wraith_cloak(g, cx, cloak_top)
    elif state == "death":
        # 4 frames: cloak tears, skull separates, scatter, mist.
        if frame == 0:
            # cloak tears (jagged bottom)
            _wraith_skull(g, cx, skull_top)
            _wraith_cloak(g, cx, cloak_top, tail_sway=0)
            # tear the tail
            for y in range(18, 24):
                g.set(cx - 2, y, "."); g.set(cx + 2, y, ".")
        elif frame == 1:
            # skull separates upward
            _wraith_skull(g, cx, skull_top - 2)
            # cloak collapses
            for y in range(cloak_top, cloak_top + 6):
                hw = 4 - (y - cloak_top) // 2
                for x in range(cx - hw, cx + hw):
                    g.set(x, y, "P")
            # skull outline fragment
            g.set(cx - 3, cloak_top, "b"); g.set(cx + 3, cloak_top, "b")
        elif frame == 2:
            # bones scatter
            # skull piece upper-right
            for x in range(3):
                for y in range(3):
                    g.set(cx + 6 + x, 2 + y, "b")
            # cloak fragments
            g.set(cx - 5, 14, "P"); g.set(cx - 4, 15, "P")
            g.set(cx + 4, 16, "P"); g.set(cx + 5, 17, "P")
            g.set(cx, 19, "P"); g.set(cx + 1, 20, "P")
            # a bone
            g.set(cx - 3, 12, "b"); g.set(cx - 2, 12, "b")
        else:
            # faint mist remnants
            g.set(cx + 7, 1, "s"); g.set(cx + 8, 2, "s")
            g.set(cx - 5, 13, "s"); g.set(cx + 5, 17, "s")
            g.set(cx, 19, "s"); g.set(cx + 1, 20, "s")
            g.set(cx - 2, 11, "s")
    return g


def gen_wraith():
    states = [("enter", 3), ("idle", 3), ("attack", 3), ("death", 4)]
    frames = []
    for state, count in states:
        for i in range(count):
            frames.append(build_wraith(state, i))
    names = [f"skeleton_wraith_{i:02d}" for i in range(len(frames))]
    for name, grid in zip(names, frames):
        save_frame(render_grid(grid), os.path.join(ENM_DIR, name + ".png"))
    sheet_path = os.path.join(ENM_DIR, "skeleton_wraith_sheet.png")
    assemble_sheet(frames, WRH_W, WRH_H, sheet_path)
    print(f"[wraith] {len(frames)} frames -> {sheet_path} ({WRH_W * len(frames)}x{WRH_H})")
    return frames


# ===========================================================================
# SHADOW BAT — 24x24, 14 frames (3 enter + 4 idle + 3 attack + 4 death)
# Reference: deep purple body, huge bat wings spread wide, large triangular ears.
# ===========================================================================
BAT_W, BAT_H = 24, 24


def _bat_body(g: Grid, cx: int, cy: int, ear_state: int = 0):
    """Small purple body + large triangular ears. ear_state 0=up,1=back."""
    # body: small ellipse
    for y in range(-3, 4):
        for x in range(-3, 4):
            if (x * x) * 9 + (y * y) * 9 <= 36:
                px, py = cx + x, cy + y
                if x <= -1 and y <= 0:
                    g.set(px, py, "p")  # highlight
                elif x >= 1 and y >= 1:
                    g.set(px, py, "I")  # shadow
                else:
                    g.set(px, py, "P")
    # outline around body
    g.set(cx - 4, cy, "o"); g.set(cx + 4, cy, "o")
    g.set(cx - 3, cy - 4, "o"); g.set(cx + 3, cy - 4, "o")
    g.set(cx - 3, cy + 4, "o"); g.set(cx + 3, cy + 4, "o")
    # ears: large triangular, top of head
    ear_top_y = cy - 6
    # left ear (triangle pointing up)
    if ear_state == 0:
        g.set(cx - 3, ear_top_y, "P"); g.set(cx - 2, ear_top_y, "p")
        g.set(cx - 4, ear_top_y + 1, "o"); g.set(cx - 3, ear_top_y + 1, "P")
        g.set(cx - 2, ear_top_y + 1, "P"); g.set(cx - 1, ear_top_y + 1, "P")
        g.set(cx - 5, ear_top_y + 2, "o"); g.set(cx - 4, ear_top_y + 2, "P")
        g.set(cx - 3, ear_top_y + 2, "P"); g.set(cx - 2, ear_top_y + 2, "P")
        # right ear
        g.set(cx + 2, ear_top_y, "p"); g.set(cx + 3, ear_top_y, "P")
        g.set(cx + 0, ear_top_y + 1, "P"); g.set(cx + 1, ear_top_y + 1, "P")
        g.set(cx + 2, ear_top_y + 1, "P"); g.set(cx + 3, ear_top_y + 1, "P")
        g.set(cx + 4, ear_top_y + 1, "o")
        g.set(cx + 1, ear_top_y + 2, "P"); g.set(cx + 2, ear_top_y + 2, "P")
        g.set(cx + 3, ear_top_y + 2, "P"); g.set(cx + 4, ear_top_y + 2, "P")
        g.set(cx + 5, ear_top_y + 2, "o")
    else:  # ears back
        g.set(cx - 3, ear_top_y + 1, "P"); g.set(cx - 2, ear_top_y + 1, "P")
        g.set(cx + 2, ear_top_y + 1, "P"); g.set(cx + 3, ear_top_y + 1, "P")
    # eyes (glowing dots)
    g.set(cx - 1, cy - 1, "e"); g.set(cx + 1, cy - 1, "e")
    # fangs
    g.set(cx - 1, cy + 2, "H"); g.set(cx + 1, cy + 2, "H")


def _bat_wing(g: Grid, side: str, cx: int, cy: int, spread: int):
    """Draw one wing. side 'L' or 'R'. spread 0..3 (0=folded, 3=full).
    Wing membrane purple with bone structure (boneShade lines)."""
    dir_x = -1 if side == "L" else 1
    # wing extends from body outward
    # spread determines how far + how many "finger" segments
    if spread == 0:
        # folded: just a small bump at the body side
        x0 = cx + dir_x * 4
        y0 = cy
        g.set(x0, y0 - 1, "P"); g.set(x0, y0, "P"); g.set(x0, y0 + 1, "P")
        g.set(x0 + dir_x, y0, "P")
        g.set(x0 + dir_x * 2, y0 - 1, "o")
        return
    # spread 1..3: draw wing membrane + bones
    reach = 4 + spread * 2  # how far the wing extends
    # wing is a triangular membrane from (cx+dir*4, cy-2) to (cx+dir*reach, cy) to (cx+dir*4, cy+4)
    top_y = cy - 2
    bot_y = cy + 4
    tip_x = cx + dir_x * reach
    # fill membrane (triangle)
    for y in range(top_y, bot_y + 1):
        # interpolate x from body (cx+dir*4) to tip (tip_x) based on y
        t = (y - top_y) / max(1, (bot_y - top_y))
        x_inner = cx + dir_x * 4
        x_outer = tip_x if (y <= cy or y >= cy + 2) else (cx + dir_x * (reach - 1))
        x0, x1 = sorted([x_inner, x_outer])
        for x in range(x0, x1 + 1):
            g.set(x, y, "P")
        # outline top edge
        if y == top_y:
            g.set(x_outer, y, "o")
    # bone structure: 2-3 finger lines from body to wing tip
    n_bones = spread
    for b in range(n_bones):
        bone_y = top_y + 1 + b * 2
        if bone_y > bot_y - 1:
            break
        # bone goes from (cx+dir*4, bone_y) to (tip_x, cy+1)
        steps = reach - 3
        for s in range(steps + 1):
            bx = cx + dir_x * (4 + s)
            by = bone_y + (s * (cy + 1 - bone_y)) // max(1, steps)
            if 0 <= bx < 24 and 0 <= by < 24:
                g.set(bx, by, "s")  # boneShade
    # wing tip outline
    g.set(tip_x, cy, "o")
    g.set(tip_x, cy + 1, "o")


def build_bat(state: str, frame: int) -> Grid:
    g = Grid(BAT_W, BAT_H)
    cx, cy = 12, 12
    if state == "enter":
        # 3 frames: swoop in. folded -> half -> full spread, descending.
        if frame == 0:
            # folded, high up
            _bat_body(g, cx, cy - 5, ear_state=0)
            _bat_wing(g, "L", cx, cy - 5, spread=0)
            _bat_wing(g, "R", cx, cy - 5, spread=0)
        elif frame == 1:
            # half spread, mid
            _bat_body(g, cx, cy - 2, ear_state=0)
            _bat_wing(g, "L", cx, cy - 2, spread=1)
            _bat_wing(g, "R", cx, cy - 2, spread=1)
        else:
            # full spread, arrived
            _bat_body(g, cx, cy, ear_state=0)
            _bat_wing(g, "L", cx, cy, spread=3)
            _bat_wing(g, "R", cx, cy, spread=3)
    elif state == "idle":
        # 4 frames: wing flap. up / mid / down / mid.
        spreads = [3, 2, 1, 2]
        yos = [-1, 0, 1, 0]
        _bat_body(g, cx, cy + yos[frame], ear_state=0)
        _bat_wing(g, "L", cx, cy + yos[frame], spread=spreads[frame])
        _bat_wing(g, "R", cx, cy + yos[frame], spread=spreads[frame])
    elif state == "attack":
        # 3 frames: wind up (wings back), dive forward, recover.
        if frame == 0:
            # wings back (folded), body up
            _bat_body(g, cx, cy - 1, ear_state=1)
            _bat_wing(g, "L", cx, cy - 1, spread=1)
            _bat_wing(g, "R", cx, cy - 1, spread=1)
        elif frame == 1:
            # dive forward: wings full + body forward + mouth open (fangs)
            _bat_body(g, cx + 1, cy, ear_state=0)
            _bat_wing(g, "L", cx + 1, cy, spread=3)
            _bat_wing(g, "R", cx + 1, cy, spread=3)
            # extra fang
            g.set(cx, cy + 3, "H"); g.set(cx + 2, cy + 3, "H")
        else:
            # recover
            _bat_body(g, cx, cy, ear_state=0)
            _bat_wing(g, "L", cx, cy, spread=2)
            _bat_wing(g, "R", cx, cy, spread=2)
    elif state == "death":
        # 4 frames: wings fold, body falls, dissolves, mist.
        if frame == 0:
            # wings folding, body intact
            _bat_body(g, cx, cy, ear_state=1)
            _bat_wing(g, "L", cx, cy, spread=1)
            _bat_wing(g, "R", cx, cy, spread=1)
        elif frame == 1:
            # body falls, wings collapse
            _bat_body(g, cx, cy + 2, ear_state=1)
            # collapsed wing fragments
            g.set(cx - 5, cy + 1, "P"); g.set(cx - 4, cy + 2, "P")
            g.set(cx + 5, cy + 1, "P"); g.set(cx + 4, cy + 2, "P")
            g.set(cx - 6, cy + 3, "o"); g.set(cx + 6, cy + 3, "o")
        elif frame == 2:
            # dissolves into particles
            for px, py, ch in [(5, 14, "P"), (6, 15, "P"), (18, 14, "P"), (17, 15, "P"),
                               (10, 18, "P"), (14, 19, "P"), (12, 16, "P")]:
                g.set(px, py, ch)
            g.set(12, 13, "e")  # fading eye glow
        else:
            # mist remnants
            g.set(5, 15, "s"); g.set(18, 15, "s")
            g.set(11, 18, "s"); g.set(13, 19, "s")
            g.set(12, 14, "s")
    return g


def gen_bat():
    states = [("enter", 3), ("idle", 4), ("attack", 3), ("death", 4)]
    frames = []
    for state, count in states:
        for i in range(count):
            frames.append(build_bat(state, i))
    names = [f"shadow_bat_{i:02d}" for i in range(len(frames))]
    for name, grid in zip(names, frames):
        save_frame(render_grid(grid), os.path.join(ENM_DIR, name + ".png"))
    sheet_path = os.path.join(ENM_DIR, "shadow_bat_sheet.png")
    assemble_sheet(frames, BAT_W, BAT_H, sheet_path)
    print(f"[bat] {len(frames)} frames -> {sheet_path} ({BAT_W * len(frames)}x{BAT_H})")
    return frames


# ===========================================================================
# Combined contact sheet (all characters, all frames, 6x on checker)
# ===========================================================================
def gen_all_contact_sheets():
    """Generate per-enemy contact sheets at 6x + a combined hero contact sheet."""
    all_chars = [
        ("goblin", build_goblin, [("enter",4),("idle",4),("attack",3),("death",5)]),
        ("slime", build_slime, [("enter",3),("idle",3),("attack",3),("death",4)]),
        ("wraith", build_wraith, [("enter",3),("idle",3),("attack",3),("death",4)]),
        ("bat", build_bat, [("enter",3),("idle",4),("attack",3),("death",4)]),
    ]
    for name, builder, states in all_chars:
        frames = []
        for state, count in states:
            for i in range(count):
                frames.append(builder(state, i))
        ncols = 4
        nrows = (len(frames) + ncols - 1) // ncols
        scale = 6
        cw = ch = 24
        gap = 4
        W = ncols * (cw * scale + gap) + gap
        H = nrows * (ch * scale + gap) + gap
        sheet = Image.new("RGBA", (W, H), (30, 30, 34, 255))
        for idx, grid in enumerate(frames):
            big = enlarge(render_grid(grid), scale)
            cbg = checker_bg(big.width, big.height)
            cbg.alpha_composite(big)
            r, c = divmod(idx, ncols)
            x = gap + c * (cw * scale + gap)
            y = gap + r * (ch * scale + gap)
            sheet.alpha_composite(cbg, (x, y))
        sheet.save(os.path.join(QC_DIR, f"{name}_contact_6x.png"))
    # Combined hero contact: wizard (3) + 4 enemies side by side
    wiz = [build_wiz(i) for i in range(3)]
    gob = [build_goblin(s,i) for s,c in [("enter",4),("idle",4),("attack",3),("death",5)] for i in range(c)]
    slm = [build_slime(s,i) for s,c in [("enter",3),("idle",3),("attack",3),("death",4)] for i in range(c)]
    wrh = [build_wraith(s,i) for s,c in [("enter",3),("idle",3),("attack",3),("death",4)] for i in range(c)]
    bat = [build_bat(s,i) for s,c in [("enter",3),("idle",4),("attack",3),("death",4)] for i in range(c)]
    # hero: 5 rows (wizard + 4 enemies), each row = that character's frames
    rows_data = [
        ("WIZARD", wiz, 32),
        ("GOBLIN", gob, 24),
        ("SLIME", slm, 24),
        ("WRAITH", wrh, 24),
        ("BAT", bat, 24),
    ]
    max_cols = max(len(r[1]) for r in rows_data)
    scale = 6
    cw = 24
    gap = 6
    label_w = 60
    W = label_w + max_cols * (cw * scale + gap) + gap
    H = sum(32 * scale + gap for _ in rows_data) + sum(24 * scale + gap for _ in rows_data[1:]) + gap
    # simpler: compute H from rows
    H = gap
    for _, frames, h in rows_data:
        H += h * scale + gap
    hero = Image.new("RGBA", (W, H), (26, 26, 30, 255))
    from PIL import ImageDraw
    draw = ImageDraw.ImageDraw(hero)
    y = gap
    for label, frames, h in rows_data:
        # label
        draw.text((8, y + h * scale // 2 - 6), label, fill=(200, 200, 210, 255))
        for idx, grid in enumerate(frames):
            big = enlarge(render_grid(grid), scale)
            cbg = checker_bg(big.width, big.height)
            cbg.alpha_composite(big)
            hero.alpha_composite(cbg, (label_w + idx * (cw * scale + gap), y))
        y += h * scale + gap
    hero.save(os.path.join(QC_DIR, "all_characters_contact_6x.png"))
    print(f"[qc] contact sheets -> {QC_DIR}/")


if __name__ == "__main__":
    gen_wizard()
    gen_goblin()
    gen_slime()
    gen_wraith()
    gen_bat()
    gen_all_contact_sheets()


# ===========================================================================
# 8x per-character previews + before/after comparison
# ===========================================================================
def gen_8x_previews():
    """One 8x preview image per character showing all frames in a single row."""
    chars = [
        ("wizard", [build_wiz(i) for i in range(3)], 32),
        ("goblin", [build_goblin(s,i) for s,c in [("enter",4),("idle",4),("attack",3),("death",5)] for i in range(c)], 24),
        ("slime", [build_slime(s,i) for s,c in [("enter",3),("idle",3),("attack",3),("death",4)] for i in range(c)], 24),
        ("wraith", [build_wraith(s,i) for s,c in [("enter",3),("idle",3),("attack",3),("death",4)] for i in range(c)], 24),
        ("bat", [build_bat(s,i) for s,c in [("enter",3),("idle",4),("attack",3),("death",4)] for i in range(c)], 24),
    ]
    scale = 8
    gap = 2
    for name, frames, fh in chars:
        n = len(frames)
        W = n * (24 * scale + gap) + gap
        H = fh * scale + gap * 2
        sheet = Image.new("RGBA", (W, H), (30, 30, 34, 255))
        for idx, grid in enumerate(frames):
            big = enlarge(render_grid(grid), scale)
            cbg = checker_bg(big.width, big.height)
            cbg.alpha_composite(big)
            sheet.alpha_composite(cbg, (gap + idx * (24 * scale + gap), gap))
        out = os.path.join(QC_DIR, f"{name}_8x.png")
        sheet.save(out)
        print(f"[8x] {name}: {n} frames -> {out} ({W}x{H})")


def gen_before_after():
    """Side-by-side: reference sheet (left) vs my recreation contact sheet (right)."""
    from PIL import Image as PILImage
    ref_path = os.path.join(PROJECT, "upload", "Pixel Wizard Castle Defense Asset Sheet.png")
    my_contact = os.path.join(QC_DIR, "all_characters_contact_6x.png")
    if not os.path.exists(ref_path) or not os.path.exists(my_contact):
        print("[before/after] missing input, skipping")
        return
    ref = PILImage.open(ref_path).convert("RGBA")
    mine = PILImage.open(my_contact).convert("RGBA")
    # scale reference down to a comparable height (match mine's height)
    target_h = mine.height
    ref_w_new = int(ref.width * target_h / ref.height)
    ref_resized = ref.resize((ref_w_new, target_h), Image.LANCZOS)
    gap = 24
    label_h = 40
    W = ref_resized.width + mine.width + gap * 3
    H = target_h + label_h
    out = Image.new("RGBA", (W, H), (20, 20, 24, 255))
    from PIL import ImageDraw
    draw = ImageDraw.ImageDraw(out)
    draw.text((12, 12), "BEFORE — reference sheet (auto-sliced, damaged)", fill=(220, 180, 180, 255))
    draw.text((ref_resized.width + gap * 2, 12), "AFTER — recreated clean pixel art (this task)", fill=(180, 220, 180, 255))
    out.alpha_composite(ref_resized, (gap, label_h))
    out.alpha_composite(mine, (ref_resized.width + gap * 2, label_h))
    out_path = os.path.join(QC_DIR, "before_after_comparison.png")
    out.save(out_path)
    print(f"[before/after] -> {out_path} ({W}x{H})")


if __name__ == "__main__":
    gen_wizard()
    gen_goblin()
    gen_slime()
    gen_wraith()
    gen_bat()
    gen_all_contact_sheets()
    gen_8x_previews()
    gen_before_after()
    print("\n=== ALL SPRITES GENERATED ===")
