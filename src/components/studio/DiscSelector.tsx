"use client";

import { useEffect, useRef } from "react";
import { DISCS, type DiscKey } from "@/lib/sonus/constants";
import { frameStore } from "@/lib/sonus/textures";
import { useSonusStore } from "@/store/sonus-store";

const DISC_ORDER: DiscKey[] = ["ocean", "night", "aerosol"];

/** The three NASA SVS discs with live 48px canvas thumbnails. */
export function DiscSelector() {
  const disc = useSonusStore((s) => s.disc);
  const setDisc = useSonusStore((s) => s.setDisc);
  const thumbRefs = useRef<Partial<Record<DiscKey, HTMLCanvasElement | null>>>({});

  useEffect(() => {
    const redraw = () => {
      for (const k of DISC_ORDER) {
        const cv = thumbRefs.current[k];
        const f = frameStore.get(k);
        if (!cv || !f) continue;
        const ctx = cv.getContext("2d");
        if (!ctx) continue;
        ctx.clearRect(0, 0, 48, 48);
        ctx.drawImage(f.proj, 0, 0, 48, 48);
      }
    };
    redraw();
    return frameStore.subscribe(redraw);
  }, []);

  return (
    <div className="mb-3 flex flex-wrap gap-2.5" role="group" aria-label="Disc selector — choose a NASA dataset">
      {DISC_ORDER.map((key) => {
        const D = DISCS[key];
        const active = disc === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => setDisc(key)}
            className="flex min-w-[210px] flex-1 cursor-pointer items-center gap-2.5 rounded-[2px] border bg-[rgba(4,8,18,.85)] p-2 text-left transition-all duration-150 hover:border-hud hover:shadow-[0_0_14px_rgba(34,211,238,.15)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon"
            style={
              active
                ? { borderColor: "#FF2D92", boxShadow: "0 0 0 1px #FF2D92, 0 0 20px rgba(255,45,146,.22)" }
                : { borderColor: "rgba(34,211,238,.13)" }
            }
          >
            <canvas
              ref={(el) => {
                thumbRefs.current[key] = el;
              }}
              width={48}
              height={48}
              aria-hidden="true"
              className="rounded-full border border-hud/15"
            />
            <span className="min-w-0">
              <span className="font-mono text-[9px] tracking-[0.22em] text-neon" style={{ textShadow: "0 0 8px rgba(57,255,136,.4)" }}>
                {D.num}
              </span>
              <br />
              <span className="text-xs font-semibold tracking-wide">{D.title}</span>
              <br />
              <span className="mt-0.5 block text-[9.5px] leading-snug text-mut">{D.subtitle}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
