/*
  game/pixelart.ts — bake spritesheets at boot from string-grid pixel maps
  (and procedural drawing for the keep).

  All sprites are registered under FIXED keys (wisp_a, wisp_b, wisp_c, wiz,
  keep, wall, moon, star). Real PNGs can later be loaded under the same keys
  with zero code change — see ART & SFX HOOKUPS in game/tuning.ts.

  REMOVED: slime, bolt, mote. Do not re-add them. Casts are screen-effect-only.

  Local expanded palette (the public PALETTE in tuning.ts stays minimal for
  Text styles; these extra shades are pixel-art-only). Light source is ALWAYS
  upper-left: boneHi rim on upper-left arcs, boneShade on lower-right, 1px
  crisp outline everywhere, zero anti-aliasing.

  char -> color:
    '.' transparent
    'o' outline  #241c18
    'i' ink      #14110f
    'I' inkHi    #2b241e
    'b' bone     #f2e9d8
    'H' boneHi   #fffaf0   (2px rim light on UPPER-LEFT arcs)
    's' boneShade #cfc2a6   (2px shade on LOWER-RIGHT)
    'e' ember    #ff6b35
    'E' emberHi  #ffa76b
    'L' stoneLight #3d342b  (keep mortar / wall shade)
*/

import Phaser from "phaser";

const COL: Record<string, string | null> = {
  ".": null,
  o: "#241c18",
  i: "#14110f",
  I: "#2b241e",
  b: "#f2e9d8",
  H: "#fffaf0",
  s: "#cfc2a6",
  e: "#ff6b35",
  E: "#ffa76b",
  L: "#3d342b",
};

type Frame = string[];

function makeSheet(
  scene: Phaser.Scene,
  key: string,
  frames: Frame[],
  fw: number,
  fh: number,
): void {
  const n = frames.length;
  frames.forEach((rows, fi) =>
    rows.forEach((row, ri) => {
      if (row.length !== fw) {
        throw new Error(
          `[pixelart] ${key} frame ${fi} row ${ri} length ${row.length} != ${fw}`,
        );
      }
    }),
  );
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const ct = scene.textures.createCanvas(key, fw * n, fh);
  if (!ct) throw new Error(`[pixelart] could not create canvas for ${key}`);
  const ctx = ct.context;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, fw * n, fh);
  for (let fi = 0; fi < n; fi++) {
    const rows = frames[fi];
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 0; c < row.length; c++) {
        const color = COL[row[c]];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(fi * fw + c, r, 1, 1);
      }
    }
  }
  ct.refresh();
  const tex = scene.textures.get(key);
  for (let i = 0; i < n; i++) tex.add(i, 0, i * fw, 0, fw, fh);
  tex.add("__BASE", 0, 0, 0, fw, fh);
}

/* ============================================================
   WISP — 24x24 x4 flutter frames. THREE variants share an
   IDENTICAL head+eye position so gameplay reads the same at a
   glance; variants differ ONLY in tail/horns. Built procedurally
   onto a 24x24 grid to guarantee consistency across variants and
   frames (a hand-authored 24x24 x4 x3 grid would be 288 rows of
   error-prone strings). Shading: boneHi rim upper-left, boneShade
   lower-right, 1px outline. Flame-eyes emberHi core on frames 2&4.
   ============================================================ */
const WISP_W = 24;
const WISP_H = 24;

