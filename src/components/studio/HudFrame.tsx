"use client";

/**
 * Decorative HUD corner brackets for the 3D viewport (magenta/cyan accents,
 * an identity detail from the J.A.R.V.I.S. chrome language).
 */
export function HudFrame() {
  const base = "pointer-events-none absolute z-10 h-5 w-5";
  return (
    <div aria-hidden="true" className="absolute inset-0 z-10">
      <span className={`${base} left-1.5 top-1.5 border-l-2 border-t-2 border-hud/70`} />
      <span className={`${base} right-1.5 top-1.5 border-r-2 border-t-2 border-hud/70`} />
      <span className={`${base} bottom-1.5 left-1.5 border-b-2 border-l-2 border-mag/70`} />
      <span className={`${base} bottom-1.5 right-1.5 border-b-2 border-r-2 border-mag/70`} />
    </div>
  );
}
