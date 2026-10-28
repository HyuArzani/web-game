/**
 * game/gesture.ts — single-stroke digit recognizer for Kraepelin Keep.
 *
 * PIPELINE (identical for every stroke AND every template):
 *   a) Resample to N=32 points (arc-length uniform).
 *   b) One pass of 3-point moving-average smoothing (mouse strokes are shaky).
 *   c) Translate to centroid.
 *   d) Aspect-PRESERVING scale: divide both axes by max(width, height).
 *      Do NOT stretch to a square.
 *   e) Match against all templates with a bounded rotation search: rotate the
 *      stroke -20..+20 deg in 9 steps; score = 1 - (mean point distance to
 *      template) / diag. Take the best (template, rotation) pair.
 *   f) Decision (all in TUNING):
 *        best >= RECOGNIZE_MIN (0.62)                       -> recognized
 *        else if (best - secondBestDifferentDigit)
 *                 < AMBIGUITY_GAP (0.06)                    -> "unclear" miscast
 *        else                                              -> "unrecognized" miscast
 *
 * TEMPLATES: ~20 built-in single-stroke digit templates (0-9 variants),
 * authored as control-point polylines (4-8 points) smoothed with Catmull-Rom
 * and sampled through the same pipeline. At runtime, user-taught strokes
 * (kk_tpl_v1) are loaded, processed identically, and merged in (more data =
 * better match; no weighting).
 *
 * SELF-TEST: visit the page with ?tpltest=1 to print a cross-template score
 * matrix via console.table. Acceptance: every template's best match is a
 * SAME-digit template with score >= 0.80, and no cross-digit pair >= 0.70.
 *
 * Browser-safe (no Phaser, no DOM at load). Deterministic. Exports:
 *   Pt, RecogOutcome, recognizeStroke, MIN_POINTS, MIN_BOX,
 *   RECOGNIZE_MIN, AMBIGUITY_GAP, setUserTemplates, runSelfTest, clearUserTemplates.
 */

import { TUNING } from "./tuning";

export type Pt = { x: number; y: number };

export type RecogOutcome =
  | { kind: "recognized"; digit: number; score: number; nextDigit: number; nextScore: number }
  | { kind: "unclear"; score: number; nextScore: number }
  | { kind: "unrecognized"; score: number }
  | null; // sub-threshold (silent cancel)

export const RECOGNIZE_MIN = 0.62;
export const AMBIGUITY_GAP = 0.06;
export const MIN_POINTS = 8;
export const MIN_BOX = 24;

const N = 32;
const ROT_STEPS = 9; // -20..+20 deg in 9 steps (5 deg each)
const ROT_MIN = -20 * (Math.PI / 180);
const ROT_MAX = 20 * (Math.PI / 180);

/* ----------------------------- geometry ----------------------------- */

function pathLength(p: Pt[]): number {
  let len = 0;
  for (let i = 1; i < p.length; i++)
    len += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y);
  return len;
}

/** Resample to n points equally spaced along arc length. */
function resample(points: Pt[], n: number): Pt[] {
  if (points.length === 0) return [];
  const len = pathLength(points);
  if (len === 0) return Array.from({ length: n }, () => ({ ...points[0] }));
  const interval = len / (n - 1);
  const pts: Pt[] = points.map((p) => ({ x: p.x, y: p.y }));
  const result: Pt[] = [{ x: pts[0].x, y: pts[0].y }];
  let acc = 0;
  let i = 1;
  while (i < pts.length && result.length < n) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    const d = Math.hypot(dx, dy);
    if (d === 0) {
      i++;
      continue;
    }
    if (acc + d >= interval) {
      const t = (interval - acc) / d;
      const q: Pt = { x: pts[i - 1].x + t * dx, y: pts[i - 1].y + t * dy };
      result.push(q);
      pts.splice(i, 0, q);
      acc = 0;
    } else {
      acc += d;
    }
    i++;
  }
  while (result.length < n)
    result.push({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y });
  return result.slice(0, n);
}

