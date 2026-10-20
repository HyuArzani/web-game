"use client";

import { useEffect, useRef, useState } from "react";
import { TUNING, LEVELS } from "../game/tuning";
import type { GameOverStats } from "../game/bridge";
import { SFX } from "../game/sfx";

type Props = {
  stats: GameOverStats;
  defaultName: string;
  onSave: (name: string) => void;
};

const BONE = "#f2e9d8";
const EMBER = "#ff6b35";
const OUTLINE = "#241c18";
const MUTED = "#8a7f72";

export default function GameOverView({ stats, defaultName, onSave }: Props) {
  const [name, setName] = useState(defaultName);
  const inputRef = useRef<HTMLInputElement>(null);
  const levelName = LEVELS[stats.level]?.name ?? "";

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    const trimmed = name.trim().slice(0, TUNING.NAME_MAX) || "ANON";
    SFX.play("ui");
    onSave(trimmed);
  };

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-6 text-center"
      style={{ pointerEvents: "auto", background: "rgba(20,17,15,0.95)" }}
    >
      <h2 style={{ color: EMBER, fontSize: 36, letterSpacing: 4 }}>
        KEEP OVERRUN
      </h2>

      <div style={{ color: MUTED, fontSize: 12, letterSpacing: 3 }}>
        {levelName}
      </div>

      <div style={{ color: BONE, fontSize: 64, lineHeight: 1 }}>
        {stats.score}
      </div>

      <div
        className="grid grid-cols-3 gap-4"
        style={{ color: BONE, fontSize: 13 }}
      >
        <Stat label="DPM" value={stats.dpm} />
        <Stat label="ACCURACY" value={`${stats.accuracy}%`} />
        <Stat label="BEST STREAK" value={stats.bestStreak} />
      </div>

      <div className="flex flex-col items-center gap-2 mt-2">
        <label
          htmlFor="kk-name"
          style={{ color: BONE, fontSize: 11, letterSpacing: 2, opacity: 0.7 }}
        >
          ENTER YOUR NAME
        </label>
        <input
          id="kk-name"
          ref={inputRef}
          value={name}
          maxLength={TUNING.NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          style={{
            pointerEvents: "auto",
            width: 220,
            textAlign: "center",
            background: "#1d1916",
            borderColor: OUTLINE,
            color: BONE,
            fontFamily: "inherit",
          }}
          className="border-2 px-3 py-2 text-base outline-none focus:border-[#ff6b35]"
        />
        <button
          onClick={submit}
          style={{
            pointerEvents: "auto",
            borderColor: EMBER,
            color: "#14110f",
            background: EMBER,
          }}
          className="mt-1 min-w-[180px] px-6 py-3 border-2 text-base tracking-wider active:translate-y-px hover:brightness-110 transition"
        >
          SAVE
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      <div style={{ color: EMBER, fontSize: 22 }}>{value}</div>
      <div style={{ opacity: 0.7, letterSpacing: 1 }}>{label}</div>
    </div>
  );
}
