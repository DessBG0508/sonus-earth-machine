"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { DISCS } from "@/lib/sonus/constants";
import { loadUserFrame } from "@/lib/sonus/frame-loader";
import { useSonusStore } from "@/store/sonus-store";

/** LOAD REAL FRAME file picker row (v3 loader row, below the viewport). */
export function LoaderRow() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<boolean | null>(null);
  const disc = useSonusStore((s) => s.disc);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const done = await loadUserFrame(file);
    setBusy(false);
    setOk(done);
    e.target.value = "";
    window.setTimeout(() => setOk(null), 3200);
  };

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-2.5 text-[11px] text-mut">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="flex cursor-pointer items-center gap-2 rounded-[2px] border border-dashed border-hud/30 bg-[rgba(34,211,238,.07)] px-3 py-[7px] font-mono text-[10.5px] tracking-[0.12em] text-hud transition-shadow duration-150 hover:border-hud hover:shadow-[0_0_12px_rgba(34,211,238,.2)] focus-visible:outline-2 focus-visible:outline-neon disabled:opacity-60"
      >
        <Upload className="h-3.5 w-3.5" aria-hidden="true" />
        {busy ? "PROJECTING\u2026" : "LOAD REAL FRAME (PNG/JPG)"}
      </button>
      <input ref={inputRef} type="file" accept="image/*" onChange={onChange} className="hidden" aria-hidden="true" tabIndex={-1} />
      <span aria-live="polite">
        {ok === true
          ? "Real frame projected onto " + DISCS[disc].num + " — it is now the sonification source."
          : ok === false
            ? "Could not read that file — use a PNG or JPG equirectangular frame."
            : "This disc already sonifies a real NASA SVS frame — drop any other equirectangular frame on the globe to swap it."}
      </span>
    </div>
  );
}
