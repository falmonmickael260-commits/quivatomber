import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

type SoundName =
  | "ui_hover"
  | "ui_click"
  | "join"
  | "tick"
  | "tick_urgent"
  | "correct"
  | "wrong"
  | "bank"
  | "chain_break"
  | "round_end"
  | "vote_cast"
  | "reveal_tick"
  | "elimination"
  | "finale"
  | "victory"
  | "whoosh"
  | "heartbeat";

interface SoundCtx {
  play: (name: SoundName) => void;
  muted: boolean;
  toggleMute: () => void;
}

const Ctx = createContext<SoundCtx | null>(null);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const ctxRef = useRef<AudioContext | null>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("qvt_muted");
      if (saved === "1") setMuted(true);
    } catch {}
  }, []);

  function getCtx() {
    if (!ctxRef.current) {
      const AC = (window.AudioContext || (window as any).webkitAudioContext);
      ctxRef.current = new AC();
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }

  function tone(
    ac: AudioContext,
    freq: number,
    start: number,
    dur: number,
    type: OscillatorType = "sine",
    gain = 0.18,
    freqEnd?: number
  ) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), start + dur);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gain, start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  function noise(ac: AudioContext, start: number, dur: number, gain = 0.12) {
    const bufferSize = ac.sampleRate * dur;
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const g = ac.createGain();
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(g);
    g.connect(ac.destination);
    src.start(start);
  }

  function play(name: SoundName) {
    if (muted) return;
    try {
      const ac = getCtx();
      const t = ac.currentTime;
      switch (name) {
        case "ui_hover":
          tone(ac, 740, t, 0.05, "sine", 0.03);
          break;
        case "ui_click":
          tone(ac, 520, t, 0.08, "triangle", 0.12);
          tone(ac, 1040, t + 0.02, 0.06, "triangle", 0.05);
          break;
        case "join":
          tone(ac, 440, t, 0.12, "sine", 0.1);
          tone(ac, 660, t + 0.08, 0.16, "sine", 0.12);
          break;
        case "tick":
          tone(ac, 880, t, 0.06, "square", 0.05);
          break;
        case "tick_urgent":
          tone(ac, 1100, t, 0.08, "square", 0.09);
          break;
        case "correct":
          tone(ac, 523, t, 0.12, "triangle", 0.15);
          tone(ac, 659, t + 0.08, 0.12, "triangle", 0.15);
          tone(ac, 880, t + 0.16, 0.22, "triangle", 0.16);
          break;
        case "wrong":
          tone(ac, 220, t, 0.3, "sawtooth", 0.16, 90);
          noise(ac, t, 0.25, 0.1);
          break;
        case "chain_break":
          tone(ac, 300, t, 0.4, "sawtooth", 0.14, 60);
          noise(ac, t + 0.05, 0.3, 0.14);
          break;
        case "bank":
          tone(ac, 660, t, 0.1, "sine", 0.14);
          tone(ac, 880, t + 0.06, 0.1, "sine", 0.14);
          tone(ac, 1320, t + 0.12, 0.3, "sine", 0.18);
          break;
        case "round_end":
          tone(ac, 400, t, 0.5, "triangle", 0.15);
          tone(ac, 300, t + 0.15, 0.5, "triangle", 0.12);
          break;
        case "vote_cast":
          tone(ac, 500, t, 0.1, "sine", 0.12);
          tone(ac, 700, t + 0.06, 0.14, "sine", 0.1);
          break;
        case "reveal_tick":
          tone(ac, 200, t, 0.18, "sine", 0.18);
          break;
        case "elimination":
          tone(ac, 150, t, 0.8, "sawtooth", 0.2, 50);
          noise(ac, t, 0.6, 0.18);
          break;
        case "finale":
          tone(ac, 220, t, 0.3, "triangle", 0.16);
          tone(ac, 330, t + 0.18, 0.3, "triangle", 0.16);
          tone(ac, 440, t + 0.36, 0.5, "triangle", 0.18);
          break;
        case "victory":
          [523, 659, 784, 1047].forEach((f, i) => tone(ac, f, t + i * 0.14, 0.5, "triangle", 0.18));
          break;
        case "whoosh":
          noise(ac, t, 0.4, 0.08);
          break;
        case "heartbeat":
          tone(ac, 80, t, 0.15, "sine", 0.2);
          tone(ac, 70, t + 0.22, 0.15, "sine", 0.16);
          break;
      }
    } catch {}
  }

  function toggleMute() {
    setMuted((m) => {
      try {
        localStorage.setItem("qvt_muted", !m ? "1" : "0");
      } catch {}
      return !m;
    });
  }

  const value = useMemo(() => ({ play, muted, toggleMute }), [muted]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSound() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSound must be used within SoundProvider");
  return ctx;
}
