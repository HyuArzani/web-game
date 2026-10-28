"use client";

import { useCallback, useEffect, useState } from "react";
import { bridge, EV } from "../game/bridge";
import { TUNING } from "../game/tuning";
import { SFX } from "../game/sfx";

type Props = {
  disabled: boolean;
};

// Palette (matches reference: dark navy buttons, gold edging, stone-brick frame)
const OUTLINE = "#241c18";
const INK = "#14110f";
const BONE = "#f2e9d8";
const GOLD = "#d4af37";
const GOLD_HI = "#ffe066";
const GOLD_LO = "#8a6d1f";
const NAVY = "#1a237e";
const NAVY_HI = "#2c3aa0";
const NAVY_LO = "#0e1448";
const STONE = "#5a5048";
const STONE_HI = "#7a6e62";
const STONE_LO = "#3a342e";

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
 * Universal Answer Pad — redesigned (Task ID 12) to match the reference's
 * stone-brick-framed keypad with dark-blue gem buttons + gold edging.
 *
 * Always visible during gameplay on EVERY platform. Two rows of five buttons
 * in FIXED order (top: 1 2 3 4 5, bottom: 6 7 8 9 0), identical to a PC
 * keyboard's top row. Tap emits bridge "cast" {digit}.
 *
 * React owns rendering; Phaser is the single source of game truth. During a
 * wrong-cast lock (Phaser emits "lock" {ms}) the pad dims + disables for
 * that duration.
 *
 * Each button has a 3px bottom accent bar in its element's FX color — visual
 * only, teaches the digit->spell pair.
 *
 * The whole keypad sits inside a stone-brick frame (Graphics via CSS layered
 * box-shadows) integrated into the lower screen, with optional side banners.
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
          // Dark navy gem face
          background: padDisabled ? INK : NAVY,
          // Gold beveled border (layered box-shadows + outline)
          boxShadow: padDisabled
            ? `0 0 0 2px ${OUTLINE}`
            : `0 0 0 2px ${OUTLINE}, inset 2px 2px 0 0 ${NAVY_HI}, inset -2px -2px 0 0 ${NAVY_LO}, inset 0 0 0 2px ${GOLD}`,
          opacity: padDisabled ? 0.4 : 1,
          position: "relative",
          touchAction: "none",
          color: BONE,
          borderRadius: 6,
          cursor: padDisabled ? "not-allowed" : "pointer",
        }}
        className="flex items-center justify-center active:translate-y-px hover:brightness-110 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ff6b35]"
      >
        <span
          style={{
            fontFamily: "Silkscreen, 'Courier New', monospace",
            fontSize: 28,
            fontWeight: 700,
            color: BONE,
            textShadow: `2px 2px 0 ${NAVY_LO}`,
            lineHeight: 1,
          }}
        >
          {digit}
        </span>
        {/* 3px bottom accent bar in the element's FX color */}
        <span
          style={{
            position: "absolute",
            bottom: 0,
            left: 4,
            right: 4,
            height: 3,
            background: accent,
            opacity: 0.9,
          }}
        />
      </button>
    );
  };

  return (
    <div
      className="absolute left-0 right-0 flex justify-center"
      style={{
        bottom: "env(safe-area-inset-bottom, 0px)",
        paddingBottom: 6,
        pointerEvents: "none",
      }}
    >
      {/* Stone-brick frame: a wide container with layered stone-colored
          box-shadows (outer ink outline, stone bevel, inner mortar groove)
          holding the 2x5 button grid. */}
      <div
        data-kk="keypad-frame"
        style={{
          position: "relative",
          padding: "10px 12px 12px",
          background: STONE,
          boxShadow: `0 0 0 3px ${OUTLINE}, inset 2px 2px 0 0 ${STONE_HI}, inset -2px -2px 0 0 ${STONE_LO}, inset 0 6px 0 0 ${STONE_LO}, inset 0 -6px 0 0 ${STONE_LO}`,
          borderRadius: 8,
          pointerEvents: "none",
        }}
      >
        {/* Brick mortar lines (decorative, pseudo-row of bricks above buttons) */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 2,
            left: 8,
            right: 8,
            height: 4,
            backgroundImage: `repeating-linear-gradient(90deg, ${STONE_LO} 0 1px, transparent 1px 12px)`,
            opacity: 0.6,
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: 4,
            left: 8,
            right: 8,
            height: 4,
            backgroundImage: `repeating-linear-gradient(90deg, ${STONE_LO} 0 1px, transparent 1px 14px)`,
            opacity: 0.6,
          }}
        />

        {/* 2x5 button grid */}
        <div className="flex flex-col gap-2" style={{ pointerEvents: "none" }}>
          <div className="flex gap-2" style={{ pointerEvents: "none" }}>
            {TUNING.PAD_TOP_DIGITS.map(renderBtn)}
          </div>
          <div className="flex gap-2" style={{ pointerEvents: "none" }}>
            {TUNING.PAD_BOT_DIGITS.map(renderBtn)}
          </div>
        </div>

        {/* Side banners (decorative gold-trimmed navy banners flanking the
            keypad) — purely visual, no interaction. */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: -10,
            top: 10,
            bottom: 10,
            width: 6,
            background: NAVY,
            boxShadow: `0 0 0 1px ${OUTLINE}, inset 1px 0 0 0 ${GOLD}`,
            opacity: 0.85,
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            right: -10,
            top: 10,
            bottom: 10,
            width: 6,
            background: NAVY,
            boxShadow: `0 0 0 1px ${OUTLINE}, inset -1px 0 0 0 ${GOLD}`,
            opacity: 0.85,
          }}
        />
      </div>
    </div>
  );
}