function blank(): string[][] {
  const g: string[][] = [];
  for (let y = 0; y < WISP_H; y++) g.push(new Array(WISP_W).fill("."));
  return g;
}
function set(g: string[][], x: number, y: number, ch: string): void {
  if (x >= 0 && x < WISP_W && y >= 0 && y < WISP_H) g[y][x] = ch;
}
function disc(
  g: string[][],
  cx: number,
  cy: number,
  r: number,
  fill: string,
): void {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r) set(g, cx + x, cy + y, fill);
    }
  }
}
/** Shade a bone disc: rim-light upper-left, shade lower-right, outline ring. */
function shadeDisc(g: string[][], cx: number, cy: number, r: number): void {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d2 = x * x + y * y;
      if (d2 > r * r) continue;
      const isEdge = d2 >= (r - 1) * (r - 1);
      const upperLeft = x <= 0 && y <= 0;
      const lowerRight = x >= 0 && y >= 0;
      if (isEdge) set(g, cx + x, cy + y, "o");
      else if (upperLeft && d2 >= (r - 2) * (r - 2)) set(g, cx + x, cy + y, "H");
      else if (lowerRight && d2 >= (r - 2) * (r - 2)) set(g, cx + x, cy + y, "s");
      else set(g, cx + x, cy + y, "b");
    }
  }
}
/** Flame eye: 2px wide x 3px tall ember block + emberHi core on bright frames. */
function eye(g: string[][], x: number, y: number, bright: boolean): void {
  for (let dx = 0; dx < 2; dx++)
    for (let dy = 0; dy < 3; dy++) set(g, x + dx, y + dy, "e");
  if (bright) set(g, x, y, "E");
}
function toFrame(g: string[][]): Frame {
  return g.map((row) => row.join(""));
}

const HEAD_CX = 12;
const HEAD_CY = 10;
const HEAD_R = 6;

/**
 * Build a wisp variant's 4 flutter frames. The shared head is drawn identically
 * for every variant+frame; only the tail/horns and eye-brightness vary.
 * tailOffset: x offset applied to the tail pixels each frame (cycle -2,0,2,0).
 * horns: if true, draw two ember horns on the head (c variant).
 * longTail: if true, draw a longer curved tail (b variant).
 */
function buildWispFrames(opts: {
  horns?: boolean;
  longTail?: boolean;
}): Frame[] {
  const tailOffsets = [-2, 0, 2, 0]; // frames 1..4
  const bright = [false, true, false, true]; // emberHi on frames 2 & 4
  const frames: Frame[] = [];
  for (let f = 0; f < 4; f++) {
    const g = blank();
    shadeDisc(g, HEAD_CX, HEAD_CY, HEAD_R);
    // flame eyes (identical position for every variant/frame)
    eye(g, 8, 8, bright[f]);
    eye(g, 14, 8, bright[f]);

    if (opts.horns) {
      // two small ember horns above the head, flicker on frames 2 & 4
      const hc = bright[f] ? "E" : "e";
      set(g, 8, 2, hc);
      set(g, 8, 3, hc);
      set(g, 15, 2, hc);
      set(g, 15, 3, hc);
    }

    // tail below the head, offset around the cycle
    const tx = HEAD_CX + tailOffsets[f];
    if (opts.longTail) {
      // teardrop long tail: a curved trail down-right
      const tail = [
        [tx, 17],
        [tx + 1, 18],
        [tx + 2, 19],
        [tx + 3, 20],
        [tx + 4, 21],
      ];
      for (const [x, y] of tail) set(g, x, y, "b");
      // outline the tail underside
      set(g, tx - 1, 17, "o");
      set(g, tx + 5, 21, "o");
    } else {
      // round-head short tail: 3 bone pixels
      set(g, tx, 17, "b");
      set(g, tx, 18, "b");
      set(g, tx, 19, "b");
      set(g, tx, 20, "o");
    }
    frames.push(toFrame(g));
  }
  return frames;
}

/* ============================================================
   WIZ — 24x32 x3 frames (idle A, idle B bob, cast flare).
   Hooded bone-robed silhouette, staff on the right with an
   ember tip; cast frame has a 3x3 ember flare + emberHi core.
   Shaded: boneHi rim upper-left, boneShade lower-right, outline.
   ============================================================ */
