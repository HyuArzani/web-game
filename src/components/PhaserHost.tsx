"use client";

import { useEffect } from "react";
import Phaser from "phaser";
import Boot from "@/game/scenes/Boot";
import Game from "@/game/scenes/Game";
import { TUNING, PALETTE } from "@/game/tuning";

type Props = {
  parentRef: React.RefObject<HTMLDivElement | null>;
};

type GameWin = Window & { __KK_GAME?: Phaser.Game | null };

/*
 * Phaser + React StrictMode: a destroy-in-cleanup approach races with
 * Phaser's async destroy (canvas removal is deferred to the next frame) and
 * leaves orphaned canvases / WebGL contexts. The spec wants the game
 * "created ONCE" and to "survive the double-mount with no duplicated
 * scenes". So we keep a single module-level (window-backed for HMR) game:
 *   - First mount: create it.
 *   - StrictMode remount / HMR: reuse it, re-parent its canvas if needed.
 *
 * Phaser 3.80's boot chain is also fragile here: the SceneManager normally
 * registers its scenes via bootQueue(), which is triggered by the game
 * 'ready' event, which is fired by texturesReady(), which waits on the
 * TextureManager 'ready' event (itself dependent on a couple of default
 * Image onload callbacks). In some environments that chain never completes,
 * so scenes never register and the Boot scene's create() never runs. We
 * defensively ensure both the loop runs and the scenes are registered.
 */
export default function PhaserHost({ parentRef }: Props) {
  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) return;
    const w = window as GameWin;

    if (w.__KK_GAME && !(w.__KK_GAME as Phaser.Game & { isDestroyed?: boolean }).isDestroyed) {
      const g = w.__KK_GAME as Phaser.Game & {
        canvas: HTMLCanvasElement;
        isDestroyed?: boolean;
      };
      if (g.canvas.parentNode !== parent) parent.appendChild(g.canvas);
      ensureBooted(g);
      return;
    }

    parent.querySelectorAll("canvas").forEach((c) => c.remove());

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      backgroundColor: PALETTE.ink,
      parent,
      scale: {
        parent,
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        autoRound: true,
        width: TUNING.WIDTH,
        height: TUNING.HEIGHT,
      },
      render: {
        pixelArt: true,
        antialias: false,
        roundPixels: true,
      },
      input: {
        activePointers: 2,
      },
      fps: {
        target: 60,
      },
      scene: [Boot, Game],
    });
    w.__KK_GAME = game;
    ensureBooted(game);
  }, [parentRef]);

  return null;
}

type AnyGame = Phaser.Game & {
  isRunning: boolean;
  start: () => void;
  scene: Phaser.Scenes.SceneManager & {
    isBooted: boolean;
    _pending: unknown[];
    scenes: { sys: { settings: { key: string } } }[];
    add: (key: string, scene: unknown, autoStart?: boolean) => unknown;
    bootQueue: () => void;
  };
  _kkEnsured?: boolean;
};

/** Guarantee the main loop runs and the Boot/Game scenes are registered. */
function ensureBooted(game: Phaser.Game): void {
  const g = game as AnyGame;
  if (!g._kkEnsured) {
    // Make game.start() idempotent (texturesReady may call it, and so may we).
    const origStart = g.start.bind(g);
    g.start = function () {
      if (g.isRunning) return;
      origStart();
    };
    g._kkEnsured = true;
  }

  // Start the main loop now if the natural boot already finished.
  if (!g.isRunning) {
    try {
      g.start();
    } catch (e) {
      console.error("[PhaserHost] start failed:", e);
    }
  }

  // Last-resort fallback: if the SceneManager never registered its scenes
  // (the flaky texturesReady -> bootQueue chain), force it after a delay.
  window.setTimeout(() => {
    const sm = g.scene;
    if (sm.scenes.length === 0) {
      try {
        if (sm._pending.length === 0) {
          sm.add("Boot", Boot, true);
          sm.add("Game", Game, false);
        }
        if (!sm.isBooted) sm.bootQueue();
        if (!g.isRunning) g.start();
      } catch (e) {
        console.error("[PhaserHost] scene-boot fallback failed:", e);
      }
    }
  }, 600);
}
