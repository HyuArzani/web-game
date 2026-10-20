"use client";

/**
 * games/kraepelin-keep/index.tsx — the client entry for the Kraepelin Keep game.
 *
 * View state machine (explicit union — no implicit skipping):
 *   title -> levelselect -> countdown -> playing -> paused -> gameover -> leaderboard
 *   Any state can go back to title. ?lv=<key> preselects on LevelSelect (never auto-starts).
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import GameCanvas from "./components/GameCanvas";
import HudOverlay from "./components/HudOverlay";
import AnswerPad from "./components/AnswerPad";
import TitleView from "./components/TitleView";
import LevelSelectView from "./components/LevelSelectView";
import CountdownOverlay from "./components/CountdownOverlay";
import PauseView from "./components/PauseView";
import GameOverView from "./components/GameOverView";
import LeaderboardView from "./components/LeaderboardView";
import { bridge, EV, type HudState, type GameOverStats } from "./game/bridge";
import { SFX } from "./game/sfx";
import { TUNING, DEFAULT_LEVEL, type LevelKey } from "./game/tuning";
import {
  getSettings,
  saveSettings,
  getLeaderboard,
  addLeaderboardEntry,
  type LBEntry,
} from "../../lib/storage";

type View =
  | "title"
  | "levelselect"
  | "countdown"
  | "playing"
  | "paused"
  | "gameover"
  | "leaderboard";

const EMPTY_HUD: HudState = {
  score: 0,
  streak: 0,
  wallHP: TUNING.WALL_HP,
};

/** Check if a string is a valid LevelKey. */
function isValidLevel(s: unknown): s is LevelKey {
  return (
    s === "veryEasy" ||
    s === "easy" ||
    s === "normal" ||
    s === "hard" ||
    s === "veryHard"
  );
}

