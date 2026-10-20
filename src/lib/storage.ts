/*
  lib/storage.ts — localStorage-only persistence, fully try/catch wrapped.
  No network, no backend. Safe to call during SSR (guards typeof window).

  Keys:
    kk_lb_v1      : Leaderboard  { n, s, mode, lv, dpm, acc, t }[]
                    (cap 200 globally; prune lowest scores; top 20 shown per level)
    kk_settings_v1: Settings     { name, sfx, bestStreak, lv, lbLevel }

  `mode` is the run's dominant cast source ("keys" | "pad"). Informational.
  `lv` is the run's level key ("veryEasy" | "easy" | "normal" | "hard" | "veryHard").
  `lbLevel` is the last-selected leaderboard tab (persisted).

  NOTE: the keys + cap are duplicated here (not imported from the game) so
  lib/storage stays decoupled from the Phaser game bundle.
*/

// localStorage keys + cap (mirror of TUNING in the game's tuning.ts)
const LB_KEY = "kk_lb_v1";
const SETTINGS_KEY = "kk_settings_v1";
const LB_MAX = 200;
const LB_PER_LEVEL = 20;

// Level keys duplicated here so lib/storage stays Phaser-free.
export type LevelKey =
  | "veryEasy"
  | "easy"
  | "normal"
  | "hard"
  | "veryHard";

const DEFAULT_LEVEL: LevelKey = "easy";

export type LBMode = "keys" | "pad";

export type LBEntry = {
  n: string; // name
  s: number; // score
  mode: LBMode;
  lv?: LevelKey; // level key (legacy entries without lv -> "easy")
  dpm: number;
  acc: number; // accuracy percent (0-100)
  t: number; // epoch ms
};

export type Settings = {
  name: string;
  sfx: boolean;
  bestStreak: number;
  lv: LevelKey; // last-played level (default "veryEasy")
  lbLevel: LevelKey; // last-selected leaderboard tab
};

const DEFAULT_SETTINGS: Settings = {
  name: "",
  sfx: true,
  bestStreak: 0,
  lv: "veryEasy",
  lbLevel: "easy",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full / disabled — ignore.
  }
}

export function getSettings(): Settings {
  const s = read<Partial<Settings>>(SETTINGS_KEY, {});
  return { ...DEFAULT_SETTINGS, ...s };
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch };
  write(SETTINGS_KEY, next);
  return next;
}

/** All leaderboard entries (cap LB_MAX, sorted by score desc). */
export function getLeaderboard(): LBEntry[] {
  const list = read<LBEntry[]>(LB_KEY, []);
  if (!Array.isArray(list)) return [];
  return list
    .filter((e) => e && typeof e.s === "number")
    .sort((a, b) => b.s - a.s)
    .slice(0, LB_MAX);
}

/** Normalize an entry's level (legacy entries without lv -> DEFAULT_LEVEL). */
export function entryLevel(e: LBEntry): LevelKey {
  const lv = e.lv;
  if (
    lv === "veryEasy" ||
    lv === "easy" ||
    lv === "normal" ||
    lv === "hard" ||
    lv === "veryHard"
  ) {
    return lv;
  }
  return DEFAULT_LEVEL;
}

/** Leaderboard entries for a specific level (top LB_PER_LEVEL). */
export function getLeaderboardForLevel(level: LevelKey): LBEntry[] {
  return getLeaderboard()
    .filter((e) => entryLevel(e) === level)
    .slice(0, LB_PER_LEVEL);
}

/** Best score for a specific level (0 if none). */
export function bestScoreForLevel(level: LevelKey): number {
  const list = getLeaderboardForLevel(level);
  return list.length > 0 ? list[0].s : 0;
}

export function addLeaderboardEntry(entry: Omit<LBEntry, "t">): LBEntry[] {
  const full: LBEntry = { ...entry, t: Date.now() };
  const next = [...getLeaderboard(), full]
    .sort((a, b) => b.s - a.s)
    .slice(0, LB_MAX);
  write(LB_KEY, next);
  return next;
}

export function getBestStreak(): number {
  return getSettings().bestStreak ?? 0;
}

export function maybeUpdateBestStreak(streak: number): number {
  const cur = getBestStreak();
  if (streak > cur) {
    saveSettings({ bestStreak: streak });
    return streak;
  }
  return cur;
}

/* ---- Hub helpers (read-only, guarded for SSR) ---- */

/** Best score across ALL leaderboard entries (0 if none). Used by the hub. */
export function bestFor(): number {
  const list = getLeaderboard();
  return list.length > 0 ? list[0].s : 0;
}

/** Total number of leaderboard runs (0 if none). Used by the hub. */
export function runsCount(): number {
  return getLeaderboard().length;
}
