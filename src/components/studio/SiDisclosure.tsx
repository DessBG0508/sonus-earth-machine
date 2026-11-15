"use client";

import { REAL_SOURCES } from "@/lib/sonus/constants";

/** Footer with the SI AI-assistance disclosure + real-data credits. */
export function SiDisclosure() {
  return (
    <footer className="mt-4 border-t border-hud/15 pb-2 pt-2.5 text-[10px] leading-relaxed text-mut">
      <b className="font-semibold text-ink">SONUS — The Earth Information Machine</b> · NASA Space Apps Challenge 2026 ·
      &ldquo;The Earth Information Jukebox&rdquo; · Team Tesh Sonus (Carmen City).{" "}
      <a href="sonus_prototype.html" className="underline decoration-hud/40 underline-offset-2 hover:text-hud">
        Legacy single-file prototype (v3) preserved as fallback
      </a>
      .
      <br />
      <b className="font-semibold text-hud">100% REAL NASA DATA — no procedural datasets:</b>{" "}
      Disc 01 {REAL_SOURCES.ocean} · Disc 02 {REAL_SOURCES.night} · Disc 03 {REAL_SOURCES.aerosol} · Layers —{" "}
      {REAL_SOURCES.fires}, {REAL_SOURCES.ndvi}, {REAL_SOURCES.clouds}. Globe base imagery: NASA Blue Marble &amp; Black
      Marble (public domain). Sources:{" "}
      <a href="https://svs.gsfc.nasa.gov/3912/" target="_blank" rel="noreferrer" className="underline decoration-hud/40 underline-offset-2 hover:text-hud">
        svs.gsfc.nasa.gov/3912
      </a>
      {" · "}
      <a href="https://svs.gsfc.nasa.gov/5313/" target="_blank" rel="noreferrer" className="underline decoration-hud/40 underline-offset-2 hover:text-hud">
        /5313
      </a>
      {" · "}
      <a href="https://svs.gsfc.nasa.gov/5552/" target="_blank" rel="noreferrer" className="underline decoration-hud/40 underline-offset-2 hover:text-hud">
        /5552
      </a>
      {" · "}
      <a href="https://worldview.earthdata.nasa.gov/" target="_blank" rel="noreferrer" className="underline decoration-hud/40 underline-offset-2 hover:text-hud">
        GIBS Worldview (FIRMS/MODIS)
      </a>
      . Mapping grammar reference: SVS &ldquo;Data Sonification: Caldwell 73&rdquo;. System Sounds credits for the
      sonification grammar inspiration.
      <br />
      Prototype v4 — front-end scaffolding AI-assisted and disclosed in the project submission. Not affiliated with or
      endorsed by NASA. No NASA insignia used.
    </footer>
  );
}