export function KraepelinKeepGame() {
  const [view, setView] = useState<View>("title");
  const [hud, setHud] = useState<HudState>(EMPTY_HUD);
  const [stats, setStats] = useState<GameOverStats | null>(null);
  const [entries, setEntries] = useState<LBEntry[]>([]);
  const [name, setName] = useState("");
  const [sfxOn, setSfxOn] = useState(true);
  const [level, setLevel] = useState<LevelKey>("veryEasy");
  const [lbLevel, setLbLevel] = useState<LevelKey>("easy");
  const [scale, setScale] = useState(1);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<View>(view);
  const levelRef = useRef<LevelKey>(level);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);
  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  /* ---- load persisted settings + ?lv= deep link on mount ---- */
  useEffect(() => {
    const s = getSettings();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(s.name);
    setSfxOn(s.sfx);
    SFX.setEnabled(s.sfx);
    setLevel(s.lv ?? "veryEasy");
    setLbLevel(s.lbLevel ?? "easy");

    // ?lv=<key> deep link: preselect ONLY, never auto-start
    if (typeof window !== "undefined" && window.location) {
      try {
        const params = new URLSearchParams(window.location.search);
        const lvParam = params.get("lv");
        if (isValidLevel(lvParam)) {
          setLevel(lvParam);
        }
      } catch {
        /* ignore */
      }
    }
  }, []);

  /* ---- pause / resume helpers ---- */
  const doPause = useCallback(() => {
    setView((v) => {
      if (v === "playing") {
        bridge.emit(EV.setPaused, true);
        return "paused";
      }
      return v;
    });
  }, []);

  const doResume = useCallback(() => {
    setView((v) => {
      if (v === "paused") {
        bridge.emit(EV.resume);
        return "playing";
      }
      return v;
    });
  }, []);

  /* ---- bridge subscriptions (Phaser -> React) ---- */
  useEffect(() => {
    const offHud = bridge.on<HudState>(EV.hud, (h) => {
      setHud(h);
    });
    const offOver = bridge.on<GameOverStats>(EV.gameover, (s) => {
      setStats(s);
      setView("gameover");
    });
    const offPause = bridge.on(EV.pauseRequested, () => {
      doPause();
    });
    return () => {
      offHud();
      offOver();
      offPause();
    };
  }, [doPause]);

  /* ---- window Esc (toggle) + blur/visibility (auto-pause) ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (viewRef.current === "playing") doPause();
        else if (viewRef.current === "paused") doResume();
      }
    };
    const onBlur = () => {
      if (viewRef.current === "playing") doPause();
    };
    const onVis = () => {
      if (document.hidden && viewRef.current === "playing") doPause();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [doPause, doResume]);

  /* ---- responsive stage scaling ---- */
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entriesArr) => {
      const w = entriesArr[0]?.contentRect.width ?? TUNING.WIDTH;
      setScale(w / TUNING.WIDTH);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---- run flow: Title -> Level Select -> countdown -> playing ---- */
  const onPlay = useCallback(() => {
    SFX.play("ui");
    setView("levelselect");
  }, []);

  const onSelectLevel = useCallback((lv: LevelKey) => {
    SFX.play("ui");
    setLevel(lv);
    saveSettings({ lv });
    SFX.init();
    SFX.setEnabled(sfxOn);
    setHud({ ...EMPTY_HUD });
    setView("countdown");
  }, [sfxOn]);

  const onCountdownDone = useCallback(() => {
    bridge.emit(EV.start, { level: levelRef.current });
    setView("playing");
  }, []);

  const onRestart = useCallback(() => {
    SFX.play("ui");
    bridge.emit(EV.restart);
    SFX.init();
    SFX.setEnabled(sfxOn);
    setHud({ ...EMPTY_HUD });
    setView("countdown");
  }, [sfxOn]);

  const onQuit = useCallback(() => {
    SFX.play("ui");
    bridge.emit(EV.quit);
    setView("title");
  }, []);

  const onSaveScore = useCallback(
    (n: string) => {
      if (!stats) return;
      const next = addLeaderboardEntry({
        n,
        s: stats.score,
        mode: stats.mode,
        lv: stats.level,
        dpm: stats.dpm,
        acc: stats.accuracy,
      });
      setLbLevel(stats.level);
      saveSettings({ name: n, lbLevel: stats.level });
      setName(n);
      setView("leaderboard");
    },
    [stats],
  );

  const onToggleSfx = useCallback((v: boolean) => {
    setSfxOn(v);
    SFX.setEnabled(v);
    saveSettings({ sfx: v });
    if (v) SFX.play("ui");
  }, []);

  const showLeaderboard = useCallback(() => {
    setView("leaderboard");
  }, []);

  const onSelectLbLevel = useCallback((lv: LevelKey) => {
    setLbLevel(lv);
    saveSettings({ lbLevel: lv });
  }, []);

  const aspect = TUNING.WIDTH / TUNING.HEIGHT;

  return (
    <main className="fixed inset-0 flex items-center justify-center bg-[#14110f] overflow-hidden">
      <div
        ref={stageRef}
        className="relative"
        style={{
          width: `min(100vw, calc(100vh * ${aspect}))`,
          height: `min(100vh, calc(100vw / ${aspect}))`,
          background: "#14110f",
        }}
      >
        <GameCanvas parentRef={stageRef} />

        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: TUNING.WIDTH,
            height: TUNING.HEIGHT,
            transform: `scale(${scale})`,
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          {(view === "playing" || view === "paused") && (
            <HudOverlay hud={hud} onPause={doPause} />
          )}

          {view === "playing" && <AnswerPad disabled={false} />}

          {view === "title" && (
            <TitleView
              onPlay={onPlay}
              onLeaderboard={showLeaderboard}
              sfxOn={sfxOn}
              onToggleSfx={onToggleSfx}
            />
          )}

          {view === "levelselect" && (
            <LevelSelectView
              selected={level}
              onSelect={onSelectLevel}
              onBack={() => setView("title")}
            />
          )}

          {view === "countdown" && (
            <CountdownOverlay level={level} onDone={onCountdownDone} />
          )}

          {view === "paused" && (
            <PauseView
              level={level}
              onResume={doResume}
              onRestart={onRestart}
              onQuit={onQuit}
            />
          )}

          {view === "gameover" && stats && (
            <GameOverView
              stats={stats}
              defaultName={name}
              onSave={onSaveScore}
            />
          )}

          {view === "leaderboard" && (
            <LeaderboardView
              defaultLevel={lbLevel}
              onBack={() => setView("title")}
              onSelectLevel={onSelectLbLevel}
            />
          )}
        </div>
      </div>
    </main>
  );
}
