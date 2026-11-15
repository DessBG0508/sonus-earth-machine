"use client";

import { useEffect, useRef } from "react";
import { engine } from "@/lib/sonus/audio-engine";
import { sonusBus } from "@/lib/sonus/bus";
import { renderLoop } from "@/lib/sonus/loop";

/** Live waveform canvas — verbatim port of v3 drawWave() (magenta glow). */
export function WaveformCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const H = 84;
    let W = 320;
    const fit = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      W = Math.max(1, Math.floor(parent.clientWidth));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = "100%";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas.parentElement as Element);

    const buf = new Uint8Array(engine.fftSize);

    const unsub = renderLoop.add((now) => {
      const el = now / 1000;
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(34,211,238,.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, H / 2);
      ctx.lineTo(W, H / 2);
      ctx.stroke();

      ctx.save();
      ctx.shadowColor = "#FF2D92";
      ctx.shadowBlur = 9;
      ctx.strokeStyle = "#FF2D92";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      const live = sonusBus.playing && engine.getTimeDomainData(buf);
      if (live) {
        const n = engine.fftSize;
        for (let i = 0; i < W; i++) {
          const v = buf[Math.floor((i / W) * n)] / 128 - 1;
          const y = H / 2 + v * (H / 2 - 6);
          if (i === 0) ctx.moveTo(i, y);
          else ctx.lineTo(i, y);
        }
      } else {
        for (let i = 0; i < W; i++) {
          const y = H / 2 + Math.sin(i * 0.05 + el * 2) * 3 * Math.sin(el * 0.7);
          if (i === 0) ctx.moveTo(i, y);
          else ctx.lineTo(i, y);
        }
      }
      ctx.stroke();
      ctx.restore();

      if (modeRef.current && modeRef.current.textContent !== (live ? "LIVE" : "IDLE")) {
        modeRef.current.textContent = live ? "LIVE" : "IDLE";
        modeRef.current.style.color = live ? "#FF2D92" : "#7C8DA6";
      }
    });

    return () => {
      unsub();
      ro.disconnect();
    };
  }, []);

  return (
    <div className="relative mt-2">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Live audio waveform drawn in magenta over a cyan baseline"
        className="block w-full rounded-[2px] border border-hud/15 bg-[rgba(3,6,13,.9)]"
      />
      <span
        ref={modeRef}
        aria-hidden="true"
        className="pointer-events-none absolute right-1.5 top-1 font-mono text-[8px] tracking-[0.2em] text-mut"
      >
        IDLE
      </span>
    </div>
  );
}
