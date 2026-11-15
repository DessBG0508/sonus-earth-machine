"use client";

import { SpectrumCanvas } from "./SpectrumCanvas";

/** AUDIO ANALYZER panel — 24-band spectrum + gradient strip (v3 side panel). */
export function AnalyzerPanel() {
  return (
    <section className="chrome rounded-[2px] p-3" aria-label="Audio analyzer">
      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 className="panel-title">AUDIO ANALYZER</h2>
        <span className="font-mono text-[8.5px] tracking-[0.14em] text-mut">SPECTRUM 24-BAND</span>
      </div>
      <SpectrumCanvas />
      <div className="gradstrip mt-1.5" aria-hidden="true" />
    </section>
  );
}