const WIZ_W = 24;
const WIZ_H = 32;
function buildWiz(frame: 0 | 1 | 2): Frame {
  const g: string[][] = [];
  for (let y = 0; y < WIZ_H; y++) g.push(new Array(WIZ_W).fill("."));
  const setc = (x: number, y: number, ch: string) => {
    if (x >= 0 && x < WIZ_W && y >= 0 && y < WIZ_H) g[y][x] = ch;
  };
  const fillRow = (y: number, x0: number, x1: number, ch: string) => {
    for (let x = x0; x <= x1; x++) setc(x, y, ch);
  };
  // frame 1 = 1px lower bob: shift the whole silhouette down 1px by drawing
  // at y+1. Frame 2 = cast (staff raised, ember flare).
  const yOff = frame === 1 ? 1 : 0;

  // Robe band: outline edges + bone fill, with rim/shade on inner edges.
  const robe = (y: number, l: number, r: number) => {
    const yy = y + yOff;
    setc(l, yy, "o");
    setc(r, yy, "o");
    setc(l + 1, yy, "H"); // rim upper-left
    setc(r - 1, yy, "s"); // shade lower-right
    fillRow(yy, l + 2, r - 2, "b");
  };

  // Hood
  setc(9, 0 + yOff, "o");
  setc(10, 0 + yOff, "o");
  fillRow(1 + yOff, 8, 11, "o");
  robe(2, 7, 13); // crown

  // Face void (rows 3-5): robe cols 7-14, ink face cols 9-12, ember tip right.
  for (let y = 3; y <= 5; y++) {
    const yy = y + yOff;
    setc(7, yy, "o");
    setc(14, yy, "o");
    setc(8, yy, "b");
    setc(13, yy, "b");
    fillRow(yy, 9, 12, "i");
  }

  // Cast flare (frame 2): 3x3 ember at the staff tip with emberHi core.
  if (frame === 2) {
    for (let dy = 0; dy < 3; dy++)
      for (let dx = 0; dx < 3; dx++) setc(16 + dx, 3 + dy, "e");
    setc(17, 4, "E");
  } else {
    // normal ember tip (2x3)
    for (let dy = 0; dy < 3; dy++) {
      setc(16, 3 + dy + yOff, "e");
      setc(17, 3 + dy + yOff, "e");
    }
  }

  // Robe body (flares out toward the hem)
  robe(6, 7, 13);
  for (let y = 7; y <= 18; y++) robe(y, 6, 14);
  for (let y = 19; y <= 25; y++) robe(y, 5, 15);

  // Staff shaft (col 16, rows 6-26)
  for (let y = 6; y <= 26; y++) setc(16, y + yOff, "o");

  // Hem (row 27) + feet (row 28)
  fillRow(27 + yOff, 4, 18, "o");
  setc(7, 28 + yOff, "o");
  setc(8, 28 + yOff, "o");
  setc(15, 28 + yOff, "o");
  setc(16, 28 + yOff, "o");

  return g.map((row) => row.join(""));
}

/* ============================================================
   WALL — 32x12 x3 brick variants. boneHi 1px top edge (moonlit
   battlement), bone body, boneShade lower-right shading, 1px
   outline, stoneLight mortar lines. Brick offsets vary per frame.
   ============================================================ */
function buildWall(variant: 0 | 1 | 2): Frame {
  const W = 32;
  const H = 12;
  const g: string[][] = [];
  for (let y = 0; y < H; y++) g.push(new Array(W).fill("."));
  const setc = (x: number, y: number, ch: string) => {
    if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = ch;
  };
  // top moonlit edge
  for (let x = 0; x < W; x++) setc(x, 0, "H");
  // outline frame
  for (let x = 0; x < W; x++) setc(x, H - 1, "o");
  setc(0, 0, "o");
  setc(W - 1, 0, "o");
  for (let y = 1; y < H - 1; y++) {
    setc(0, y, "o");
    setc(W - 1, y, "o");
  }
  // brick rows (2 courses), offset pattern varies per variant
  const rowH = 5;
  const brickW = 8;
  const offsets =
    variant === 0 ? [0, 4] : variant === 1 ? [2, 6] : [4, 0];
  for (let row = 0; row < 2; row++) {
    const ry = 1 + row * rowH;
    const off = offsets[row];
    for (let bx = -brickW; bx < W; bx += brickW) {
      const x0 = bx + off;
      // bone fill
      for (let y = ry; y < ry + rowH - 1; y++)
        for (let x = x0 + 1; x < x0 + brickW - 1; x++) setc(x, y, "b");
      // rim upper-left
      for (let x = x0 + 1; x < x0 + brickW - 1; x++) setc(x, ry, "H");
      // shade lower-right of each brick
      for (let y = ry + rowH - 2; y < ry + rowH - 1; y++)
        for (let x = x0 + 1; x < x0 + brickW - 1; x++) setc(x, y, "s");
      // mortar (stoneLight) around each brick
      for (let y = ry; y < ry + rowH - 1; y++) setc(x0, y, "L");
      setc(x0 + brickW - 1, ry, "L");
    }
  }
  return g.map((row) => row.join(""));
}