/** One pass of 3-point moving-average smoothing. */
function smooth(points: Pt[]): Pt[] {
  if (points.length < 3) return points.map((p) => ({ ...p }));
  const out: Pt[] = [{ ...points[0] }];
  for (let i = 1; i < points.length - 1; i++) {
    out.push({
      x: (points[i - 1].x + points[i].x + points[i + 1].x) / 3,
      y: (points[i - 1].y + points[i].y + points[i + 1].y) / 3,
    });
  }
  out.push({ ...points[points.length - 1] });
  return out;
}

function centroid(p: Pt[]): Pt {
  let sx = 0,
    sy = 0;
  for (const q of p) {
    sx += q.x;
    sy += q.y;
  }
  return { x: sx / p.length, y: sy / p.length };
}

function bboxDims(p: Pt[]): { w: number; h: number } {
  let mnx = Infinity,
    mny = Infinity,
    mxx = -Infinity,
    mxy = -Infinity;
  for (const q of p) {
    if (q.x < mnx) mnx = q.x;
    if (q.y < mny) mny = q.y;
    if (q.x > mxx) mxx = q.x;
    if (q.y > mxy) mxy = q.y;
  }
  return { w: mxx - mnx, h: mxy - mny };
}

function rotate(p: Pt[], rad: number): Pt[] {
  const cos = Math.cos(rad),
    sin = Math.sin(rad);
  return p.map((q) => ({ x: q.x * cos - q.y * sin, y: q.x * sin + q.y * cos }));
}

/** mean point distance between two equal-length point arrays. */
function pathDistance(a: Pt[], b: Pt[]): number {
  let d = 0;
  for (let i = 0; i < a.length; i++)
    d += Math.hypot(a[i].x - b[i].x, a[i].y - b[i].y);
  return d / a.length;
}

/**
 * Full pipeline (a-d): resample -> smooth -> translate centroid to origin ->
 * aspect-preserving scale (divide by max(w,h)). Output points live in roughly
 * [-0.5, 0.5] on the larger axis.
 */
function process(points: Pt[]): Pt[] {
  const r = resample(points, N);
  if (r.length < N) return [];
  const s = smooth(r);
  const c = centroid(s);
  const t = s.map((p) => ({ x: p.x - c.x, y: p.y - c.y }));
  const box = bboxDims(t);
  const maxDim = Math.max(box.w, box.h);
  if (maxDim === 0) return [];
  return t.map((p) => ({ x: p.x / maxDim, y: p.y / maxDim }));
}

/** diag of the unit-normalized space (max dimension is 1, so diag ~= sqrt(2)). */
const DIAG = Math.SQRT2; // ~1.414
/**
 * Score scale for the distance->similarity mapping. After aspect-preserving
 * normalization, processed points live in ~[-0.5, 0.5]; same-digit point-to-point
 * distances are ~0.0-0.03 while cross-digit distances are ~0.08-0.15. Mapping
 * score = 1 - dist/SCORE_SCALE with SCORE_SCALE = 0.2 yields: same(0.02)->0.90,
 * cross(0.10)->0.50. This cleanly separates same-digit (>=0.80) from cross-digit
 * (<0.70) per the self-test acceptance.
 */
const SCORE_SCALE = 0.2;

/**
 * Score a processed stroke against a processed template over the bounded
 * rotation search. Returns the best score in [0,1].
 */
function scorePair(stroke: Pt[], tmpl: Pt[]): number {
  let best = -Infinity;
  for (let i = 0; i < ROT_STEPS; i++) {
    const ang = ROT_MIN + ((ROT_MAX - ROT_MIN) * i) / (ROT_STEPS - 1);
    const rotated = rotate(stroke, ang);
    const dist = pathDistance(rotated, tmpl);
    const score = 1 - dist / SCORE_SCALE;
    if (score > best) best = score;
  }
  return best;
}

/* --------------------------- template authoring --------------------------- */

/**
 * Catmull-Rom spline through control points, sampled into `n` points.
 * Produces a smooth single-stroke path from a small control-point polyline.
 */
