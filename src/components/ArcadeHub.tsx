"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GAMES, SITE, type GameMeta } from "@/games/registry";
import { drawMap, drawKeep, KEEP_W, KEEP_H } from "@/games/kraepelin-keep/pixelmaps";
import { bestFor, runsCount } from "@/lib/storage";

const INK = "#14110f";
const BONE = "#f2e9d8";
const EMBER = "#ff6b35";
const OUTLINE = "#241c18";
const MUTED = "#8a7f72";

function reducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * ArcadeHub — the root landing page, a game-browser built from the registry.
 *
 * - ink background + slow-drifting bone star specks (CSS; static under reduced motion)
 * - header: SITE.title + SITE.tagline
 * - hero band: pixel art (keep + wiz + moon + drifting wisps) via pixelmaps.ts drawMap()
 *   onto a <canvas> (NO Phaser). Static under reduced motion.
 * - games grid: one card per playable GAMES entry; the WHOLE CARD is a single
 *   Next <Link> to /<slug>; stat line read client-side from localStorage.
 * - below: one dashed-outline "More games coming soon" non-interactive slot.
 */
export default function ArcadeHub() {
  const heroRef = useRef<HTMLCanvasElement | null>(null);
  const starRef = useRef<HTMLDivElement | null>(null);
  const [stats, setStats] = useState<{ best: number; runs: number } | null>(null);

  // Read personal best + runs count client-side.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStats({ best: bestFor(), runs: runsCount() });
  }, []);

  // Hero canvas: draw keep + wiz + moon + drifting wisps (static under reduced motion).
  useEffect(() => {
    const canvas = heroRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const SCALE = 4;
    const W = 540;
    const H = 200;
    canvas.width = W;
    canvas.height = H;
    ctx.imageSmoothingEnabled = false;

    let raf = 0;
    let t0 = performance.now();
    const rm = reducedMotion();

    const render = (t: number) => {
      const dt = rm ? 0 : (t - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      // moon top-right
      drawMap(ctx, "moon", 0, W - 28 - 16, 16, SCALE);
      // keep centered
      drawKeep(ctx, W / 2 - KEEP_W * SCALE / 2, false, 8);
      // wiz left of keep
      drawMap(ctx, "wiz", 0, W / 2 - KEEP_W * SCALE / 2 - 24 * SCALE - 8, 8, SCALE);
      // 2 drifting wisps
      const wispFrame = rm ? 0 : Math.floor(t / 140) % 4;
      const wisp1X = W * 0.25 + (rm ? 0 : Math.sin(dt * 1.2) * 20);
      const wisp1Y = 40 + (rm ? 0 : Math.sin(dt * 0.8) * 8);
      drawMap(ctx, "wisp_a", wispFrame, wisp1X, wisp1Y, SCALE);
      const wisp2X = W * 0.7 + (rm ? 0 : Math.sin(dt * 1.5 + 1) * 18);
      const wisp2Y = 60 + (rm ? 0 : Math.sin(dt * 1.0 + 2) * 10);
      drawMap(ctx, "wisp_b", wispFrame, wisp2X, wisp2Y, SCALE);
      if (!rm) raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    if (rm) render(performance.now());
    return () => cancelAnimationFrame(raf);
  }, []);

  // Drifting star specks (CSS; static under reduced motion).
  useEffect(() => {
    if (reducedMotion()) return;
    const el = starRef.current;
    if (!el) return;
    let raf = 0;
    let t0 = performance.now();
    const stars = Array.from({ length: 30 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      s: 1 + Math.random() * 2,
      d: 0.02 + Math.random() * 0.04,
      o: 0.3 + Math.random() * 0.5,
    }));
    const tick = (t: number) => {
      const dt = (t - t0) / 1000;
      el.style.setProperty("--drift", `${dt.toFixed(2)}s`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <main
      className="min-h-screen flex flex-col items-center overflow-y-auto"
      style={{ background: INK, color: BONE, position: "relative" }}
    >
      {/* Drifting star specks (CSS) */}
      <div
        ref={starRef}
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        {!reducedMotion() &&
          Array.from({ length: 30 }).map((_, i) => {
            const x = (i * 37) % 100;
            const y = (i * 53) % 100;
            const sz = 1 + ((i * 7) % 3);
            const o = 0.3 + ((i * 11) % 5) / 10;
            return (
              <span
                key={i}
                style={{
                  position: "absolute",
                  left: `${x}%`,
                  top: `${y}%`,
                  width: sz,
                  height: sz,
                  background: BONE,
                  opacity: o,
                  animation: `kk-drift ${8 + (i % 6)}s linear infinite`,
                  animationDelay: `${-i * 0.3}s`,
                }}
              />
            );
          })}
      </div>

      <style>{`
        @keyframes kk-drift {
          0% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-8px) translateX(4px); }
          100% { transform: translateY(0) translateX(0); }
        }
      `}</style>

      {/* Header */}
      <header
        className="relative z-10 flex flex-col items-center text-center pt-12 pb-6"
      >
        <h1
          style={{
            color: EMBER,
            fontSize: 48,
            lineHeight: 1,
            letterSpacing: 4,
          }}
        >
          {SITE.title.toUpperCase()}
        </h1>
        <p style={{ color: MUTED, fontSize: 13, letterSpacing: 2, marginTop: 8 }}>
          {SITE.tagline}
        </p>
      </header>

      {/* Hero band (pixel art canvas, no Phaser) */}
      <div
        className="relative z-10 mb-10"
        style={{
          width: "min(540px, 92vw)",
          border: `2px solid ${OUTLINE}`,
          background: "#1d1916",
        }}
      >
        <canvas
          ref={heroRef}
          style={{
            width: "100%",
            height: "auto",
            display: "block",
            imageRendering: "pixelated",
          }}
        />
      </div>

      {/* Games grid */}
      <section
        className="relative z-10 grid gap-4 px-4 pb-12 w-full max-w-[920px]"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        }}
      >
        {GAMES.filter((g) => g.status === "playable").map((g) => (
          <GameCard key={g.slug} game={g} stats={stats} />
        ))}

        {/* "More games coming soon" — non-interactive dashed slot */}
        <div
          aria-hidden
          style={{
            border: `2px dashed ${OUTLINE}`,
            color: MUTED,
            background: "transparent",
            minHeight: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            letterSpacing: 2,
            cursor: "default",
            opacity: 0.6,
          }}
        >
          More games coming soon
        </div>
      </section>
    </main>
  );
}

/** A single game card — the WHOLE CARD is a Next <Link> to /<slug>. */
function GameCard({ game, stats }: { game: GameMeta; stats: { best: number; runs: number } | null }) {
  const statLine = stats
    ? stats.runs > 0
      ? `Best ${stats.best.toLocaleString()} · ${stats.runs} run${stats.runs === 1 ? "" : "s"}`
      : "No runs yet"
    : "";

  return (
    <Link
      href={`/${game.slug}`}
      style={{
        pointerEvents: "auto",
        borderColor: OUTLINE,
        background: "#1d1916",
        display: "block",
        textDecoration: "none",
      }}
      className="border-2 p-4 rounded-none transition hover:brightness-125 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ff6b35]"
    >
      {/* Pixel art tile (small canvas) */}
      <GameTileArt accent={game.accent} />
      {/* Title + tagline */}
      <div style={{ marginTop: 12 }}>
        <div
          style={{
            color: game.accent,
            fontSize: 20,
            letterSpacing: 2,
            lineHeight: 1,
          }}
        >
          {game.title}
        </div>
        <div style={{ color: BONE, fontSize: 12, marginTop: 6, opacity: 0.8 }}>
          {game.tagline}
        </div>
      </div>
      {/* Stat line (client-side from localStorage) */}
      <div
        style={{
          marginTop: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ color: MUTED, fontSize: 11 }}>
          {statLine || "\u00A0"}
        </span>
        <span
          style={{
            color: INK,
            background: game.accent,
            fontSize: 11,
            letterSpacing: 2,
            padding: "4px 10px",
            border: `2px solid ${game.accent}`,
          }}
        >
          PLAY
        </span>
      </div>
    </Link>
  );
}

/** A small pixel-art tile for the card (keep + moon, no animation). */
function GameTileArt({ accent }: { accent: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const SCALE = 3;
    const W = 64 * SCALE + 28 * SCALE + 8;
    const H = 96 * SCALE;
    canvas.width = W;
    canvas.height = H;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    // moon top-right
    drawMap(ctx, "moon", 0, W - 28 * SCALE - 4, 4, SCALE);
    // keep
    drawKeep(ctx, 4, false, 0);
    void accent;
  }, [accent]);
  return (
    <canvas
      ref={ref}
      style={{
        width: "100%",
        height: "auto",
        display: "block",
        imageRendering: "pixelated",
        background: INK,
      }}
    />
  );
}
