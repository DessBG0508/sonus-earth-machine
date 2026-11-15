"use client";

import { useEffect, useRef } from "react";
import { DISCS, LINK_HEX } from "@/lib/sonus/constants";
import { sonusBus } from "@/lib/sonus/bus";
import { renderLoop } from "@/lib/sonus/loop";
import { sweepPctLabel } from "@/lib/sonus/sonify";
import { useSonusStore } from "@/store/sonus-store";

function legendText(layers: { fires: boolean; ndvi: boolean; clouds: boolean }): string {
  const on: string[] = [];
  if (layers.fires) on.push("FIRES on — amber markers + percussive pings on hot pixels");
  if (layers.ndvi) on.push("NDVI on — green vegetation tint + soft green notes");
  if (layers.clouds) on.push("CLOUDS on — translucent cloud wisps + airy shimmer");
  return on.length ? on.join(" · ") : "none active — toggle FIRES / NDVI / CLOUDS above";
}

/** Stage meta row under the globe: layer legend + sweep % + frame source. */
export function StageMeta() {
  const layers = useSonusStore((s) => s.layers);
  const frameSource = useSonusStore((s) => s.frameSource);
  const disc = useSonusStore((s) => s.disc);
  const sweepRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let lastPaint = 0;
    return renderLoop.add((now) => {
      if (now - lastPaint < 66) return;
      lastPaint = now;
      if (sweepRef.current) sweepRef.current.textContent = sweepPctLabel(sonusBus.col);
    });
  }, []);

  const real = frameSource[disc] === "real";

  return (
    <div className="mt-2.5 flex flex-wrap justify-between gap-2.5 text-[11px] text-mut">
      <span id="layersLegend">
        Layers: <b className="font-semibold text-ink">{legendText(layers)}</b>
      </span>
      <span className="font-mono text-[11px] text-hud">
        SWEEP <span ref={sweepRef}>000</span>% ·{" "}
        <span className={real ? "text-neon" : ""}>{real ? "REAL FRAME ON GLOBE" : "NASA TEXTURE GLOBE"}</span> ·{" "}
        <span className="font-mono text-[9.5px] tracking-[0.12em] text-neon opacity-75">{LINK_HEX} · LINK OK</span>
      </span>
    </div>
  );
}
