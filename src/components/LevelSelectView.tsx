"use client";

import { useEffect, useState } from "react";
import { LEVELS, LEVEL_ORDER, type LevelKey } from "@/game/tuning";
import { bestScoreForLevel } from "@/lib/storage";
import { SFX } from "@/game/sfx";

type Props = {
  selected: LevelKey;
  onSelect: (level: LevelKey) => void;
  onBack: () => void;
};

const BONE = "#f2e9d8";
const EMBER = "#ff6b35";
const OUTLINE = "#241c18";
const INK = "#14110f";
const MUTED = "#8a7f72";

/**
 * Level Select — five level cards in a vertical list, each showing the level
 * name, one-line description, and personal best score for that level.
 * The selected level is ember-highlighted. Back returns to Title.
 * No level locking — all five always available.
 */
export default function LevelSelectView({ selected, onSelect, onBack }: Props) {
  // personal bests per level (read once on mount)
  const [bests, setBests] = useState<Record<string, number>>({});
  useEffect(() => {
    const b: Record<string, number> = {};
    for (const k of LEVEL_ORDER) b[k] = bestScoreForLevel(k);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBests(b);
  }, []);

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-4"
      style={{ pointerEvents: "auto", background: "rgba(20,17,15,0.95)" }}
    >
      <h2 style={{ color: EMBER, fontSize: 28, letterSpacing: 4 }}>
        SELECT LEVEL
      </h2>

      <div
        className="w-full max-w-[460px] flex flex-col gap-2 kk-scroll overflow-y-auto"
        style={{ maxHeight: 560 }}
      >
        {LEVEL_ORDER.map((k) => {
          const cfg = LEVELS[k];
          const isSel = selected === k;
          return (
            <button
              key={k}
              onClick={() => {
                SFX.play("ui");
                onSelect(k);
              }}
              style={{
                pointerEvents: "auto",
                borderColor: isSel ? EMBER : OUTLINE,
                background: isSel ? "#2a1d16" : "#1d1916",
              }}
              className="border-2 px-4 py-3 text-left active:translate-y-px hover:brightness-125 transition flex items-center justify-between gap-3"
              aria-pressed={isSel}
            >
              <div className="flex flex-col">
                <span
                  style={{
                    color: isSel ? EMBER : BONE,
                    fontSize: 16,
                    letterSpacing: 2,
                  }}
                >
                  {cfg.name}
                </span>
                <span style={{ color: MUTED, fontSize: 11 }}>
                  {cfg.desc}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span style={{ color: MUTED, fontSize: 9, letterSpacing: 1 }}>
                  BEST
                </span>
                <span
                  style={{
                    color: bests[k] > 0 ? BONE : MUTED,
                    fontSize: 18,
                  }}
                >
                  {bests[k] > 0 ? bests[k] : "--"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={onBack}
        style={{
          pointerEvents: "auto",
          borderColor: OUTLINE,
          color: BONE,
          background: "#1d1916",
        }}
        className="mt-2 min-w-[140px] px-5 py-2 border-2 text-sm tracking-wider active:translate-y-px hover:brightness-125 transition"
      >
        BACK
      </button>
    </div>
  );
}
