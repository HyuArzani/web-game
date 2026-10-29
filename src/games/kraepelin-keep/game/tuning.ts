/*
=============================================================================
  KRAEPELIN KEEP — game/tuning.ts
  One place for every magic number. No other file should hard-code gameplay
  constants. Palette lives here too so pixelart.ts / scenes share one source.

  ---------------------------------------------------------------------------
  ART & SFX HOOKUPS  (1:1 replacement targets)
  ---------------------------------------------------------------------------
  Replace the generated canvas textures / synthesized SFX below with real
  assets later by loading them under the EXACT SAME KEYS. Zero code change.

  TEXTURE KEYS (baked at boot in Boot scene, see game/pixelart.ts):
    wisp_a  spritesheet  24x24  4 frames  (flutter cycle, round head)   -- foe variant 1
    wisp_b  spritesheet  24x24  4 frames  (flutter cycle, teardrop)    -- foe variant 2
    wisp_c  spritesheet  24x24  4 frames  (flutter cycle, two horns)   -- foe variant 3
    wiz     spritesheet  24x32  3 frames  (idle A / idle B / cast flare) -- defender (flavor)
    keep    spritesheet  64x96  2 frames  (pristine / cracked)         -- the keep
    wall    spritesheet  32x12  3 frames  (brick variants)             -- wall strip tiles
    moon    image        28x28  1 frame   (bone disc w/ craters)       -- sky
    star    image         2x2   1 frame   (bone speck)                 -- bg + trail + sparkles

  REMOVED: slime, bolt, mote, gesture/stroke/teach/recog. Casts are
  screen-effect-only; input is the universal Answer Pad + PC keyboard.

  NON-TEXTURE TEXT (Phaser Text, not sprites): the per-wisp "a + b" question,
  the floating "+100". Silkscreen font.

  SFX KEYS (WebAudio-synthesized in game/sfx.ts):
    cast_0 .. cast_9  -- per-digit element cast sound (pitch/waveform per element)
    cast              -- fallback cast sound (used when no digit given)
    fizzle            -- wrong cast (noise + buzz)
    kill              -- wisp popped (high pop)
    wallHit           -- wisp reached the wall (low thud)
    gameover          -- run ended (descending tones)
    ui                -- button / countdown tick (short click)
=============================================================================
*/

export const PALETTE = {
  ink: "#14110f",
  bone: "#f2e9d8",
  ember: "#ff6b35",
  outline: "#241c18",
  // FX-ONLY palette additions (never used for UI chrome)
  fxSpark: "#cfe3ff",
  fxGale: "#7fd8c8",
} as const;

export type PaletteName = keyof typeof PALETTE;

