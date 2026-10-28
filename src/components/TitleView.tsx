"use client";

import { useState } from "react";
import { isCoarsePointer } from "@/game/tuning";

type Props = {
  onPlay: () => void;
  onLeaderboard: () => void;
  sfxOn: boolean;
  onToggleSfx: (v: boolean) => void;
};

const BONE = "#f2e9d8";
const EMBER = "#ff6b35";
const OUTLINE = "#241c18";
const INK = "#14110f";
const MUTED = "#8a7f72";

function Btn({
  children,
  onClick,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        pointerEvents: "auto",
        borderColor: primary ? EMBER : OUTLINE,
        color: primary ? INK : BONE,
        background: primary ? EMBER : "#1d1916",
      }}
      className="min-w-[200px] px-6 py-3 border-2 text-lg tracking-wider active:translate-y-px hover:brightness-110 transition"
    >
      {children}
    </button>
  );
}

export default function TitleView({
  onPlay,
  onLeaderboard,
  sfxOn,
  onToggleSfx,
}: Props) {
  // Desktop gets a controls hint line; mobile gets a different one.
  // (Computed once; safe during SSR as false.)
  const [coarse] = useState(() =>
    typeof window !== "undefined" ? isCoarsePointer() : false,
  );

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-8 text-center"
      style={{ pointerEvents: "auto", background: "rgba(20,17,15,0.92)" }}
    >
      <div>
        <h1
          style={{ color: EMBER, fontSize: 44, lineHeight: 1, letterSpacing: 2 }}
        >
          KRAEPELIN
        </h1>
        <h1
          style={{ color: BONE, fontSize: 44, lineHeight: 1.1, letterSpacing: 6 }}
        >
          KEEP
        </h1>
      </div>
      <p style={{ color: BONE, fontSize: 12, opacity: 0.7, maxWidth: 320 }}>
        Defend the keep. Each wisp shows a sum — add it and tap the last digit.
      </p>
      <div className="flex flex-col gap-3 items-center">
        <Btn onClick={onPlay} primary>
          PLAY
        </Btn>
        <Btn onClick={onLeaderboard}>LEADERBOARD</Btn>
      </div>

      <button
        onClick={() => onToggleSfx(!sfxOn)}
        aria-pressed={sfxOn}
        style={{
          pointerEvents: "auto",
          borderColor: OUTLINE,
          color: sfxOn ? BONE : MUTED,
          background: "#1d1916",
        }}
        className="px-4 py-2 border-2 text-xs tracking-widest active:translate-y-px"
      >
        SOUND: {sfxOn ? "ON" : "OFF"}
      </button>

      {/* Controls hint — one line, different per platform */}
      <div
        style={{
          color: MUTED,
          fontSize: 10,
          letterSpacing: 1,
          opacity: 0.8,
        }}
      >
        {coarse ? "Tap numbers to cast" : "0-9 or tap to cast · ESC to pause"}
      </div>
    </div>
  );
}
