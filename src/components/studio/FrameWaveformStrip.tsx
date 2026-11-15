"use client";

import { useEffect, useRef } from "react";
import { engine } from "@/lib/sonus/audio-engine";
import { sonusBus } from "@/lib/sonus/bus";
import { renderLoop } from "@/lib/sonus/loop";
import { DISCS, COLS } from "@/lib/sonus/constants";
import { sweepPctLabel } from "@/lib/sonus/sonify";
import { useSonusStore } from "@/store/sonus-store";

/**
 * Bottom strip inside the stage viewport — verbatim port of v3's
 * "FRAME WAVEFORM" band with the magenta X-POS readout.
 */
export function FrameWaveformStrip() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const disc = useSonusStore((s) => s.disc);
  const discRef = useRef(disc);
  useEffect(() => {
    discRef.current = disc;
  }, [disc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const H = 52;
    let W = 720;
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
      const D = DISCS[discRef.current];
      const pct = sweepPctLabel(sonusBus.col);
      const baseY = 20;
      const waveY = 38;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(3,6,12,.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(34,211,238,.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      ctx.lineTo(W, baseY);
      ctx.stroke();

      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillStyle = "rgba(124,141,166,.85)";
      ctx.textAlign = "left";
      ctx.fillText("FRAME WAVEFORM", 12, 14);
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(255,45,146,.8)";
      ctx.fillText("X-POS: " + pct + "%", W - 12, 14);
      ctx.fillStyle = "rgba(124,141,166,.6)";
      ctx.textAlign = "left";
      ctx.fillText(`SCAN L\u2192R \u00B7 ${COLS} COLS \u00B7 8 ROWS`, 12, H - 8);
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(34,211,238,.75)";
      ctx.fillText(D.freq.toFixed(3) + " MHz \u00B7 " + D.title, W - 12, H - 8);
      ctx.textAlign = "left";

      // waveform (v3: 140 samples across the middle band)
      ctx.save();
      ctx.shadowColor = "#FF2D92";
      ctx.shadowBlur = 7;
      ctx.strokeStyle = "#FF2D92";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      const x0 = W * 0.18;
      const x1 = W * 0.86;
      const live = sonusBus.playing && engine.getTimeDomainData(buf);
      if (live) {
        const n = engine.fftSize;
        for (let i = 0; i <= 140; i++) {
          const v = buf[Math.floor((i / 140) * (n - 1))] / 128 - 1;
          const y = waveY + v * 9;
          const x = x0 + (i / 140) * (x1 - x0);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      } else {
        for (let i = 0; i <= 140; i++) {
          const y = waveY + Math.sin(i * 0.14 + el * 2) * 2.4 * Math.sin(el * 0.7);
          const x = x0 + (i / 140) * (x1 - x0);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.restore();
    });

    return () => {
      unsub();
      ro.disconnect();
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Frame waveform strip: live audio waveform with the sweep position readout (X-POS) and disc frequency"
        className="block w-full"
      />
    </div>
  );
}
