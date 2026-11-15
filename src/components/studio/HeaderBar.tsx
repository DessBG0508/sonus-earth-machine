"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { DATE_TAG, DISCS } from "@/lib/sonus/constants";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useSonusStore, type FrameSourceKind } from "@/store/sonus-store";
import { LayerToggles } from "./LayerToggles";
import brandGlobe from "@/assets/brand/sonus-globe.png";

/** Official SONUS brand mark — the neon circuit globe from the team logo. */
function BrandMark() {
  return (
    <Image
      src={brandGlobe}
      alt=""
      aria-hidden="true"
      width={42}
      height={42}
      priority
      className="h-[42px] w-[42px] shrink-0 object-contain drop-shadow-[0_0_14px_rgba(139,92,246,0.65)]"
    />
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
            The Earth Information Machine // J.A.R.V.I.S. EDITION // DESDE 2026
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
