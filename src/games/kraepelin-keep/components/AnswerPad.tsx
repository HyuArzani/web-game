"use client";

import { useCallback, useEffect, useState } from "react";
import { bridge, EV } from "../game/bridge";
import { TUNING } from "../game/tuning";
import { SFX } from "../game/sfx";

type Props = {
  disabled: boolean;
};

const BONE = "#f2e9d8";
const EMBER = "#ff6b35";
const OUTLINE = "#241c18";
const INK = "#14110f";

// Per-digit FX accent bar color (digit -> element color, visual only).
const FX_COLORS: Record<number, string> = {
  0: "#cfe3ff", // fxSpark — void ring
  1: "#cfe3ff", // fxSpark — lightning
  2: "#cfc2a6", // boneShade — echo blink
  3: "#ff6b35", // ember — ember burst
  4: "#3d342b", // stoneLight — stone shatter
  5: "#fffaf0", // boneHi — starburst
  6: "#7fd8c8", // fxGale — gale spiral
  7: "#fffaf0", // boneHi — cross slash
  8: "#cfe3ff", // fxSpark — chain zap
  9: "#f2e9d8", // bone — moon flare
};

/**
 * Universal Answer Pad — always visible during gameplay on EVERY platform.
 * Two rows of five buttons in FIXED order (top: 1 2 3 4 5, bottom: 6 7 8 9 0),
 * identical to a PC keyboard's top row. Tap emits bridge "cast" {digit}.
 *
 * React owns rendering; Phaser is the single source of game truth. During a
 * wrong-cast lock (Phaser emits "lock" {ms}) the pad dims + disables for
 * that duration.
 *
 * Each button has a 3px bottom accent bar in its element's FX color — visual
 * only, teaches the digit->spell pair.
 */
export default function AnswerPad({ disabled }: Props) {
  const [locked, setLocked] = useState(false);

  // Listen for Phaser's "lock" event to dim the pad during a wrong-cast lock.
  useEffect(() => {
    const off = bridge.on<{ ms: number }>(EV.lock, (p) => {
      if (!p) return;
      setLocked(true);
      window.setTimeout(() => setLocked(false), p.ms);
    });
    return off;
  }, []);

  const onCast = useCallback(
    (digit: number) => {
      if (disabled || locked) return;
      SFX.play("ui");
      bridge.emit(EV.cast, { digit });
    },
    [disabled, locked],
  );

  const padDisabled = disabled || locked;

  const renderBtn = (digit: number) => {
    const accent = FX_COLORS[digit] ?? BONE;
    return (
      <button
        key={digit}
        onClick={() => onCast(digit)}
        disabled={padDisabled}
        aria-label={`Cast ${digit}`}
        data-kk={`pad-${digit}`}
        style={{
          pointerEvents: padDisabled ? "none" : "auto",
          width: TUNING.PAD_BTN_W,
          height: TUNING.PAD_BTN_H,
          background: padDisabled ? INK : undefined,
          borderColor: BONE,
          color: BONE,
          opacity: padDisabled ? 0.4 : 1,
          position: "relative",
          touchAction: "none",
        }}
        className="border-2 flex items-center justify-center text-2xl tracking-wider active:scale-95 active:bg-[#ff6b35] hover:brightness-125 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ff6b35] disabled:cursor-not-allowed"
      >
        {digit}
        {/* 3px bottom accent bar in the element's FX color */}
        <span
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            background: accent,
          }}
        />
      </button>
    );
  };

  return (
    <div
      className="absolute left-0 right-0 flex flex-col items-center gap-3"
      style={{
        bottom: "env(safe-area-inset-bottom, 0px)",
        paddingBottom: 8,
        pointerEvents: "none",
      }}
    >
      <div className="flex gap-3" style={{ pointerEvents: "none" }}>
        {TUNING.PAD_TOP_DIGITS.map(renderBtn)}
      </div>
      <div className="flex gap-3" style={{ pointerEvents: "none" }}>
        {TUNING.PAD_BOT_DIGITS.map(renderBtn)}
      </div>
    </div>
  );
}
