"use client";

import { useEffect, useRef } from "react";
import { engine } from "@/lib/sonus/audio-engine";
import { sonusBus } from "@/lib/sonus/bus";
import { renderLoop } from "@/lib/sonus/loop";

const SGCOLS = 48;

/** v3 spectrogram color map (blue -> green -> pink heatmap). */
function vmap(v: number): string {
  let h: number;
  let s: number;
  let l: number;
  if (v < 0.5) {
    h = 240 - v * 240;
    s = 85;
    l = 12 + v * 36;
  } else {
    h = 120 - (v - 0.5) * 400;
    s = 90;
    l = 30 + (v - 0.5) * 60;
  }
  return `hsl(${h} ${s}% ${l}%)`;
}

/**
 * Rolling spectrogram heatmap — verbatim port of v3 drawHeat(): 48 log-spaced
 * bins sampled every 120ms from the engine FFT, columns painted 2px wide.
 */
export function SpectrogramCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0;
    let H = 64;
    let dpr = 1;
    const hist: Uint8Array[] = [];
    const fit = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      W = Math.max(1, Math.floor(parent.clientWidth));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = "100%";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      hist.length = 0;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas.parentElement as Element);

    const fft = new Uint8Array(engine.binCount);
    let acc = 0;
    let dirty = true;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(34,211,238,.07)";
      for (let gx = 0; gx < W; gx += 32) ctx.fillRect(gx, 0, 1, H);
      const cap = Math.max(8, Math.ceil(W / 2));
      while (hist.length > cap) hist.shift();
      const cw = 2;
      for (let c = 0; c < hist.length; c++) {
        const x = W - (hist.length - c) * cw;
        for (let i = 0; i < SGCOLS; i++) {
          const v = hist[c][i] / 255;
          if (v < 0.05) continue;
          const y = H - 4 - (i + 1) * ((H - 8) / SGCOLS);
          ctx.fillStyle = vmap(v);
          ctx.fillRect(x, y, cw - 1, (H - 8) / SGCOLS + 1);
        }
      }
      dirty = false;
    };

    const unsub = renderLoop.add((_now, dt) => {
      acc += dt;
      if (sonusBus.playing && acc > 0.12) {
        acc = 0;
        if (engine.getFrequencyData(fft)) {
          const cc = new Uint8Array(SGCOLS);
          for (let i = 0; i < SGCOLS; i++) {
            const bin = 2 + Math.floor(Math.pow(i / SGCOLS, 1.6) * engine.binCount * 0.4);
            cc[i] = fft[bin];
          }
          hist.push(cc);
          const cap = Math.max(8, Math.ceil(W / 2));
          while (hist.length > cap) hist.shift();
          dirty = true;
        }
      }
      if (dirty) draw();
    });

    draw();
    return () => {
      unsub();
      ro.disconnect();
    };
  }, []);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Rolling spectrogram heatmap of the live audio, colored from blue through green to pink"
        className="block w-full rounded-[2px] border border-hud/15 bg-[rgba(3,6,13,.9)]"
      />
    </div>
  );
}