export const TUNING = {
  // ---- Internal resolution ----
  WIDTH: 540,
  HEIGHT: 960,

  // ---- Vertical battlefield layout ----
  // The Answer Pad occupies the bottom ~150px (in overlay coords). The wall
  // strip + wall line sit JUST ABOVE the pad zone so enemies land at the wall
  // and never overlap or fall behind the pad.
  PAD_ZONE_HEIGHT: 150, // React overlay pad occupies this much at the bottom (540-ref)

  WISP_SPAWN_Y: -36,
  WISP_SPAWN_X_MIN: 90,
  WISP_SPAWN_X_MAX: 450,
  WISP_SCALE: 3,
  QUESTION_FONT_SIZE: "22px",
  QUESTION_OFFSET_Y: -52,

  // Wall strip (32x12 tiles @2x = 64x24). Sits just above the pad zone.
  WALL_TILE_W: 64,
  WALL_TILE_H: 24,
  WALL_TOP_Y: 810, // top of the wall strip (HEIGHT - PAD_ZONE_HEIGHT - 0)
  WALL_CONTACT_Y: 804, // wisp.container.y >= this => wall hit (just above wall)

  // Keep (64x96 @2x = 128x192). Sits centered on the wall.
  KEEP_X: 270,
  KEEP_BOTTOM_Y: 810, // bottom of keep = top of wall
  KEEP_SCALE: 2,
  KEEP_CRACK_HP_THRESHOLD: 2,

  // Wizard (64x64 frames @3x). Stands on the wall, bottom-left (flavor).
  WIZ_X: 70,
  WIZ_BOTTOM_Y: 810,
  WIZ_SCALE: 3,

  // Moon (28x28). Fixed top-right in the sky.
  // NOTE: Moon is DISABLED in the daytime redesign — see CLOUDS + PORTAL below.
  // The moon field is kept for backward-compat but Game.ts no longer renders it.
  MOON_X: 470,
  MOON_Y: 90,
  MOON_ALPHA: 0.85,

  // ---- Daytime clouds (added in UI-redesign task) ----
  // Procedural cloud sprites drift horizontally at varied speeds + wrap.
  CLOUD_COUNT: 5,
  CLOUD_MIN_SCALE: 1.2,
  CLOUD_MAX_SCALE: 2.6,
  CLOUD_MIN_SPEED: 0.008, // px/ms (slow)
  CLOUD_MAX_SPEED: 0.022,
  CLOUD_MIN_Y: 60,
  CLOUD_MAX_Y: 260,
  CLOUD_ALPHA: 0.92,

  // ---- Portal-castle tower (added in UI-redesign task) ----
  // A compact castle tower rises BEHIND the wall (between bg and wall).
  // The glowing portal is the focal point. The existing castle.png is drawn
  // first; the portal layer is drawn on top of the castle, below the wall.
  // castle.png is 200x197, positioned at KEEP_X=270, bottom-y=810, origin (0.5,1)
  // → spans x:170-370, y:613-810. The portal sits on the upper-middle wall
  // face (sprite-y ≈ 125 → game-y ≈ 738).
  PORTAL_CX: 270, // center x of the portal (= KEEP_X)
  PORTAL_CY: 738, // center y of the portal (upper-middle castle wall)
  PORTAL_R: 16, // portal core radius (px)
  PORTAL_RING_R: 24, // outer rotating ring radius
  PORTAL_PULSE_MS: 1800, // pulse cycle duration
  PORTAL_ROTATE_MS: 6000, // rune ring rotation period
  PORTAL_BEAM_H: 90, // vertical beam height above portal
  PORTAL_BEAM_W: 7, // beam width

  // ---- Wisp sway (sine) ----
  SWAY_AMPLITUDE: 28,
  SWAY_FREQ_PER_MS: 0.0019,

  // ---- Wisp flutter trail (ambient specks) ----
  WISP_TRAIL_INTERVAL_MS: 180,
  WISP_TRAIL_LIFE_MS: 400,
  WISP_TRAIL_CAP: 40,

  // ---- UNIFIED pacing (per-LEVEL now; see LEVELS below). These are the
  //      legacy fallback values; the active level's LEVELS entry overrides. ----
  FALL_TIME: 9000, // ms to fall spawn->wall
  FALL_FLOOR: 4500, // fall ramp floor (not currently enforced as a floor)
  SPAWN_INTERVAL: 2800, // ms between spawns
  SPAWN_FLOOR: 1200, // ramp floor
  RAMP_EVERY: 8, // correct casts before interval shrinks
  RAMP_FACTOR: 0.96,

  // ---- Airborne concurrency ----
  AIRBORN_CAP_1: 2, // first EARLY_PHASE_1 correct casts
  AIRBORN_CAP_2: 3, // next EARLY_PHASE_2 correct casts
  AIRBORN_CAP_3: 4, // after that
  EARLY_PHASE_1: 8,
  EARLY_PHASE_2: 30,

  // ---- Kraepelin digit stream (legacy; per-level generator now) ----
  DIGIT_MIN: 1, // operands are 1-9
  DIGIT_MAX: 9,
  DIGIT_PICK_TRIES: 20, // max re-rolls to satisfy the uniqueness rule (per-level)

  // ---- Gameplay ----
  WALL_HP: 5,
  SCORE_PER_CAST: 100,
  GO_FLASH_MS: 600,
  GO_DOUBLE_SPAWN_DELAY: 800,
  FIRST_SPAWN_DELAY: 200,

  // ---- Input locks ----
  WRONG_LOCK: 500, // ms after a wrong cast (digit matches no enemy)

  // ---- Screen effects (all alphas / durations here) ----
  POP_DURATION: 120,
  POP_SCALE: 1.7,
  FLOAT_PLUS100_MS: 650,
  FLOAT_RISE: 34,
  EMBER_BLINK_ALPHA: 0.10,
  EMBER_BLINK_MS: 95,
  WIZ_PULSE_MS: 120,
  // Wizard spell-cast animation (per-digit spell overlay at the staff tip)
  SPELL_CAST_MS: 350, // total cast animation duration (~250-450ms range)
  SPELL_WINDUP_MS: 80, // wind-up before the spell effect appears
  SPELL_HOLD_MS: 200, // spell effect visible duration
  SPELL_FADE_MS: 70, // spell effect fade-out
  // Staff tip position in game coords (where spell effects appear)
  STAFF_TIP_X: 82, // WIZ_X + (16-12)*WIZ_SCALE = 70 + 12
  STAFF_TIP_Y: 726, // WIZ_BOTTOM_Y - (32-4)*WIZ_SCALE = 810 - 84
  // Wizard reaction animations (tween-based, no new PNGs needed)
  WIZ_HIT_MS: 200, // castle-hit reaction: recoil + red tint
  WIZ_HIT_RECOIL: 6, // px backward recoil
  WIZ_WRONG_MS: 280, // wrong-answer reaction: shake + ember tint
  WIZ_WRONG_SHAKE: 3, // px shake amplitude
  WIZ_DEFEAT_MS: 700, // game-over defeat: slump + fade
  WIZ_DEFEAT_DROP: 8, // px downward slump
  RED_BLINK_ALPHA: 0.08,
  RED_BLINK_MS: 90,
  FIZZLE_SPARKLE_LIFE_MS: 260,
  WALL_BLINK_ALPHA: 0.15,
  SHAKE_DURATION: 150,
  SHAKE_INTENSITY: 0.006,

  // ---- Ten element spell effects (castFx) — durations / counts ----
  FX_MS: 360, // base duration for most effects (~300-450ms)
  FX_MS_LONG: 450,
  FX_PARTICLE_MAX: 14, // max particles per effect
  // per-effect params
  FX_VOID_RING_R: 50,
  FX_VOID_RING_MS: 360,
  FX_LIGHTNING_SEGMENTS: 5,
  FX_LIGHTNING_FLICKER_MS: 60,
  FX_ECHO_CLONES: 3,
  FX_ECHO_STAGGER_MS: 60,
  FX_EMBER_COUNT: 12,
  FX_STONE_COUNT: 8,
  FX_STONE_SHAKE: 2,
  FX_STARBURST_LINES: 5,
  FX_GALE_ARC_DEG: 270,
  FX_GALE_MS: 400,
  FX_CROSS_MS: 300,
  FX_CHAIN_ARC_MS: 250,
  FX_CHAIN_MAX_TARGETS: 2, // cosmetic arcs to nearest other enemies (no damage)
  FX_MOON_COL_ALPHA: 0.35,
  FX_MOON_COL_MS: 150,

  // ---- Answer Pad (React overlay, 540-ref coords) ----
  PAD_BTN_W: 88, // >=88px wide at 540 ref
  PAD_BTN_H: 64, // >=64px tall
  PAD_GAP: 12,
  PAD_ROWS: 2,
  PAD_COLS: 5,
  PAD_TOP_DIGITS: [1, 2, 3, 4, 5],
  PAD_BOT_DIGITS: [6, 7, 8, 9, 0],

  // ---- Reduced motion ----
  // When prefers-reduced-motion: replace each FX with a single soft color
  // pulse at the enemy; skip camera shake; halve blink alphas.

  // ---- Countdown (React) ----
  COUNTDOWN_STEP_MS: 400,

  // ---- Stars (background specks) ----
  STAR_COUNT: 46,

  // ---- Storage ----
  LB_MAX: 200, // raised so per-level boards stay populated (prune lowest globally)
  LB_PER_LEVEL: 20, // top 20 shown per level tab
  NAME_MAX: 12,
  LB_KEY: "kk_lb_v1",
  SETTINGS_KEY: "kk_settings_v1",
} as const;

