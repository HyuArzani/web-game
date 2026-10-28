/*
  game/bridge.ts — the ONLY React <-> Phaser communication channel.

  A tiny typed EventEmitter (no Phaser import, so React components can import
  it without Phaser being loaded). A single shared instance is exported.

  Phaser -> React:
    "hud"           { score, streak, wallHP }  (emitted only on change)
    "gameover"      { score, dpm, accuracy, bestStreak, mode, level }
    "pauseRequested" ()  (Esc pressed inside Phaser while running)
    "lock"          { ms }  (wrong-cast lock started; pad dims for this duration)

  React -> Phaser:
    "cast"      { digit: number }  Answer Pad tap or keyboard digit
    "start"     { level: LevelKey }  reset + begin a run (after countdown)
    "resume"    ()   unfreeze the game scene
    "restart"   ()   clear everything (React then runs countdown + start)
    "quit"      ()   clear + go idle
    "setPaused" (boolean)  freeze / unfreeze scene movement & tweens
*/

import type { LevelKey } from "./tuning";

export type HudState = {
  score: number;
  streak: number;
  wallHP: number;
};

export type GameOverStats = {
  score: number;
  dpm: number;
  accuracy: number;
  bestStreak: number;
  mode: "keys" | "pad";
  level: LevelKey;
};

export type CastPayload = {
  digit: number;
};

export type LockPayload = {
  ms: number;
};

export type StartPayload = {
  level: LevelKey;
};

type Handler<T> = (payload: T) => void;

class Bridge {
  private listeners: Record<string, Set<Handler<any>>> = {};

  on<T>(event: string, fn: Handler<T>): () => void {
    (this.listeners[event] ||= new Set()).add(fn);
    return () => this.off(event, fn);
  }

  off<T>(event: string, fn: Handler<T>): void {
    this.listeners[event]?.delete(fn);
  }

  emit<T>(event: string, payload?: T): void {
    const set = this.listeners[event];
    if (!set) return;
    for (const fn of [...set]) {
      try {
        fn(payload as T);
      } catch (e) {
        // Never let one listener break the chain.
        if (typeof console !== "undefined") console.error("[bridge]", event, e);
      }
    }
  }

  removeAllListeners(): void {
    this.listeners = {};
  }
}

export const bridge = new Bridge();

// Event name constants (avoids stringly-typed typos).
export const EV = {
  hud: "hud",
  gameover: "gameover",
  pauseRequested: "pauseRequested",
  lock: "lock",
  cast: "cast",
  start: "start",
  resume: "resume",
  restart: "restart",
  quit: "quit",
  setPaused: "setPaused",
} as const;
