"use client";

import type { HudState } from "../game/bridge";

type Props = {
  hud: HudState;
  onPause: () => void;
};

/**
 * React HUD overlay — redesigned (Task ID 12) to match the reference's ornate
 * fantasy panels: three navy-blue inset panels with gold beveled borders across
 * the top (SCORE · STREAK · HP), each bound to live game state. The pause
 * button sits to the right of the HP panel.
 *
 * Pointer-events: none except the pause button, so the canvas (questions,
 * wisps) + the Answer Pad stay interactive during play.
 *
 * The per-wisp "a + b" questions and the floating "+100" live on the CANVAS
 * (Game scene), not here — the HUD only shows wall HP, score, streak, and the
 * pause button.
 */

// Palette (matches tuning.ts PALETTE + reference gold/navy)
const INK = "#14110f";
const OUTLINE = "#241c18";
const BONE = "#f2e9d8";
const GOLD = "#d4af37";
const GOLD_HI = "#ffe066";
const GOLD_LO = "#8a6d1f";
const NAVY = "#1a1f3c";
const NAVY_HI = "#2a3258";
const NAVY_LO = "#0e1228";
const EMBER = "#ff6b35";
const RED = "#e23b3b";

const PANEL_LABEL: Record<"score" | "streak" | "hp", string> = {
  score: "SCORE",
  streak: "STREAK",
  hp: "HP",
};

/**
 * One ornate panel: navy fill, 2px gold border with a lighter top/left edge
 * (beveled), dark bottom/right edge, and a 1px ink outline. Label on top in
 * small bone caps; value below in large bold gold numerals.
 */
function Panel({
  kind,
  children,
}: {
  kind: "score" | "streak" | "hp";
  children: React.ReactNode;
}) {
  return (
    <div
      data-kk={`panel-${kind}`}
      className="relative flex flex-col items-center justify-center"
      style={{
        minWidth: 84,
        padding: "4px 10px 5px",
        background: NAVY,
        borderColor: GOLD,
        // Layered borders: outer ink outline, inner gold bevel.
        boxShadow: `0 0 0 2px ${OUTLINE}, inset 2px 2px 0 0 ${GOLD_HI}, inset -2px -2px 0 0 ${GOLD_LO}`,
        borderRadius: 4,
      }}
    >
      {/* Label */}
      <div
        style={{
          color: BONE,
          fontSize: 10,
          letterSpacing: 1.5,
          lineHeight: 1,
          fontFamily: "Silkscreen, 'Courier New', monospace",
          opacity: 0.9,
        }}
      >
        {PANEL_LABEL[kind]}
      </div>
      {/* Value */}
      <div
        style={{
          color: kind === "hp" ? BONE : GOLD_HI,
          fontSize: kind === "hp" ? 18 : 22,
          lineHeight: 1.1,
          fontFamily: "Silkscreen, 'Courier New', monospace",
          fontWeight: 700,
          textShadow: kind === "hp" ? "none" : `1px 1px 0 ${NAVY_LO}`,
          marginTop: 2,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Pixel-art heart (filled red with dark outline + bone highlight). */
function Heart({ filled }: { filled: boolean }) {
  return (
    <svg
      width="14"
      height="12"
      viewBox="0 0 14 12"
      aria-hidden
      style={{ display: "block", shapeRendering: "crispEdges" }}
    >
      {/* outline */}
      <path
        d="M2 1 h3 v1 h1 v1 h2 v-1 h1 v-1 h3 v2 h1 v4 h-1 v1 h-1 v1 h-1 v1 h-2 v1 h-2 v-1 h-2 v-1 h-1 v-1 h-1 v-1 h-1 v-4 h1 z"
        fill={OUTLINE}
      />
      {/* fill */}
      {filled && (
        <path
          d="M3 2 h2 v1 h1 v1 h2 v-1 h1 v-1 h2 v1 h1 v3 h-1 v1 h-1 v1 h-1 v1 h-1 v1 h-1 v-1 h-1 v-1 h-1 v-1 h-1 v-1 h-1 v-3 h1 z"
          fill={RED}
        />
      )}
      {/* highlight pixel */}
      {filled && <rect x={4} y={3} width={1} height={1} fill={BONE} />}
    </svg>
  );
}

export default function HudOverlay({ hud, onPause }: Props) {
  const maxHP = 5;
  const hearts = Array.from({ length: maxHP }, (_, i) => i);
  return (
    <div
      className="absolute inset-0 select-none"
      style={{ pointerEvents: "none" }}
    >
      {/* Top HUD: three ornate panels + pause button. Safe-area aware. */}
      <div
        className="absolute left-0 right-0 flex items-start justify-between gap-2 px-2"
        style={{
          top: "max(env(safe-area-inset-top, 0px), 6px)",
        }}
      >
        {/* SCORE (left) */}
        <Panel kind="score">
          <span data-kk="score">{hud.score}</span>
        </Panel>

        {/* STREAK (center) */}
        <Panel kind="streak">
          <span data-kk="streak">{hud.streak}</span>
        </Panel>

        {/* HP (right, with heart icons) + PAUSE button */}
        <div className="flex items-start gap-2">
          <Panel kind="hp">
            <div className="flex items-center gap-1" data-kk="hearts">
              {hearts.map((i) => (
                <Heart key={i} filled={i < hud.wallHP} />
              ))}
            </div>
          </Panel>

          {/* Pause button — gold/ink, >=44px target */}
          <button
            onClick={onPause}
            aria-label="Pause"
            data-kk="pause"
            style={{
              pointerEvents: "auto",
              width: 40,
              height: 40,
              background: NAVY,
              borderColor: GOLD,
              boxShadow: `0 0 0 2px ${OUTLINE}, inset 2px 2px 0 0 ${GOLD_HI}, inset -2px -2px 0 0 ${GOLD_LO}`,
              borderRadius: 4,
              cursor: "pointer",
            }}
            className="flex items-center justify-center active:translate-y-px"
          >
            <span
              style={{
                display: "inline-block",
                width: 4,
                height: 14,
                background: BONE,
                marginRight: 3,
              }}
            />
            <span
              style={{
                display: "inline-block",
                width: 4,
                height: 14,
                background: BONE,
              }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
