"use client";

import type { HudState } from "@/game/bridge";

type Props = {
  hud: HudState;
  onPause: () => void;
};

const BONE = "#f2e9d8";
const EMBER = "#ff6b35";
const OUTLINE = "#241c18";

/**
 * React HUD overlay. Pointer-events: none except the pause button, so the
 * canvas (questions, wisps) + the Answer Pad stay interactive during play.
 *
 * The per-wisp "a + b" questions and the floating "+100" live on the CANVAS
 * (Game scene), not here — the HUD only shows wall HP, score, streak, and
 * the pause button.
 */
export default function HudOverlay({ hud, onPause }: Props) {
  const segs = Array.from({ length: 5 }, (_, i) => i);
  return (
    <div
      className="absolute inset-0 select-none"
      style={{ pointerEvents: "none" }}
    >
      {/* Wall HP segments — top-left */}
      <div className="absolute top-3 left-3 flex gap-1" data-kk="hearts">
        {segs.map((i) => (
          <div
            key={i}
            className="w-4 h-5 border-2"
            data-kk={i < hud.wallHP ? "heart-on" : "heart-off"}
            style={{
              borderColor: OUTLINE,
              background: i < hud.wallHP ? EMBER : "transparent",
            }}
            aria-label={i < hud.wallHP ? "wall intact" : "wall broken"}
          />
        ))}
      </div>

      {/* Score + streak — top-right */}
      <div
        className="absolute top-3 right-16 text-right leading-none"
        data-kk="scorebox"
      >
        <div style={{ color: BONE, fontSize: 22 }} data-kk="score">
          {hud.score}
        </div>
        <div style={{ color: EMBER, fontSize: 13 }} data-kk="streak">
          streak {hud.streak}
        </div>
      </div>

      {/* Pause button — top-right, >=44px target */}
      <button
        onClick={onPause}
        aria-label="Pause"
        data-kk="pause"
        style={{
          pointerEvents: "auto",
          borderColor: OUTLINE,
          background: "#1d1916",
          color: BONE,
          width: 44,
          height: 44,
        }}
        className="absolute top-2 right-2 border-2 flex items-center justify-center active:translate-y-px"
      >
        <span
          style={{
            display: "inline-block",
            width: 4,
            height: 16,
            background: BONE,
            marginRight: 3,
          }}
        />
        <span
          style={{ display: "inline-block", width: 4, height: 16, background: BONE }}
        />
      </button>
    </div>
  );
}
