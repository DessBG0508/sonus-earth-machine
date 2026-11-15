"use client";

import { DISCS } from "@/lib/sonus/constants";
import { useSonusStore } from "@/store/sonus-store";

/**
 * AUDIO DESCRIPTION block — screen-reader-ready, aria-live. Texts are
 * ported verbatim from v3 (part of the "listening is seeing" concept).
 */
export function AudioDescription() {
  const disc = useSonusStore((s) => s.disc);
  const D = DISCS[disc];

  return (
    <div className="mt-3 rounded-[0_2px_2px_0] border-l-2 border-mag bg-[rgba(4,8,18,.8)] p-2.5 pl-3">
      <div className="mb-1.5 font-mono text-[8.5px] tracking-[0.24em] text-mag" style={{ textShadow: "0 0 8px rgba(255,45,146,.4)" }}>
        AUDIO DESCRIPTION · SCREEN-READER READY
      </div>
      <p aria-live="polite" className="text-[12.5px] leading-relaxed text-ink">
        {D.desc}
      </p>
      <div className="mt-1.5 text-[10px] leading-relaxed text-mut">{D.credit}</div>
    </div>
  );
}
