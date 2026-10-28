/**
 * games/kraepelin-keep/pixelmaps.ts — PURE pixel-art data.
 *
 * ZERO imports. This file is the bridge between the game (Phaser) and the hub
 * (React): the hub imports drawMap() to render hero art on a <canvas> WITHOUT
 * loading Phaser, and pixelart.ts imports the same grids to bake Phaser
 * textures. Keeping this file import-free is what keeps Phaser out of the hub
 * bundle.
 *
 * String-grid pixel maps + palette + drawMap(ctx, key, frame, ox, oy, scale).
 *
 * char -> color:
 *   '.' transparent
 *   'o' outline  #241c18
 *   'i' ink      #14110f
 *   'I' inkHi    #2b241e
 *   'b' bone     #f2e9d8
 *   'H' boneHi   #fffaf0   (rim light UPPER-LEFT)
 *   's' boneShade #cfc2a6   (shade LOWER-RIGHT)
 *   'e' ember    #ff6b35
 *   'E' emberHi  #ffa76b
 *   'L' stoneLight #3d342b
 */

export type Frame = string[];

export const PIXEL_PALETTE: Record<string, string | null> = {
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

export type SpriteSpec = {
  w: number;
  h: number;
  frames: Frame[];
};

/* ---------------------------- WISP 24x24 x4 ---------------------------- */
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
function disc(g: string[][], cx: number, cy: number, r: number, fill: string): void {
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++)
      if (x * x + y * y <= r * r) set(g, cx + x, cy + y, fill);
}
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

function buildWispFrames(opts: { horns?: boolean; longTail?: boolean }): Frame[] {
  const tailOffsets = [-2, 0, 2, 0];
  const bright = [false, true, false, true];
  const frames: Frame[] = [];
  for (let f = 0; f < 4; f++) {
    const g = blank();
    shadeDisc(g, HEAD_CX, HEAD_CY, HEAD_R);
    eye(g, 8, 8, bright[f]);
    eye(g, 14, 8, bright[f]);
    if (opts.horns) {
      const hc = bright[f] ? "E" : "e";
      set(g, 8, 2, hc); set(g, 8, 3, hc);
      set(g, 15, 2, hc); set(g, 15, 3, hc);
    }
    const tx = HEAD_CX + tailOffsets[f];
    if (opts.longTail) {
      const tail = [[tx,17],[tx+1,18],[tx+2,19],[tx+3,20],[tx+4,21]];
      for (const [x, y] of tail) set(g, x, y, "b");
      set(g, tx - 1, 17, "o"); set(g, tx + 5, 21, "o");
    } else {
      set(g, tx, 17, "b"); set(g, tx, 18, "b"); set(g, tx, 19, "b"); set(g, tx, 20, "o");
    }
    frames.push(toFrame(g));
  }
  return frames;
}

/* ----------------------------- WIZ 24x32 x3 ----------------------------- */
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
  const yOff = frame === 1 ? 1 : 0;
  const robe = (y: number, l: number, r: number) => {
    const yy = y + yOff;
    setc(l, yy, "o"); setc(r, yy, "o");
    setc(l + 1, yy, "H"); setc(r - 1, yy, "s");
    fillRow(yy, l + 2, r - 2, "b");
  };
  setc(9, 0 + yOff, "o"); setc(10, 0 + yOff, "o");
  fillRow(1 + yOff, 8, 11, "o");
  robe(2, 7, 13);
  for (let y = 3; y <= 5; y++) {
    const yy = y + yOff;
    setc(7, yy, "o"); setc(14, yy, "o");
    setc(8, yy, "b"); setc(13, yy, "b");
    fillRow(yy, 9, 12, "i");
  }
  if (frame === 2) {
    for (let dy = 0; dy < 3; dy++)
      for (let dx = 0; dx < 3; dx++) setc(16 + dx, 3 + dy, "e");
    setc(17, 4, "E");
  } else {
    for (let dy = 0; dy < 3; dy++) {
      setc(16, 3 + dy + yOff, "e");
      setc(17, 3 + dy + yOff, "e");
    }
  }
  robe(6, 7, 13);
  for (let y = 7; y <= 18; y++) robe(y, 6, 14);
  for (let y = 19; y <= 25; y++) robe(y, 5, 15);
  for (let y = 6; y <= 26; y++) setc(16, y + yOff, "o");
  fillRow(27 + yOff, 4, 18, "o");
  setc(7, 28 + yOff, "o"); setc(8, 28 + yOff, "o");
  setc(15, 28 + yOff, "o"); setc(16, 28 + yOff, "o");
  return g.map((row) => row.join(""));
}