/* ============================================================
   MOON — 28x28 bone disc with 2-3 inkHi craters, 1 frame.
   ============================================================ */
function buildMoon(): Frame {
  const W = 28;
  const H = 28;
  const g: string[][] = [];
  for (let y = 0; y < H; y++) g.push(new Array(W).fill("."));
  const setc = (x: number, y: number, ch: string) => {
    if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = ch;
  };
  const cx = 14;
  const cy = 14;
  const r = 12;
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d2 = x * x + y * y;
      if (d2 > r * r) continue;
      const isEdge = d2 >= (r - 1) * (r - 1);
      if (isEdge) setc(cx + x, cy + y, "s"); // soft shade ring
      else setc(cx + x, cy + y, "b");
    }
  }
  // craters (inkHi)
  const craters = [
    [9, 7],
    [18, 11],
    [12, 18],
  ];
  for (const [ccx, ccy] of craters) {
    for (let y = -1; y <= 1; y++)
      for (let x = -1; x <= 1; x++)
        if (x * x + y * y <= 1) setc(ccx + x, ccy + y, "I");
  }
  return g.map((row) => row.join(""));
}

/* ============================================================
   STAR — 2x2 bone speck (background + trail + sparkles). 1 frame.
   ============================================================ */
const STAR: Frame = ["bb", "bb"];

/* ============================================================
   KEEP — 64x96 x2 states (pristine / cracked). Procedurally drawn
   with fillRect: crenellated tower, inkHi bricks + stoneLight
   mortar, TWO ember window slits, hanging ember banner, arched
   door. Cracked state: zigzag cracks, one merlon gone.
   ============================================================ */
