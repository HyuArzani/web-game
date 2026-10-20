"use client";

import { useEffect, useState } from "react";
import { LEVEL_ORDER, LEVELS } from "../game/tuning";
import type { LevelKey } from "../game/tuning";
import {
  getLeaderboardForLevel,
  entryLevel,
  type LBEntry,
} from "../../../lib/storage";

type Props = {
  defaultLevel: LevelKey;
  onBack: () => void;
  onSelectLevel?: (lv: LevelKey) => void;
};

const BONE = "#f2e9d8";
const EMBER = "#ff6b35";
const OUTLINE = "#241c18";
const MUTED = "#8a7f72";
const INK = "#14110f";

export default function LeaderboardView({
  defaultLevel,
  onBack,
  onSelectLevel,
}: Props) {
  const [tab, setTab] = useState<LevelKey>(defaultLevel);
  const [entries, setEntries] = useState<LBEntry[]>([]);

  useEffect(() => {
    setEntries(getLeaderboardForLevel(tab));
  }, [tab]);

  const onTab = (lv: LevelKey) => {
    setTab(lv);
    onSelectLevel?.(lv);
  };

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-4"
      style={{ pointerEvents: "auto", background: "rgba(20,17,15,0.97)" }}
    >
      <h2 style={{ color: EMBER, fontSize: 26, letterSpacing: 4 }}>LEADERBOARD</h2>

      <div className="flex flex-wrap gap-1 justify-center max-w-[480px]">
        {LEVEL_ORDER.map((k) => {
          const active = tab === k;
          return (
            <button
              key={k}
              onClick={() => onTab(k)}
              style={{
                pointerEvents: "auto",
                borderColor: active ? EMBER : OUTLINE,
                color: active ? INK : BONE,
                background: active ? EMBER : "#1d1916",
              }}
              className="px-2 py-1 border-2 text-[10px] tracking-widest active:translate-y-px"
              aria-pressed={active}
            >
              {LEVELS[k].name}
            </button>
          );
        })}
      </div>

      <div
        className="w-full max-w-[460px] border-2 kk-scroll overflow-y-auto"
        style={{ borderColor: OUTLINE, maxHeight: 460, background: "#1d1916" }}
      >
        <table className="w-full text-left" style={{ fontSize: 12 }}>
          <thead>
            <tr style={{ color: MUTED, background: "#241c18" }}>
              <th className="py-2 px-2 w-8">#</th>
              <th className="py-2 px-2">NAME</th>
              <th className="py-2 px-2 text-right">SCORE</th>
              <th className="py-2 px-2 text-center">MODE</th>
              <th className="py-2 px-2 text-right">DPM</th>
              <th className="py-2 px-2 text-right">ACC</th>
              <th className="py-2 px-2 text-right">DATE</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="py-8 text-center"
                  style={{ color: MUTED }}
                >
                  No runs yet for this level.
                </td>
              </tr>
            )}
            {entries.map((e, i) => (
              <tr
                key={`${e.t}-${i}`}
                style={{
                  color: BONE,
                  background: i % 2 === 0 ? "transparent" : "rgba(36,28,24,0.5)",
                }}
              >
                <td className="py-1.5 px-2" style={{ color: EMBER }}>
                  {i + 1}
                </td>
                <td className="py-1.5 px-2 truncate max-w-[110px]">{e.n}</td>
                <td className="py-1.5 px-2 text-right">{e.s}</td>
                <td className="py-1.5 px-2 text-center" style={{ color: MUTED }}>
                  {e.mode === "keys" ? "K" : e.mode === "pad" ? "P" : e.mode}
                </td>
                <td className="py-1.5 px-2 text-right">{e.dpm}</td>
                <td className="py-1.5 px-2 text-right">{e.acc}%</td>
                <td className="py-1.5 px-2 text-right" style={{ color: MUTED }}>
                  {fmtDate(e.t)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={onBack}
        style={{
          pointerEvents: "auto",
          borderColor: EMBER,
          color: "#14110f",
          background: EMBER,
        }}
        className="mt-2 min-w-[140px] px-5 py-2 border-2 text-sm tracking-wider active:translate-y-px hover:brightness-110 transition"
      >
        BACK
      </button>
    </div>
  );
}

function fmtDate(t: number): string {
  try {
    const d = new Date(t);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
}
