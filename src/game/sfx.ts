/*
  game/sfx.ts — WebAudio-synthesized sound effects. No audio files.

  SFX keys: cast_0..cast_9 (per-digit element variants), cast (fallback),
  fizzle, kill, wallHit, gameover, ui.
  (see ART & SFX HOOKUPS in game/tuning.ts)

  The AudioContext is created / resumed lazily on first user gesture
  (the Play click via SFX.init()) so autoplay policies (esp. iOS) are honored.
  Respects the sound toggle (SFX.setEnabled).
*/

type SfxKey =
  | "cast"
  | "cast_digit"
  | "fizzle"
  | "kill"
  | "wallHit"
  | "gameover"
  | "ui";

class SfxEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;

  /** Call on a user gesture (Play click). Creates + resumes the context. */
  init(): void {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Play a sound. Pass a digit 0-9 to play the per-digit element cast variant
   * (cast_0..cast_9); falls back to the generic "cast" sound.
   */
  play(key: SfxKey, digit?: number): void {
    if (!this.enabled) return;
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    if (key === "cast_digit" && digit !== undefined) {
      this.castDigit(digit, now);
      return;
    }
    switch (key) {
      case "cast":
        this.tone({ freq: 420, freqEnd: 820, type: "square", dur: 0.09, vol: 0.5, now });
        break;
      case "fizzle":
        this.noise({ dur: 0.18, vol: 0.4, now });
        this.tone({ freq: 150, freqEnd: 70, type: "sawtooth", dur: 0.18, vol: 0.3, now });
        break;
      case "kill":
        this.tone({ freq: 660, freqEnd: 1320, type: "triangle", dur: 0.08, vol: 0.45, now });
        break;
      case "wallHit":
        this.tone({ freq: 130, freqEnd: 60, type: "sine", dur: 0.22, vol: 0.6, now });
        this.noise({ dur: 0.12, vol: 0.3, now });
        break;
      case "gameover":
        this.tone({ freq: 440, freqEnd: 440, type: "square", dur: 0.18, vol: 0.4, now });
        this.tone({ freq: 330, freqEnd: 330, type: "square", dur: 0.18, vol: 0.4, now: now + 0.2 });
        this.tone({ freq: 220, freqEnd: 180, type: "square", dur: 0.4, vol: 0.4, now: now + 0.4 });
        break;
      case "ui":
        this.tone({ freq: 760, freqEnd: 760, type: "square", dur: 0.05, vol: 0.35, now });
        break;
    }
  }

  /** Per-digit element cast sound (cast_0..cast_9). Varies pitch + waveform. */
  private castDigit(digit: number, now: number): void {
    // Base frequency + waveform per element (0-9). All WebAudio synth.
    const profiles: { freq: number; freqEnd: number; type: OscillatorType; dur: number; vol: number }[] = [
      { freq: 220, freqEnd: 110, type: "sine", dur: 0.18, vol: 0.5 },     // 0 VOID — low sine sweep
      { freq: 880, freqEnd: 1760, type: "sawtooth", dur: 0.06, vol: 0.45 },// 1 LIGHTNING — bright zap
      { freq: 520, freqEnd: 520, type: "triangle", dur: 0.1, vol: 0.45 }, // 2 ECHO — clean tone
      { freq: 380, freqEnd: 760, type: "square", dur: 0.09, vol: 0.5 },   // 3 EMBER — rising square
      { freq: 160, freqEnd: 80, type: "sawtooth", dur: 0.16, vol: 0.5 },  // 4 STONE — low crunch
      { freq: 720, freqEnd: 1080, type: "triangle", dur: 0.08, vol: 0.45 },// 5 STARBURST — bright tri
      { freq: 300, freqEnd: 600, type: "sine", dur: 0.14, vol: 0.5 },     // 6 GALE — airy sweep
      { freq: 640, freqEnd: 1280, type: "square", dur: 0.07, vol: 0.45 }, // 7 CROSS — sharp slash
      { freq: 480, freqEnd: 960, type: "sawtooth", dur: 0.1, vol: 0.45 }, // 8 CHAIN — linked zap
      { freq: 560, freqEnd: 280, type: "sine", dur: 0.14, vol: 0.5 },     // 9 MOON — soft descent
    ];
    const p = profiles[digit] ?? profiles[3];
    this.tone({ ...p, now });
    if (digit === 4) this.noise({ dur: 0.1, vol: 0.25, now }); // stone crunch noise
    if (digit === 8) this.tone({ freq: p.freqEnd, freqEnd: p.freq, type: "square", dur: 0.06, vol: 0.3, now: now + 0.05 });
  }

  private tone(opts: {
    freq: number;
    freqEnd?: number;
    type: OscillatorType;
    dur: number;
    vol: number;
    now: number;
  }): void {
    if (!this.ctx || !this.master) return;
    const { freq, freqEnd = freq, type, dur, vol, now } = opts;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freqEnd !== freq) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, freqEnd),
        now + dur,
      );
    }
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  private noise(opts: { dur: number; vol: number; now: number }): void {
    if (!this.ctx || !this.master) return;
    const { dur, vol, now } = opts;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(g);
    g.connect(this.master);
    src.start(now);
    src.stop(now + dur + 0.02);
  }
}

export const SFX = new SfxEngine();