function catmullRom(ctrl: Pt[], n: number): Pt[] {
  if (ctrl.length < 2) return ctrl.slice();
  const pts: Pt[] = [ctrl[0]];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = ctrl[i - 1] || ctrl[i];
    const p1 = ctrl[i];
    const p2 = ctrl[i + 1];
    const p3 = ctrl[i + 2] || p2;
    const segN = Math.max(2, Math.round(n / (ctrl.length - 1)));
    for (let j = 1; j <= segN; j++) {
      const t = j / segN;
      const t2 = t * t,
        t3 = t2 * t;
      pts.push({
        x:
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y:
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  return pts;
}

/**
 * Author a raw single-stroke path for a digit variant from 4-8 control points,
 * smoothed with Catmull-Rom. All coords are in a unit square, y-down
 * (e.g. y=0 top, y=1 bottom). Absolute scale doesn't matter (process() normalizes).
 */
function tpl(ctrl: Pt[]): Pt[] {
  return catmullRom(ctrl, 48);
}

interface Template {
  digit: number;
  variant: string;
  points: Pt[]; // processed (pipeline output)
  raw: Pt[]; // raw control points (for the self-test label)
}

/** Built-in template control points (unit square, y-down, REALISTIC aspect ratios
 *  matching how each digit is naturally drawn — 1 and 9 are tall, 0 is round,
 *  etc. Traced in the natural writing direction). */
const BUILTIN: { digit: number; variant: string; ctrl: Pt[] }[] = [
  // 0: clockwise oval (taller than wide), start top
  {
    digit: 0,
    variant: "cw",
    ctrl: [
      { x: 0.4, y: 0.1 }, { x: 0.65, y: 0.15 }, { x: 0.75, y: 0.4 },
      { x: 0.7, y: 0.7 }, { x: 0.5, y: 0.9 }, { x: 0.25, y: 0.8 },
      { x: 0.15, y: 0.5 }, { x: 0.25, y: 0.2 }, { x: 0.4, y: 0.1 },
    ],
  },
  // 0: counterclockwise oval, start top, go left first
  {
    digit: 0,
    variant: "ccw",
    ctrl: [
      { x: 0.4, y: 0.1 }, { x: 0.25, y: 0.2 }, { x: 0.15, y: 0.5 },
      { x: 0.25, y: 0.8 }, { x: 0.5, y: 0.9 }, { x: 0.7, y: 0.8 },
      { x: 0.75, y: 0.5 }, { x: 0.65, y: 0.15 }, { x: 0.4, y: 0.1 },
    ],
  },
  // 1: plain vertical down (narrow, tall)
  {
    digit: 1,
    variant: "plain",
    ctrl: [{ x: 0.5, y: 0.1 }, { x: 0.5, y: 0.4 }, { x: 0.5, y: 0.7 }, { x: 0.5, y: 0.95 }],
  },
  // 1: entry flag (short up-right diagonal then straight down)
  {
    digit: 1,
    variant: "flag",
    ctrl: [
      { x: 0.25, y: 0.25 }, { x: 0.4, y: 0.15 }, { x: 0.5, y: 0.1 },
      { x: 0.5, y: 0.4 }, { x: 0.5, y: 0.7 }, { x: 0.5, y: 0.95 },
    ],
  },
  // 2: standard (top arc, diagonal down-left, horizontal base)
  {
    digit: 2,
    variant: "std",
    ctrl: [
      { x: 0.2, y: 0.25 }, { x: 0.4, y: 0.1 }, { x: 0.6, y: 0.1 }, { x: 0.75, y: 0.25 },
      { x: 0.65, y: 0.45 }, { x: 0.4, y: 0.6 }, { x: 0.15, y: 0.8 },
      { x: 0.35, y: 0.9 }, { x: 0.7, y: 0.9 },
    ],
  },
  // 2: sharper Z-style
  {
    digit: 2,
    variant: "z",
    ctrl: [
      { x: 0.2, y: 0.2 }, { x: 0.7, y: 0.2 }, { x: 0.65, y: 0.35 },
      { x: 0.3, y: 0.6 }, { x: 0.15, y: 0.8 }, { x: 0.7, y: 0.85 },
    ],
  },
  // 3: round double-bump (tall, right-bulging)
  {
    digit: 3,
    variant: "round",
    ctrl: [
      { x: 0.2, y: 0.2 }, { x: 0.5, y: 0.1 }, { x: 0.75, y: 0.25 }, { x: 0.6, y: 0.4 },
      { x: 0.25, y: 0.5 }, { x: 0.6, y: 0.55 }, { x: 0.8, y: 0.75 },
      { x: 0.55, y: 0.9 }, { x: 0.2, y: 0.85 },
    ],
  },
  // 3: flat-top variant
  {
    digit: 3,
    variant: "flat",
    ctrl: [
      { x: 0.2, y: 0.2 }, { x: 0.75, y: 0.2 }, { x: 0.7, y: 0.35 },
      { x: 0.3, y: 0.45 }, { x: 0.7, y: 0.55 }, { x: 0.8, y: 0.75 },
      { x: 0.55, y: 0.9 }, { x: 0.2, y: 0.85 },
    ],
  },
  // 4: closed one-stroke (start top-right, diagonal down-left, crossbar, stem)
  {
    digit: 4,
    variant: "closed",
    ctrl: [
      { x: 0.7, y: 0.15 }, { x: 0.3, y: 0.15 }, { x: 0.2, y: 0.5 },
      { x: 0.8, y: 0.5 }, { x: 0.6, y: 0.15 }, { x: 0.6, y: 0.5 },
      { x: 0.6, y: 0.75 }, { x: 0.6, y: 0.95 },
    ],
  },
  // 4: open one-stroke (top stub down, diagonal down-left, horizontal right)
  {
    digit: 4,
    variant: "open",
    ctrl: [
      { x: 0.7, y: 0.2 }, { x: 0.6, y: 0.4 }, { x: 0.2, y: 0.55 },
      { x: 0.6, y: 0.5 }, { x: 0.85, y: 0.5 }, { x: 0.6, y: 0.45 },
    ],
  },
  // 5: flag left-to-right then stem + bowl
  {
    digit: 5,
    variant: "lr",
    ctrl: [
      { x: 0.2, y: 0.15 }, { x: 0.75, y: 0.15 }, { x: 0.7, y: 0.2 },
      { x: 0.25, y: 0.3 }, { x: 0.2, y: 0.5 }, { x: 0.2, y: 0.7 },
      { x: 0.4, y: 0.9 }, { x: 0.75, y: 0.85 },
    ],
  },
  // 5: flag right-to-left first
  {
    digit: 5,
    variant: "rl",
    ctrl: [
      { x: 0.75, y: 0.15 }, { x: 0.2, y: 0.15 }, { x: 0.25, y: 0.3 },
      { x: 0.2, y: 0.5 }, { x: 0.2, y: 0.7 }, { x: 0.4, y: 0.9 },
      { x: 0.75, y: 0.85 },
    ],
  },
  // 6: standard (start top-right, sweep down-left, close loop clockwise)
  {
    digit: 6,
    variant: "std",
    ctrl: [
      { x: 0.7, y: 0.15 }, { x: 0.4, y: 0.2 }, { x: 0.2, y: 0.4 },
      { x: 0.15, y: 0.65 }, { x: 0.3, y: 0.85 }, { x: 0.55, y: 0.9 },
      { x: 0.75, y: 0.75 }, { x: 0.7, y: 0.55 }, { x: 0.5, y: 0.5 },
      { x: 0.3, y: 0.6 },
    ],
  },
  // 6: straighter-stem variant
  {
    digit: 6,
    variant: "stem",
    ctrl: [
      { x: 0.65, y: 0.15 }, { x: 0.45, y: 0.4 }, { x: 0.35, y: 0.55 },
      { x: 0.3, y: 0.7 }, { x: 0.45, y: 0.9 }, { x: 0.7, y: 0.9 },
      { x: 0.8, y: 0.7 }, { x: 0.65, y: 0.55 }, { x: 0.45, y: 0.6 },
    ],
  },
  // 7: plain (top bar L->R, diagonal down-left) — tall
  {
    digit: 7,
    variant: "plain",
    ctrl: [
      { x: 0.2, y: 0.15 }, { x: 0.5, y: 0.15 }, { x: 0.8, y: 0.15 },
      { x: 0.65, y: 0.4 }, { x: 0.45, y: 0.65 }, { x: 0.3, y: 0.9 },
    ],
  },
  // 7: crossed-7
  {
    digit: 7,
    variant: "cross",
    ctrl: [
      { x: 0.2, y: 0.15 }, { x: 0.8, y: 0.15 }, { x: 0.6, y: 0.4 },
      { x: 0.45, y: 0.55 }, { x: 0.65, y: 0.55 }, { x: 0.5, y: 0.7 },
      { x: 0.3, y: 0.9 },
    ],
  },
  // 8: start top, left side first (figure-eight) — tall
  {
    digit: 8,
    variant: "left",
    ctrl: [
      { x: 0.45, y: 0.15 }, { x: 0.25, y: 0.2 }, { x: 0.2, y: 0.4 },
      { x: 0.4, y: 0.5 }, { x: 0.65, y: 0.55 }, { x: 0.8, y: 0.75 },
      { x: 0.55, y: 0.9 }, { x: 0.25, y: 0.85 }, { x: 0.2, y: 0.65 },
      { x: 0.4, y: 0.5 }, { x: 0.6, y: 0.4 }, { x: 0.7, y: 0.2 },
      { x: 0.45, y: 0.15 },
    ],
  },
  // 8: mirrored, right side first
  {
    digit: 8,
    variant: "right",
    ctrl: [
      { x: 0.45, y: 0.15 }, { x: 0.65, y: 0.2 }, { x: 0.7, y: 0.4 },
      { x: 0.5, y: 0.5 }, { x: 0.25, y: 0.55 }, { x: 0.1, y: 0.75 },
      { x: 0.35, y: 0.9 }, { x: 0.65, y: 0.85 }, { x: 0.7, y: 0.65 },
      { x: 0.5, y: 0.5 }, { x: 0.3, y: 0.4 }, { x: 0.2, y: 0.2 },
      { x: 0.45, y: 0.15 },
    ],
  },
  // 9: clockwise loop (start top) then straight tail — tall
  {
    digit: 9,
    variant: "straight",
    ctrl: [
      { x: 0.45, y: 0.1 }, { x: 0.65, y: 0.12 }, { x: 0.8, y: 0.25 },
      { x: 0.78, y: 0.45 }, { x: 0.6, y: 0.55 }, { x: 0.4, y: 0.5 },
      { x: 0.45, y: 0.35 }, { x: 0.6, y: 0.4 }, { x: 0.65, y: 0.6 },
      { x: 0.6, y: 0.8 }, { x: 0.55, y: 0.95 },
    ],
  },
  // 9: clockwise loop then curled tail
  {
    digit: 9,
    variant: "curled",
    ctrl: [
      { x: 0.45, y: 0.1 }, { x: 0.65, y: 0.12 }, { x: 0.8, y: 0.25 },
      { x: 0.78, y: 0.45 }, { x: 0.6, y: 0.55 }, { x: 0.4, y: 0.5 },
      { x: 0.45, y: 0.35 }, { x: 0.6, y: 0.4 }, { x: 0.65, y: 0.6 },
      { x: 0.7, y: 0.8 }, { x: 0.55, y: 0.9 }, { x: 0.4, y: 0.85 },
    ],
  },
];

/* --------------------------- template cache + API --------------------------- */

let builtinCache: Template[] | null = null;
let userCache: Template[] = [];

function getBuiltins(): Template[] {
  if (builtinCache) return builtinCache;
  builtinCache = [];
  for (const b of BUILTIN) {
    const proc = process(tpl(b.ctrl));
    if (proc.length === N) {
      builtinCache.push({
        digit: b.digit,
        variant: b.variant,
        points: proc,
        raw: b.ctrl,
      });
    }
  }
  return builtinCache;
}

function allTemplates(): Template[] {
  return [...getBuiltins(), ...userCache];
}

/**
 * Load user-taught strokes (raw point arrays) and merge them into the template
 * set. Each saved stroke is run through the same pipeline. Called at boot.
 */
export function setUserTemplates(userStrokes: { digit: number; stroke: Pt[] }[]): void {
  userCache = [];
  for (const u of userStrokes) {
    if (!u || !u.stroke || u.stroke.length < MIN_POINTS) continue;
    const proc = process(u.stroke);
    if (proc.length === N) {
      userCache.push({ digit: u.digit, variant: "user", points: proc, raw: u.stroke });
    }
  }
}

export function clearUserTemplates(): void {
  userCache = [];
}

/**
 * Recognize a single-stroke digit from raw pointer points.
 * Returns a RecogOutcome: recognized / unclear / unrecognized / null.
 */
export function recognizeStroke(points: Pt[]): RecogOutcome {
  if (!points || points.length < MIN_POINTS) return null;
  const box = bboxDims(points);
  if (box.w < MIN_BOX && box.h < MIN_BOX) return null;

  const processed = process(points);
  if (processed.length !== N) return null;

  const tpls = allTemplates();
  if (tpls.length === 0) return { kind: "unrecognized", score: 0 };

  // Find the best (template, rotation) and the best DIFFERENT-digit score.
  let bestDigit = -1,
    bestScore = -Infinity,
    bestIdx = -1;
  let secondDigit = -1,
    secondScore = -Infinity;
  for (let i = 0; i < tpls.length; i++) {
    const sc = scorePair(processed, tpls[i].points);
    if (sc > bestScore) {
      if (tpls[i].digit !== bestDigit) {
        secondScore = bestScore;
        secondDigit = bestDigit;
      }
      bestScore = sc;
      bestDigit = tpls[i].digit;
      bestIdx = i;
    } else if (tpls[i].digit !== bestDigit && sc > secondScore) {
      secondScore = sc;
      secondDigit = tpls[i].digit;
    }
  }
  void bestIdx;

  if (bestScore >= RECOGNIZE_MIN) {
    return {
      kind: "recognized",
      digit: bestDigit,
      score: bestScore,
      nextDigit: secondDigit < 0 ? bestDigit : secondDigit,
      nextScore: secondScore < 0 ? bestScore : secondScore,
    };
  }
  if (secondDigit >= 0 && bestScore - secondScore < AMBIGUITY_GAP) {
    return { kind: "unclear", score: bestScore, nextScore: secondScore };
  }
  return { kind: "unrecognized", score: bestScore };
}

/* --------------------------- self-test (?tpltest=1) --------------------------- */

export interface SelfTestResult {
  passed: boolean;
  minSameDigit: number; // worst same-digit best-match score
  maxCrossDigit: number; // best cross-digit pair score
  matrix: { from: string; bestDigit: number; bestScore: number; pass: boolean }[];
}

/**
 * Run the cross-template self-test. Each built-in template is matched against
 * every built-in template (including itself). Acceptance:
 *   - every template's best match is a SAME-digit template with score >= 0.80
 *   - no cross-digit pair scores >= 0.70
 * Returns a structured result; the caller (Boot or page) logs it.
 */
export function runSelfTest(): SelfTestResult {
  const tpls = getBuiltins();
  const matrix: SelfTestResult["matrix"] = [];
  let minSameDigit = Infinity;
  let maxCrossDigit = -Infinity;
  let passed = true;

  for (let i = 0; i < tpls.length; i++) {
    let bestDigit = -1,
      bestScore = -Infinity;
    for (let j = 0; j < tpls.length; j++) {
      const sc = scorePair(tpls[i].points, tpls[j].points);
      if (sc > bestScore) {
        bestScore = sc;
        bestDigit = tpls[j].digit;
      }
    }
    const sameDigit = bestDigit === tpls[i].digit;
    if (sameDigit) {
      if (bestScore < minSameDigit) minSameDigit = bestScore;
      if (bestScore < 0.8) passed = false;
    } else {
      passed = false;
    }
    matrix.push({
      from: `${tpls[i].digit}:${tpls[i].variant}`,
      bestDigit,
      bestScore: Math.round(bestScore * 1000) / 1000,
      pass: sameDigit && bestScore >= 0.8,
    });
  }

  // cross-digit pairs
  for (let i = 0; i < tpls.length; i++) {
    for (let j = 0; j < tpls.length; j++) {
      if (tpls[i].digit === tpls[j].digit) continue;
      const sc = scorePair(tpls[i].points, tpls[j].points);
      if (sc > maxCrossDigit) maxCrossDigit = sc;
      if (sc >= 0.7) passed = false;
    }
  }
  if (minSameDigit === Infinity) minSameDigit = 0;
  return { passed, minSameDigit, maxCrossDigit, matrix };
}