function bakeKeep(scene: Phaser.Scene): void {
  const fw = 64;
  const fh = 96;
  const n = 2;
  if (scene.textures.exists("keep")) scene.textures.remove("keep");
  const ct = scene.textures.createCanvas("keep", fw * n, fh);
  if (!ct) throw new Error("[pixelart] could not create canvas for keep");
  const ctx = ct.context;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, fw * n, fh);

  const drawState = (origin: number, cracked: boolean) => {
    const px = (x: number, y: number, w: number, h: number, col: string) => {
      ctx.fillStyle = col;
      ctx.fillRect(origin + x, y, w, h);
    };
    const P = {
      outline: "#241c18",
      bone: "#f2e9d8",
      boneHi: "#fffaf0",
      boneShade: "#cfc2a6",
      ink: "#14110f",
      inkHi: "#2b241e",
      ember: "#ff6b35",
      emberHi: "#ffa76b",
      stone: "#3d342b",
    };
    // Tower body cols 8..55, rows 14..95; outline.
    px(7, 13, 48, 82, P.outline);
    // inkHi brick field + stoneLight mortar courses
    px(8, 14, 46, 80, P.inkHi);
    const brickH = 8;
    const brickW = 12;
    for (let row = 0; row * brickH < 80; row++) {
      const ry = 14 + row * brickH;
      // mortar line (stoneLight) at the top of each course
      px(8, ry, 46, 1, P.stone);
      const off = row % 2 === 0 ? 0 : brickW / 2;
      for (let bx = 8 - brickW; bx < 56; bx += brickW) {
        // mortar gap between bricks
        px(bx + off, ry, 1, brickH, P.stone);
      }
    }
    // rim light upper-left (boneHi) + shade lower-right (boneShade) on the body edges
    px(8, 14, 2, 80, P.boneHi);
    px(52, 14, 2, 80, P.boneShade);

    // Crenellations along the top (rows 0..12): 4 merlons with gaps.
    const merlonW = 10;
    const merlonGap = 4;
    let mx = 7;
    const merlons: { x: number }[] = [];
    for (let i = 0; i < 4; i++) {
      merlons.push({ x: mx });
      mx += merlonW + merlonGap;
    }
    for (const m of merlons) {
      // cracked state: drop the top-right (last) merlon
      if (cracked && m === merlons[merlons.length - 1]) continue;
      px(m.x, 0, merlonW, 13, P.outline);
      px(m.x + 1, 1, merlonW - 2, 11, P.bone);
      px(m.x + 1, 1, merlonW - 2, 2, P.boneHi); // moonlit top
    }

    // Hanging ember banner from the 2nd merlon
    const bx = merlons[1].x + 3;
    px(bx, 13, 4, 1, P.outline); // rod
    px(bx, 14, 4, 10, P.ember);
    px(bx, 14, 4, 2, P.emberHi); // banner rim light

    // TWO ember window slits on the upper tower
    const drawWindow = (wx: number) => {
      px(wx, 30, 6, 10, P.outline);
      px(wx + 1, 31, 4, 8, P.ember);
      px(wx + 1, 31, 4, 2, P.emberHi); // glow top
    };
    drawWindow(16);
    drawWindow(40);

    // Arched door (ink) centered, cols 26..37, rows 66..95
    px(26, 66, 12, 30, P.ink);
    px(26, 62, 12, 4, P.ink);
    px(27, 60, 10, 2, P.ink);
    px(28, 59, 8, 1, P.ink);
    // door frame (outline) + keystone
    px(25, 58, 14, 2, P.outline);
    px(25, 58, 2, 38, P.outline);
    px(37, 58, 2, 38, P.outline);
    px(31, 56, 2, 2, P.bone);

    if (cracked) {
      // zigzag cracks (outline) across the body
      ctx.fillStyle = P.outline;
      const crack = (pts: number[][]) => {
        for (const [x, y] of pts) ctx.fillRect(origin + x, y, 1, 1);
      };
      crack([
        [20, 20],
        [21, 22],
        [20, 24],
        [21, 26],
        [20, 28],
      ]);
      crack([
        [44, 40],
        [45, 42],
        [44, 44],
        [45, 46],
        [44, 48],
      ]);
      crack([
        [30, 50],
        [31, 52],
        [30, 54],
      ]);
      // shade a missing-merlon gap (boneShade rubble)
      const mm = merlons[merlons.length - 1];
      px(mm.x, 13, merlonW, 3, P.boneShade);
    }
  };

  drawState(0, false);
  drawState(fw, true);

  ct.refresh();
  const tex = scene.textures.get("keep");
  tex.add(0, 0, 0, 0, fw, fh);
  tex.add(1, 0, fw, 0, fw, fh);
  tex.add("__BASE", 0, 0, 0, fw, fh);
}

/* ============================================================
   bakeAll — register every texture under its fixed key.
   ============================================================ */
export function bakeAll(scene: Phaser.Scene): void {
  makeSheet(scene, "wisp_a", buildWispFrames({}), WISP_W, WISP_H);
  makeSheet(scene, "wisp_b", buildWispFrames({ longTail: true }), WISP_W, WISP_H);
  makeSheet(scene, "wisp_c", buildWispFrames({ horns: true }), WISP_W, WISP_H);
  makeSheet(
    scene,
    "wiz",
    [buildWiz(0), buildWiz(1), buildWiz(2)],
    WIZ_W,
    WIZ_H,
  );
  makeSheet(
    scene,
    "wall",
    [buildWall(0), buildWall(1), buildWall(2)],
    32,
    12,
  );
  makeSheet(scene, "moon", [buildMoon()], 28, 28);
  makeSheet(scene, "star", [STAR], 2, 2);
  bakeKeep(scene);
}