/* ----------------------------- WALL 32x12 x3 ----------------------------- */
function buildWall(variant: 0 | 1 | 2): Frame {
  const W = 32, H = 12;
  const g: string[][] = [];
  for (let y = 0; y < H; y++) g.push(new Array(W).fill("."));
  const setc = (x: number, y: number, ch: string) => {
    if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = ch;
  };
  for (let x = 0; x < W; x++) setc(x, 0, "H");
  for (let x = 0; x < W; x++) setc(x, H - 1, "o");
  setc(0, 0, "o"); setc(W - 1, 0, "o");
  for (let y = 1; y < H - 1; y++) { setc(0, y, "o"); setc(W - 1, y, "o"); }
  const rowH = 5, brickW = 8;
  const offsets = variant === 0 ? [0, 4] : variant === 1 ? [2, 6] : [4, 0];
  for (let row = 0; row < 2; row++) {
    const ry = 1 + row * rowH;
    const off = offsets[row];
    for (let bx = -brickW; bx < W; bx += brickW) {
      const x0 = bx + off;
      for (let y = ry; y < ry + rowH - 1; y++)
        for (let x = x0 + 1; x < x0 + brickW - 1; x++) setc(x, y, "b");
      for (let x = x0 + 1; x < x0 + brickW - 1; x++) setc(x, ry, "H");
      for (let y = ry + rowH - 2; y < ry + rowH - 1; y++)
        for (let x = x0 + 1; x < x0 + brickW - 1; x++) setc(x, y, "s");
      for (let y = ry; y < ry + rowH - 1; y++) setc(x0, y, "L");
      setc(x0 + brickW - 1, ry, "L");
    }
  }
  return g.map((row) => row.join(""));
}

/* ----------------------------- MOON 28x28 ----------------------------- */
function buildMoon(): Frame {
  const W = 28, H = 28;
  const g: string[][] = [];
  for (let y = 0; y < H; y++) g.push(new Array(W).fill("."));
  const setc = (x: number, y: number, ch: string) => {
    if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = ch;
  };
  const cx = 14, cy = 14, r = 12;
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d2 = x * x + y * y;
      if (d2 > r * r) continue;
      const isEdge = d2 >= (r - 1) * (r - 1);
      if (isEdge) setc(cx + x, cy + y, "s");
      else setc(cx + x, cy + y, "b");
    }
  }
  const craters = [[9, 7], [18, 11], [12, 18]];
  for (const [ccx, ccy] of craters) {
    for (let y = -1; y <= 1; y++)
      for (let x = -1; x <= 1; x++)
        if (x * x + y * y <= 1) setc(ccx + x, ccy + y, "I");
  }
  return g.map((row) => row.join(""));
}

const STAR: Frame = ["bb", "bb"];

/* --------------------------- KEEP 64x96 x2 --------------------------- */
/** Keep is procedurally drawn with fillRect (not a string grid) due to its
 *  size. This function draws one keep state (pristine or cracked) onto a
 *  canvas context at the given origin. Shared by pixelart.ts (Phaser baking)
 *  and the hub hero art. */
