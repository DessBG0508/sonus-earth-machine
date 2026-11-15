"use client";

/** Footer with the SI AI-assistance disclosure + credits (v3 text, v4 note). */
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
      Data: NASA Scientific Visualization Studio / Earth Information Center — Perpetual Ocean 2, Night Lights 2012–2023
      (EIC version), GEOS Aerosols. Globe base imagery: NASA Blue Marble &amp; Black Marble (public domain). Mapping
      grammar reference: SVS &ldquo;Data Sonification: Caldwell 73&rdquo;. System Sounds credits for the sonification
      grammar inspiration.
      <br />
      Prototype v4 — front-end scaffolding AI-assisted and disclosed in the project submission. Not affiliated with or
      endorsed by NASA. No NASA insignia used.
    </footer>
  );
}
