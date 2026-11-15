"use client";

import { SpectrogramCanvas } from "./SpectrogramCanvas";
import { WaveformCanvas } from "./WaveformCanvas";

/** VISUALIZER panel — rolling spectrogram + waveform (v3 side panel). */
export function VisualizerPanel() {
  return (
    <section className="chrome rounded-[2px] p-3" aria-label="Audio visualizer">
      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 className="panel-title">VISUALIZER</h2>
        <span className="font-mono text-[8.5px] tracking-[0.14em] text-mut">
          MODE <span className="text-mut">SPECTROGRAM + WAVE</span>
        </span>
      </div>
      <SpectrogramCanvas />
      <WaveformCanvas />
    </section>
  );
}
