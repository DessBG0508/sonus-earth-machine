"use client";

import { useEffect, useRef } from "react";
import { DATE_TAG, DISCS } from "@/lib/sonus/constants";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useSonusStore, type FrameSourceKind } from "@/store/sonus-store";
import { LayerToggles } from "./LayerToggles";

function BrandMark() {
  return (
    <svg width="42" height="42" viewBox="0 0 48 48" aria-hidden="true" className="drop-shadow-[0_0_12px_rgba(139,92,246,0.55)]">
      <defs>
        <radialGradient id="sonusBrandLg" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#C084FC" />
          <stop offset="55%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#3B1D6E" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="19" fill="url(#sonusBrandLg)" stroke="#FF2D92" strokeWidth="1.2" />
      <g stroke="#E9D5FF" strokeWidth="1.1" fill="none" opacity=".85">
        <path d="M24 5 v7 M24 43 v-7 M5 24 h7 M43 24 h-7" />
        <path d="M11 11 l5 5 M37 11 l-5 5 M11 37 l5 -5 M37 37 l-5 -5" />
        <path d="M24 12 a12 12 0 0 1 12 12 M24 36 a12 12 0 0 1 -12 -12" opacity=".55" />
      </g>
      <g fill="#F3E8FF">
        <circle cx="24" cy="12" r="1.8" />
        <circle cx="24" cy="36" r="1.8" />
        <circle cx="12" cy="24" r="1.8" />
        <circle cx="36" cy="24" r="1.8" />
      </g>
      <circle cx="24" cy="24" r="3.2" fill="#FF2D92" />
    </svg>
  );
}

/**
 * HUD header — brand, telemetry readouts (STATION / FREQUENCY / DATE),
 * LIVE-standby chip and the FIRES / NDVI / CLOUDS layer chips, all ported
 * from v3. Frequency jitter + glitch accents run imperatively (no renders).
 */
export function HeaderBar() {
  const disc = useSonusStore((s) => s.disc);
  const playing = useSonusStore((s) => s.playing);
  const frameSource = useSonusStore((s) => s.frameSource);
  const reduced = useReducedMotion();

  const brandRef = useRef<HTMLDivElement>(null);
  const stationRef = useRef<HTMLDivElement>(null);
  const freqRef = useRef<HTMLDivElement>(null);

  // station text + frequency base value follow the selected disc
  useEffect(() => {
    if (stationRef.current) stationRef.current.textContent = DISCS[disc].title;
    if (freqRef.current) {
      freqRef.current.textContent = DISCS[disc].freq.toFixed(3) + " MHz";
      freqRef.current.classList.remove("text-mag");
      freqRef.current.style.textShadow = "0 0 10px rgba(34,211,238,.55)";
    }
  }, [disc, frameSource]);

  // v3 stopPlay(): on pause, restore the base frequency + cyan tint
  useEffect(() => {
    if (playing) return;
    if (freqRef.current) {
      freqRef.current.textContent = DISCS[disc].freq.toFixed(3) + " MHz";
      freqRef.current.classList.remove("text-mag");
      freqRef.current.style.textShadow = "0 0 10px rgba(34,211,238,.55)";
    }
  }, [playing, disc]);

  // live frequency jitter while playing (v3 spin interval, 450ms)
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      if (!freqRef.current) return;
      const D = DISCS[disc];
      freqRef.current.textContent = (D.freq + (Math.random() - 0.5) * 0.02).toFixed(3) + " MHz";
      freqRef.current.classList.add("text-mag");
      freqRef.current.style.textShadow = "0 0 10px rgba(255,45,146,.6)";
    }, 450);
    return () => clearInterval(id);
  }, [playing, disc]);

  // occasional glitch accents on the brand + station (v3, 5.2s cadence)
  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      for (const el of [brandRef.current, stationRef.current?.parentElement]) {
        if (!el) continue;
        el.classList.add("glitching");
        setTimeout(() => el.classList.remove("glitching"), 320);
      }
    }, 5200);
    return () => clearInterval(id);
  }, [reduced]);

  const sourceTag: FrameSourceKind = frameSource[disc];

  return (
    <header className="chrome flex flex-wrap items-center gap-3.5 rounded-[2px] px-4 py-3">
      <div className="flex items-center gap-3">
        <BrandMark />
        <div>
          <div
            ref={brandRef}
            className="glow-title font-mono text-[22px] font-bold leading-none tracking-[0.42em]"
          >
            SONUS
          </div>
          <div className="mt-1.5 text-[9px] uppercase tracking-[0.26em] text-mut">
            The Earth Information Machine // J.A.R.V.I.S. EDITION
          </div>
        </div>
        <div
          className="hidden rounded-[2px] border border-hud/15 px-2 py-1.5 font-mono text-[8.5px] leading-relaxed tracking-[0.14em] text-mut sm:block"
          aria-label="Data source"
        >
          DATA SOURCE
          <br />
          <b className="font-normal text-hud">NASA EARTH INFORMATION CENTER</b>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 md:ml-auto" role="group" aria-label="Telemetry readout">
        <div className="rounded-[2px] border border-hud/15 bg-[rgba(4,8,18,.8)] px-3 py-1.5">
          <span className="block text-[8.5px] tracking-[0.22em] text-mut">STATION</span>
          <div
            ref={stationRef}
            className="font-mono text-[13px] text-hud"
            style={{ textShadow: "0 0 10px rgba(34,211,238,.55)" }}
            aria-live="polite"
          >
            {DISCS[disc].title}
          </div>
        </div>
        <div className="rounded-[2px] border border-hud/15 bg-[rgba(4,8,18,.8)] px-3 py-1.5">
          <span className="block text-[8.5px] tracking-[0.22em] text-mut">FREQUENCY</span>
          <div ref={freqRef} className="font-mono text-[13px] text-hud">
            {DISCS[disc].freq.toFixed(3)} MHz
          </div>
        </div>
        <div className="hidden rounded-[2px] border border-hud/15 bg-[rgba(4,8,18,.8)] px-3 py-1.5 sm:block">
          <span className="block text-[8.5px] tracking-[0.22em] text-mut">DATE</span>
          <span className="font-mono text-[13px] text-hud">{DATE_TAG}</span>
        </div>
        <div className="hidden rounded-[2px] border border-hud/15 bg-[rgba(4,8,18,.8)] px-3 py-1.5 lg:block">
          <span className="block text-[8.5px] tracking-[0.22em] text-mut">FRAME</span>
          <span className={`font-mono text-[11px] ${sourceTag === "real" ? "text-neon" : "text-mut"}`}>
            {sourceTag === "real" ? "REAL NASA SVS DATA" : "NASA TEXTURE GLOBE"}
          </span>
        </div>
      </div>

      <div
        className="flex items-center gap-2 rounded-[2px] border px-3 py-1.5 font-mono text-[10px] tracking-[0.22em]"
        style={
          playing
            ? { borderColor: "rgba(255,45,146,.5)", background: "rgba(24,4,14,.7)", color: "#FF2D92", textShadow: "0 0 8px rgba(255,45,146,.5)" }
            : { borderColor: "rgba(124,141,166,.3)", background: "rgba(4,8,18,.8)", color: "#7C8DA6" }
        }
        aria-live="polite"
      >
        <span className={playing ? "dot-live" : "dot-live !bg-[#22304A] !shadow-none"} aria-hidden="true" />
        <span>{playing ? "LIVE" : "STANDBY"}</span>
      </div>

      <LayerToggles />
    </header>
  );
}