/* ===================== LEVEL CONFIG =====================
   Single LEVELS object. Each level defines: operations, airborne progression
   (caps + phase thresholds), spawn/fall pacing (start -> floor), ramp, and
   a penalty flag. All level logic reads from here — nothing level-specific
   lives outside tuning.ts + the Game scene generator.

   Airborne progression: an array of {cap, until} pairs evaluated in order;
   the first whose `until` (correct-cast count) is > correctCount wins.
   The last entry has until = Infinity (the cap).

   ops: the set of operators this level uses.
   backlash: if true, a wrong cast deals 1 wallHP (veryHard only).
*/
export type Op = "+" | "-" | "x" | "/";
export type LevelKey =
  | "veryEasy"
  | "easy"
  | "normal"
  | "hard"
  | "veryHard";

export type LevelConfig = {
  key: LevelKey;
  name: string;
  desc: string;
  ops: Op[];
  airborne: { cap: number; until: number }[];
  spawnStart: number;
  spawnFloor: number;
  fallStart: number;
  fallFloor: number;
  rampEvery: number;
  rampFactor: number;
  backlash: boolean; // wrong cast deals 1 wallHP
};

export const LEVELS: Record<LevelKey, LevelConfig> = {
  veryEasy: {
    key: "veryEasy",
    name: "VERY EASY",
    desc: "Sums up to 9 · no tricks",
    ops: ["+"],
    airborne: [
      { cap: 1, until: 12 },
      { cap: 2, until: Infinity },
    ],
    spawnStart: 4500,
    spawnFloor: 3000,
    fallStart: 14000,
    fallFloor: 10000,
    rampEvery: 10,
    rampFactor: 0.97,
    backlash: false,
  },
  easy: {
    key: "easy",
    name: "EASY",
    desc: "Addition · answers over 9? Take the last digit",
    ops: ["+"],
    airborne: [
      { cap: 2, until: 10 },
      { cap: 3, until: Infinity },
    ],
    spawnStart: 3500,
    spawnFloor: 2000,
    fallStart: 12000,
    fallFloor: 8000,
    rampEvery: 8,
    rampFactor: 0.96,
    backlash: false,
  },
  normal: {
    key: "normal",
    name: "NORMAL",
    desc: "Addition + subtraction",
    ops: ["+", "-"],
    airborne: [
      { cap: 2, until: 8 },
      { cap: 3, until: 25 },
      { cap: 4, until: Infinity },
    ],
    spawnStart: 3000,
    spawnFloor: 1600,
    fallStart: 10000,
    fallFloor: 6000,
    rampEvery: 8,
    rampFactor: 0.96,
    backlash: false,
  },
  hard: {
    key: "hard",
    name: "HARD",
    desc: "x and / join in · last digit of the result",
    ops: ["+", "-", "x", "/"],
    airborne: [
      { cap: 3, until: 8 },
      { cap: 4, until: Infinity },
    ],
    spawnStart: 2600,
    spawnFloor: 1400,
    fallStart: 9000,
    fallFloor: 5000,
    rampEvery: 8,
    rampFactor: 0.95,
    backlash: false,
  },
  veryHard: {
    key: "veryHard",
    name: "VERY HARD",
    desc: "Everything, faster · wrong answers hurt the keep",
    ops: ["+", "-", "x", "/"],
    airborne: [
      { cap: 3, until: 6 },
      { cap: 4, until: 20 },
      { cap: 5, until: Infinity },
    ],
    spawnStart: 2200,
    spawnFloor: 1100,
    fallStart: 7500,
    fallFloor: 4000,
    rampEvery: 6,
    rampFactor: 0.95,
    backlash: true,
  },
};

export const LEVEL_ORDER: LevelKey[] = [
  "veryEasy",
  "easy",
  "normal",
  "hard",
  "veryHard",
];

/** Legacy fallback level for entries without an `lv` field. */
export const DEFAULT_LEVEL: LevelKey = "easy";

/**
 * Cast source for leaderboard `mode` tracking: "keys" (physical keyboard) or
 * "pad" (the on-screen Answer Pad). The run's mode is the majority source.
 */
export type Mode = "keys" | "pad";

/**
 * Detect a coarse pointer (touch) device. Used to decide whether keyboard
 * hint text is shown (desktop only). The Answer Pad is ALWAYS visible on
 * every platform; keyboard casting is desktop-only but always functional
 * there regardless of mode.
 */
export function isCoarsePointer(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

/** Respect prefers-reduced-motion (cached after first call). */
let _reduced: boolean | null = null;
export function reducedMotion(): boolean {
  if (_reduced !== null) return _reduced;
  if (typeof window === "undefined" || !window.matchMedia) {
    _reduced = false;
    return false;
  }
  _reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return _reduced;
}