export function drawKeep(
  ctx: CanvasRenderingContext2D,
  origin: number,
  cracked: boolean,
  oy = 0,
): void {
  const fw = 64, fh = 96;
  const px = (x: number, y: number, w: number, h: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(origin + x, oy + y, w, h);
  };
  const P = {
    outline: "#241c18", bone: "#f2e9d8", boneHi: "#fffaf0", boneShade: "#cfc2a6",
    ink: "#14110f", inkHi: "#2b241e", ember: "#ff6b35", emberHi: "#ffa76b",
    stone: "#3d342b",
  };
  px(7, 13, 48, 82, P.outline);
  px(8, 14, 46, 80, P.inkHi);
  const brickH = 8, brickW = 12;
  for (let row = 0; row * brickH < 80; row++) {
    const ry = 14 + row * brickH;
    px(8, ry, 46, 1, P.stone);
    const off = row % 2 === 0 ? 0 : brickW / 2;
    for (let bx = 8 - brickW; bx < 56; bx += brickW) {
      px(bx + off, ry, 1, brickH, P.stone);
    }
  }
  px(8, 14, 2, 80, P.boneHi);
  px(52, 14, 2, 80, P.boneShade);
  const merlonW = 10, merlonGap = 4;
  let mx = 7;
  const merlons: { x: number }[] = [];
  for (let i = 0; i < 4; i++) { merlons.push({ x: mx }); mx += merlonW + merlonGap; }
  for (const m of merlons) {
    if (cracked && m === merlons[merlons.length - 1]) continue;
    px(m.x, 0, merlonW, 13, P.outline);
    px(m.x + 1, 1, merlonW - 2, 11, P.bone);
    px(m.x + 1, 1, merlonW - 2, 2, P.boneHi);
  }
  const bx = merlons[1].x + 3;
  px(bx, 13, 4, 1, P.outline);
  px(bx, 14, 4, 10, P.ember);
  px(bx, 14, 4, 2, P.emberHi);
  const drawWindow = (wx: number) => {
    px(wx, 30, 6, 10, P.outline);
    px(wx + 1, 31, 4, 8, P.ember);
    px(wx + 1, 31, 4, 2, P.emberHi);
  };
  drawWindow(16); drawWindow(40);
  px(26, 66, 12, 30, P.ink);
  px(26, 62, 12, 4, P.ink);
  px(27, 60, 10, 2, P.ink);
  px(28, 59, 8, 1, P.ink);
  px(25, 58, 14, 2, P.outline);
  px(25, 58, 2, 38, P.outline);
  px(37, 58, 2, 38, P.outline);
  px(31, 56, 2, 2, P.bone);
  if (cracked) {
    ctx.fillStyle = P.outline;
    const crack = (pts: number[][]) => {
      for (const [x, y] of pts) ctx.fillRect(origin + x, oy + y, 1, 1);
    };
    crack([[20,20],[21,22],[20,24],[21,26],[20,28]]);
    crack([[44,40],[45,42],[44,44],[45,46],[44,48]]);
    crack([[30,50],[31,52],[30,54]]);
    const mm = merlons[merlons.length - 1];
    px(mm.x, 13, merlonW, 3, P.boneShade);
  }
  void fw; void fh;
}

/* --------------------------- SPRITE SPECS --------------------------- */
export const SPRITES: Record<string, SpriteSpec> = {
  wisp_a: { w: WISP_W, h: WISP_H, frames: buildWispFrames({}) },
  wisp_b: { w: WISP_W, h: WISP_H, frames: buildWispFrames({ longTail: true }) },
  wisp_c: { w: WISP_W, h: WISP_H, frames: buildWispFrames({ horns: true }) },
  wiz: { w: WIZ_W, h: WIZ_H, frames: [buildWiz(0), buildWiz(1), buildWiz(2)] },
  wall: { w: 32, h: 12, frames: [buildWall(0), buildWall(1), buildWall(2)] },
  moon: { w: 28, h: 28, frames: [buildMoon()] },
  star: { w: 2, h: 2, frames: [STAR] },
};

/** Keep dimensions (for the hub + pixelart). */
export const KEEP_W = 64;
export const KEEP_H = 96;

/**
 * Draw a single sprite frame onto a canvas context at (ox, oy) with the given
 * pixel scale. Used by the hub hero art (no Phaser). For the keep (which is
 * fillRect-based, not a grid), use drawKeep() directly.
 */
export function drawMap(
  ctx: CanvasRenderingContext2D,
  key: string,
  frame: number,
  ox: number,
  oy: number,
  scale: number,
): void {
  const spec = SPRITES[key];
  if (!spec) return;
  const f = spec.frames[frame] ?? spec.frames[0];
  ctx.imageSmoothingEnabled = false;
  for (let r = 0; r < f.length; r++) {
    const row = f[r];
    for (let c = 0; c < row.length; c++) {
      const color = PIXEL_PALETTE[row[c]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + c * scale, oy + r * scale, scale, scale);
    }
  }
}
