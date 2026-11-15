"use client";

import { useEffect, useRef } from "react";
import { engine } from "@/lib/sonus/audio-engine";
import { sonusBus } from "@/lib/sonus/bus";
import { renderLoop } from "@/lib/sonus/loop";

/** 24-band spectrum — verbatim port of v3 drawSpec() (magenta->cyan bars). */
export function SpectrumCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const H = 104;
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

    const fft = new Uint8Array(engine.binCount);

    const unsub = renderLoop.add(() => {
      ctx.clearRect(0, 0, W, H);
      const bands = 24;
      const bw = W / bands;
      const live = sonusBus.playing && engine.getFrequencyData(fft);
      for (let i = 0; i < bands; i++) {
        let v = 0;
        if (live) {
          const bin = 2 + Math.floor(Math.pow(i / bands, 1.6) * engine.binCount * 0.4);
          v = fft[bin] / 255;
        }
        const h = Math.max(2, v * (H - 8));
        const gr = ctx.createLinearGradient(0, H, 0, H - h);
        gr.addColorStop(0, "#FF2D92");
        gr.addColorStop(1, "#22D3EE");
        ctx.fillStyle = gr;
        ctx.globalAlpha = live ? 1 : 0.25;
        ctx.fillRect(i * bw + 2, H - h - 4, bw - 4, h);
      }
      ctx.globalAlpha = 1;
    });

    return () => {
      unsub();
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Live 24-band frequency spectrum, magenta to cyan gradient bars"
      className="block w-full rounded-[2px] border border-hud/15 bg-[rgba(3,6,13,.9)]"
    />
  );
}
