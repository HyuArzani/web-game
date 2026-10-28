"use client";

import { LEVELS, type LevelKey } from "@/game/tuning";

type Props = {
  level: LevelKey;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
};

const BONE = "#f2e9d8";
const EMBER = "#ff6b35";
const OUTLINE = "#241c18";
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
        color: primary ? "#14110f" : BONE,
        background: primary ? EMBER : "#1d1916",
      }}
      className="min-w-[180px] px-6 py-3 border-2 text-base tracking-wider active:translate-y-px hover:brightness-110 transition"
    >
      {children}
    </button>
  );
}

export default function PauseView({
  level,
  onResume,
  onRestart,
  onQuit,
}: Props) {
  const name = LEVELS[level]?.name ?? "";
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center"
      style={{ pointerEvents: "auto", background: "rgba(20,17,15,0.86)" }}
    >
      <h2 style={{ color: EMBER, fontSize: 36, letterSpacing: 4 }}>PAUSED</h2>
      <div style={{ color: MUTED, fontSize: 12, letterSpacing: 2 }}>{name}</div>
      <div className="flex flex-col gap-3 mt-2">
        <Btn onClick={onResume} primary>
          RESUME
        </Btn>
        <Btn onClick={onRestart}>RESTART</Btn>
        <Btn onClick={onQuit}>QUIT</Btn>
      </div>
    </div>
  );
}
