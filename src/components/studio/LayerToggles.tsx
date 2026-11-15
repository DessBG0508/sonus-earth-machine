"use client";

import { useSonusStore } from "@/store/sonus-store";
import type { LayerKey } from "@/lib/sonus/constants";

const LAYERS: { key: LayerKey; label: string; color: string; shadow: string }[] = [
  { key: "fires", label: "FIRES", color: "#FFB020", shadow: "rgba(255,176,32,.25)" },
  { key: "ndvi", label: "NDVI", color: "#39FF88", shadow: "rgba(57,255,136,.25)" },
  { key: "clouds", label: "CLOUDS", color: "#22D3EE", shadow: "rgba(34,211,238,.3)" },
];

/** FIRES / NDVI / CLOUDS data-layer channel chips (v3 header chips). */
export function LayerToggles() {
  const layers = useSonusStore((s) => s.layers);
  const toggleLayer = useSonusStore((s) => s.toggleLayer);

  return (
    <div className="flex gap-2" role="group" aria-label="Data layer channels">
      {LAYERS.map((l) => {
        const on = layers[l.key];
        return (
          <button
            key={l.key}
            type="button"
            aria-pressed={on}
            onClick={() => toggleLayer(l.key)}
            className="flex cursor-pointer items-center gap-1.5 rounded-[2px] border bg-[rgba(4,8,18,.8)] px-2.5 py-[7px] font-mono text-[10px] tracking-[0.18em] transition-colors duration-150"
            style={
              on
                ? { borderColor: l.color, color: "#E8F4FF", boxShadow: `0 0 12px ${l.shadow}` }
                : { borderColor: "rgba(46,65,98,.6)", color: "#7C8DA6" }
            }
          >
            <span
              aria-hidden="true"
              className="h-[7px] w-[7px] border transition-colors duration-150"
              style={
                on
                  ? { background: l.color, borderColor: l.color, boxShadow: `0 0 8px ${l.color}` }
                  : { background: "#22304A", borderColor: "#2E4162" }
              }
            />
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
