"use client";

import { useEffect, useState } from "react";
import { TUNING, LEVELS, type LevelKey } from "../game/tuning";
import { SFX } from "../game/sfx";

type Props = {
  level: LevelKey;
  onDone: () => void;
};

const BONE = "#f2e9d8";
const EMBER = "#ff6b35";
const MUTED = "#8a7f72";

export default function CountdownOverlay({ level, onDone }: Props) {
  const [n, setN] = useState(3);

  useEffect(() => {
    SFX.play("ui");
    const stepMs = TUNING.COUNTDOWN_STEP_MS;
    const t1 = window.setTimeout(() => {
      setN(2);
      SFX.play("ui");
    }, stepMs);
    const t2 = window.setTimeout(() => {
      setN(1);
      SFX.play("ui");
    }, stepMs * 2);
    const t3 = window.setTimeout(() => {
      onDone();
    }, stepMs * 3);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [onDone]);

  const name = LEVELS[level]?.name ?? "";

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-6 text-center"
      style={{ pointerEvents: "auto", background: "rgba(20,17,15,0.94)" }}
    >
      <div style={{ color: EMBER, fontSize: 18, letterSpacing: 4 }}>{name}</div>
      <div style={{ color: BONE, fontSize: 88, lineHeight: 1 }}>{n}</div>
      <div style={{ color: MUTED, fontSize: 10, letterSpacing: 1 }}>
        {LEVELS[level]?.desc}
      </div>
    </div>
  );
}
