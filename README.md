# SONUS v4 — The Earth Information Machine

**NASA Space Apps Challenge 2026 · "The Earth Information Jukebox" · Team Tesh Sonus (Carmen City)**

SONUS turns NASA Earth imagery into real-time sound. A rotating 3D globe (WebGL) is
scanned column by column — 96 columns × 8 rows — and the brightness, redness and
greenness of its pixels are converted into a generative soundscape: ocean drones,
city-light clusters, aerosol plumes, fire pings, vegetation notes and cloud shimmer.

> "Listening is seeing." — the app is built screen-reader-first and fully playable
> from the keyboard.

- Live: `https://dessbg0508.github.io/sonus-earth-machine/`
- Legacy single-file prototype (v3, J.A.R.V.I.S. edition): preserved at
  `public/sonus_prototype.html` → served at `/sonus_prototype.html` as a fallback.

---

## Stack

- **Next.js 16 + TypeScript (strict)** with App Router, **static export** (`out/`)
- **three.js** — the 3D globe: textured sphere, Fresnel atmosphere, orbital rings,
  starfield, and a shader sweep band locked to the audio scan longitude
- **Web Audio API** — hand-rolled engine (no dependencies): oscillators, filtered
  noise percussion, convolution reverb with a generated impulse, compressor limiter,
  dual analysers (FFT + time-domain)
- **zustand** — UI state only; the audio loop never triggers React re-renders
- Tailwind CSS 4 + JetBrains Mono / Space Grotesk (self-hosted via `next/font/google`)

## The sonification grammar (ported 1:1 from v3)

- Grid of **96 columns × 8 rows** sampled across the projected sphere; space around
  the globe stays silent.
- Each column: the 8 rows are sorted by luminance; the brightest
  `1 + round(MOD/33)` rows above the `.06` threshold sing — pitch from the musical
  scale `[0,3,5,7,10,12,15,17,19,22]` over a 196 Hz base (top rows = high notes),
  gain = `bright^1.6 × 0.55`, stereo pan follows latitude.
- **FIRES**: red-dominant pixels (`redness > .28`) trigger band-passed noise pings.
- **NDVI**: the greenest cell (`greenness > .08`) sings a fifth above its row pitch.
- **CLOUDS**: every 4th column, if average brightness > `.15`, an airy high-passed
  (3.2 kHz) noise shimmer breathes.
- **Presets**: Ocean Breath (soft sine), Forest Alive (plucked triangle),
  Fire Alert (sawtooth + lower percussion threshold).
- **Knobs**: MOD (voice density + detune), REVERB (convolver wet = `n/100 × .8`),
  BRIGHT (lowpass cutoff = `200 × 30^(n/100)`).
- **Sweep speed**: 40–200 ms per column (default 80), `X-POS` shows scan progress.

All thresholds, scales, envelopes and formulas are byte-for-byte ports of
`sonus_prototype.html` (v3). Reference grammar: SVS "Data Sonification: Caldwell 73".

## Development

```bash
npm install
npm run dev        # http://localhost:3000
```

## Build (static export)

```bash
npm run build      # emits ./out with basePath /sonus-earth-machine
npm run start      # preview: npx serve out
```

`next.config.ts` uses `output: "export"`, `basePath: "/sonus-earth-machine"` and
`assetPrefix: "/sonus-earth-machine/"` **in production builds only** (dev runs at
`/` for convenience). No API routes, no SSR/ISR, no middleware, unoptimized images —
`out/index.html` works from any static file server, fully offline.

## Deploy to GitHub Pages (DessBG0508/sonus-earth-machine)

1. `npm run build`
2. Copy **the contents of `out/`** to the repo root (branch `main`) — or commit
   `out/` to a `gh-pages`-style setup you already use.
3. Push. The site goes live at
   `https://dessbg0508.github.io/sonus-earth-machine/` — keep the legacy
   `sonus_prototype.html` in `public/` so it ships inside `out/` too.

## Keyboard & accessibility

- `Space` — play/pause (outside form controls)
- Knobs: drag vertically, `←/→/↑/↓` ±5, `PageUp/PageDown` ±20, `Home/End` limits,
  double-click resets; `role="slider"` with live `aria-valuenow`
- Discs, layer chips, transport: logical tab order, `aria-pressed` states
- Per-disc audio description is `aria-live="polite"` for screen readers
- `prefers-reduced-motion`: glitch bands, ring/star rotation, parallax and pulsing
  glows are disabled — the audio sweep itself still runs
- Visualizer canvases carry descriptive `role="img"` labels

## LOAD REAL FRAME

Click **LOAD REAL FRAME** or drop any PNG/JPG onto the globe: it is cover-cropped
to equirectangular 720×360, projected onto the 3D sphere with the v3 renderer, and
instantly becomes the sonification source of the active disc (`REAL FRAME ON GLOBE`).

## Credits

- Data: NASA Scientific Visualization Studio / Earth Information Center —
  Perpetual Ocean 2 (SVS 5425), Night Lights 2012–2023 EIC (SVS 5313),
  GEOS Aerosols (SVS 5552).
- Globe base imagery: NASA Blue Marble & Black Marble (public domain, bundled).
- Sonification grammar reference: SVS "Data Sonification: Caldwell 73" / SYSTEM Sounds.
- Front-end scaffolding AI-assisted and disclosed in the project submission.
- Not affiliated with or endorsed by NASA. No NASA insignia used.
