"use client";

import { useEffect, useRef } from "react";
import { panLabel } from "@/lib/sonus/sonify";
import { renderLoop } from "@/lib/sonus/loop";
import { sonusBus } from "@/lib/sonus/bus";
import { Knob } from "./Knob";
import { useSonusStore } from "@/store/sonus-store";

/**
 * CONTROL DECK — MOD / REVERB / BRIGHT knobs (defaults ported from v3:
 * 50 / 62 / 44) plus the live PITCH / GAIN / PAN readouts. Readouts are
 * updated imperatively inside the shared rAF at <=30fps, never via state.
 */
export function ControlDeck() {
  const mod = useSonusStore((s) => s.mod);
  const reverb = useSonusStore((s) => s.reverb);
  const bright = useSonusStore((s) => s.bright);
  const setMod = useSonusStore((s) => s.setMod);
  const setReverb = useSonusStore((s) => s.setReverb);
  const setBright = useSonusStore((s) => s.setBright);

  const pitchRef = useRef<HTMLDivElement>(null);
  const gainRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let lastPaint = 0;
    return renderLoop.add((now) => {
      if (now - lastPaint < 33) return;
      lastPaint = now;
      const p = pitchRef.current;
      const g = gainRef.current;
      const n = panRef.current;
      if (!p || !g || !n) return;
      if (sonusBus.playing && sonusBus.hasVoice) {
        p.textContent = sonusBus.hiFreq.toFixed(1) + " Hz";
        g.textContent = sonusBus.hiGain.toFixed(2);
        n.textContent = panLabel(sonusBus.hiPan);
      } else if (!sonusBus.playing) {
        p.textContent = "\u2014";
        g.textContent = "\u2014";
        n.textContent = "\u2014";
      }
    });
  }, []);

  return (
    <section className="chrome rounded-[2px] p-3" aria-label="Control deck — synth parameters">
      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 className="panel-title">CONTROL DECK</h2>
        <span className="font-mono text-[8.5px] tracking-[0.14em] text-mut">SYNTH PARAMS</span>
      </div>
      <div className="flex items-start justify-between gap-2.5">
        <Knob
          label="MOD"
          ariaLabel="Modulation: number of simultaneous voices"
          value={mod}
          onChange={setMod}
          accent="#22D3EE"
          defaultValue={50}
        />
        <Knob
          label="REVERB"
          ariaLabel="Reverb amount"
          value={reverb}
          onChange={setReverb}
          accent="#8B5CF6"
          defaultValue={62}
        />
        <Knob
          label="BRIGHT"
          ariaLabel="Brightness: low-pass filter cutoff"
          value={bright}
          onChange={setBright}
          accent="#FFB020"
          defaultValue={44}
        />
      </div>
      <p className="mt-2.5 text-center text-[9.5px] leading-relaxed text-mut">
        Drag vertically, double-click to reset, or use arrow keys · MOD = voice density · REVERB = space · BRIGHT = tone
      </p>
      <div className="mt-3 flex gap-2" role="group" aria-label="Live sound parameters">
        <div className="min-w-0 flex-1 rounded-[2px] border border-hud/15 bg-[rgba(4,8,18,.8)] px-2 py-1.5">
          <div className="font-mono text-[8px] tracking-[0.22em] text-mut">PITCH</div>
          <div ref={pitchRef} className="mt-0.5 truncate font-mono text-sm text-hud" style={{ textShadow: "0 0 9px rgba(34,211,238,.5)" }}>
            &mdash;
          </div>
        </div>
        <div className="min-w-0 flex-1 rounded-[2px] border border-hud/15 bg-[rgba(4,8,18,.8)] px-2 py-1.5">
          <div className="font-mono text-[8px] tracking-[0.22em] text-mut">GAIN</div>
          <div ref={gainRef} className="mt-0.5 truncate font-mono text-sm text-hud" style={{ textShadow: "0 0 9px rgba(34,211,238,.5)" }}>
            &mdash;
          </div>
        </div>
        <div className="min-w-0 flex-1 rounded-[2px] border border-hud/15 bg-[rgba(4,8,18,.8)] px-2 py-1.5">
          <div className="font-mono text-[8px] tracking-[0.22em] text-mut">PAN</div>
          <div ref={panRef} className="mt-0.5 truncate font-mono text-sm text-hud" style={{ textShadow: "0 0 9px rgba(34,211,238,.5)" }}>
            &mdash;
          </div>
        </div>
      </div>
    </section>
  );
}
