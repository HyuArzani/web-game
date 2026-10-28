"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getUserTemplates,
  setUserStrokes,
  clearUserTemplates,
} from "@/lib/storage";
import type { Pt } from "@/game/gesture";
import { SFX } from "@/game/sfx";

type Props = {
  onClose: () => void;
};

const BONE = "#f2e9d8";
const EMBER = "#ff6b35";
const OUTLINE = "#241c18";
const MUTED = "#8a7f72";
const INK = "#14110f";

/**
 * Strokes / Teach overlay. Two tabs:
 *   - "Strokes guide": shows the 10 built-in template digits (read-only).
 *   - "Teach your style": draw each digit 0-9 three times; strokes are saved
 *     to localStorage (kk_tpl_v1) and merged into the recognizer at boot.
 *
 * Never auto-opened, never blocks gameplay. A settings tool.
 */
export default function StrokesView({ onClose }: Props) {
  const [tab, setTab] = useState<"guide" | "teach">("teach");
  const [digit, setDigit] = useState(0);
  const [captured, setCaptured] = useState<Pt[][]>([]);
  const [saved, setSaved] = useState<Record<number, number>>({});

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef<Pt[]>([]);

  // Load how many strokes are already saved per digit.
  useEffect(() => {
    const all = getUserTemplates();
    const counts: Record<number, number> = {};
    for (let d = 0; d <= 9; d++) {
      const arr = all[String(d)];
      counts[d] = Array.isArray(arr) ? arr.length : 0;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(counts);
  }, [tab, digit]);

  const clearCanvas = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
  }, []);

  // Reset captured strokes when switching digit or tab.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCaptured([]);
    clearCanvas();
  }, [digit, tab, clearCanvas]);

  const getPos = (e: React.PointerEvent): Pt => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * c.width,
      y: ((e.clientY - r.top) / r.height) * c.height,
    };
  };

  const onDown = (e: React.PointerEvent) => {
    if (tab !== "teach") return;
    e.preventDefault();
    const c = canvasRef.current;
    if (c) {
      try {
        c.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    drawingRef.current = true;
    currentStrokeRef.current = [getPos(e)];
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const p = getPos(e);
    const last = currentStrokeRef.current[currentStrokeRef.current.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) >= 2) {
      currentStrokeRef.current.push(p);
      const ctx = canvasRef.current!.getContext("2d")!;
      ctx.strokeStyle = BONE;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
  };

  const onUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const stroke = currentStrokeRef.current;
    currentStrokeRef.current = [];
    if (stroke.length >= 8) {
      setCaptured((c) => {
        const next = [...c, stroke];
        // auto-save after 3 captures
        if (next.length >= 3) {
          setUserStrokes(digit, next);
          SFX.play("ui");
          setSaved((s) => ({ ...s, [digit]: next.length }));
        }
        return next;
      });
    } else {
      // sub-threshold: clear the canvas line just drawn (don't count it)
      clearCanvas();
      // redraw the already-captured strokes faintly
      // (simplest: just clear; the captured count stays)
    }
  };

  const resetDigit = () => {
    setUserStrokes(digit, []);
    SFX.play("ui");
    setSaved((s) => ({ ...s, [digit]: 0 }));
    setCaptured([]);
    clearCanvas();
  };

  const resetAll = () => {
    clearUserTemplates();
    SFX.play("ui");
    const counts: Record<number, number> = {};
    for (let d = 0; d <= 9; d++) counts[d] = 0;
    setSaved(counts);
    setCaptured([]);
    clearCanvas();
  };

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-4"
      style={{ pointerEvents: "auto", background: "rgba(20,17,15,0.97)" }}
    >
      <h2 style={{ color: EMBER, fontSize: 26, letterSpacing: 4 }}>STROKES</h2>

      {/* Tabs */}
      <div className="flex gap-1">
        {(["teach", "guide"] as const).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                pointerEvents: "auto",
                borderColor: active ? EMBER : OUTLINE,
                color: active ? INK : BONE,
                background: active ? EMBER : "#1d1916",
              }}
              className="px-4 py-2 border-2 text-xs tracking-widest active:translate-y-px"
            >
              {t === "teach" ? "TEACH YOUR STYLE" : "STROKES GUIDE"}
            </button>
          );
        })}
      </div>

      {tab === "teach" ? (
        <>
          {/* Digit selector */}
          <div className="flex flex-wrap gap-1 justify-center max-w-[460px]">
            {Array.from({ length: 10 }, (_, d) => (
              <button
                key={d}
                onClick={() => setDigit(d)}
                style={{
                  pointerEvents: "auto",
                  borderColor: d === digit ? EMBER : OUTLINE,
                  color: d === digit ? INK : BONE,
                  background: d === digit ? EMBER : "#1d1916",
                }}
                className="w-9 h-9 border-2 text-sm active:translate-y-px"
              >
                {d}
              </button>
            ))}
          </div>

          {/* Drawing canvas */}
          <canvas
            ref={canvasRef}
            width={300}
            height={300}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            style={{
              pointerEvents: "auto",
              background: INK,
              border: `2px solid ${OUTLINE}`,
              touchAction: "none",
              imageRendering: "pixelated",
            }}
          />

          <div style={{ color: MUTED, fontSize: 11 }}>
            Draw the digit {digit} three times. Captured: {captured.length}/3 ·
            Saved: {saved[digit] ?? 0}
          </div>

          <div className="flex gap-3">
            <button
              onClick={resetDigit}
              style={{
                pointerEvents: "auto",
                borderColor: OUTLINE,
                color: BONE,
                background: "#1d1916",
              }}
              className="px-4 py-2 border-2 text-xs tracking-widest active:translate-y-px"
            >
              RESET DIGIT {digit}
            </button>
            <button
              onClick={resetAll}
              style={{
                pointerEvents: "auto",
                borderColor: OUTLINE,
                color: BONE,
                background: "#1d1916",
              }}
              className="px-4 py-2 border-2 text-xs tracking-widest active:translate-y-px"
            >
              RESET MY STYLE
            </button>
          </div>

          <div style={{ color: MUTED, fontSize: 10, maxWidth: 380 }}>
            More data = better match. Your saved strokes are merged with the
            built-in templates at boot. This is a settings tool, not a tutorial.
          </div>
        </>
      ) : (
        <div
          className="flex flex-wrap gap-2 justify-center max-w-[460px]"
          style={{ color: MUTED, fontSize: 12 }}
        >
          <div className="w-full mb-2" style={{ color: BONE }}>
            Built-in single-stroke templates (one stroke per digit).
          </div>
          {Array.from({ length: 10 }, (_, d) => (
            <div
              key={d}
              className="flex flex-col items-center"
              style={{ pointerEvents: "none" }}
            >
              <div
                style={{
                  width: 44,
                  height: 56,
                  border: `2px solid ${OUTLINE}`,
                  background: INK,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: BONE,
                  fontSize: 28,
                }}
              >
                {d}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onClose}
        style={{
          pointerEvents: "auto",
          borderColor: EMBER,
          color: INK,
          background: EMBER,
        }}
        className="mt-2 min-w-[160px] px-6 py-3 border-2 text-base tracking-wider active:translate-y-px hover:brightness-110 transition"
      >
        CLOSE
      </button>
    </div>
  );
}
