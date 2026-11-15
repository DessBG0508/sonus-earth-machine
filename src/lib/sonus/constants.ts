/**
 * SONUS — constants ported verbatim from the v3 single-file prototype.
 * These numbers ARE the sound-design grammar: do not "improve" them.
 */

/** Frame size of the projected sphere canvas (px). */
export const FSZ = 360;
/** Globe radius inside the projection frame (px). */
export const GR = 168;
/** Sonification grid: 96 columns x 8 rows across the projected globe. */
export const COLS = 96;
export const ROWS = 8;

/** Equirectangular texture size used for the 3D sphere + real frames. */
export const EQ_W = 720;
export const EQ_H = 360;

/** Minor-pentatonic-ish scale (semitones) used by v3 for row pitch. */
export const SCALE = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22] as const;

/** Broadcast identity date shown in the HUD (v3 keeps it fixed). */
export const DATE_TAG = "2026-11-14";

export const LINK_HEX = "0x3F7B";

export type DiscKey = "ocean" | "night" | "aerosol";
export type PresetKey = "ocean" | "forest" | "fire";
export type LayerKey = "fires" | "ndvi" | "clouds";
export type DiscStyle = "ocean" | "night" | "aerosol" | "raw";

export interface DiscDef {
  key: DiscKey;
  num: string;
  title: string;
  subtitle: string;
  freq: number;
  style: DiscStyle;
  desc: string;
  credit: string;
}

/** The three NASA SVS discs — texts ported verbatim from v3. */
export const DISCS: Record<DiscKey, DiscDef> = {
  ocean: {
    key: "ocean",
    num: "DISC 01",
    title: "PERPETUAL OCEAN 2",
    subtitle: "Sea surface currents & temperature · REAL ECCO2",
    freq: 389.733,
    style: "ocean",
    desc: "You are hearing real global sea-surface currents and temperature from the NASA ECCO2 model (SVS 3912), rendered on a rotating Earth globe. The scan sweeps west to east across the sphere: higher tones come from northern latitudes; the warm, fast currents that glow orange and yellow sing louder and longer, while the deep-blue calm gyres stay quiet.",
    credit:
      "REAL DATA — NASA SVS 3912 \u201CGlobal Sea Surface Currents and Temperature\u201D (ECCO2 model, bundled frame). The globe shows and sonifies that exact frame. Drop any other equirectangular NASA frame via LOAD REAL FRAME to swap it in.",
  },
  night: {
    key: "night",
    num: "DISC 02",
    title: "NIGHT LIGHTS 2012\u20132023",
    subtitle: "Urban lights around the globe · REAL VIIRS",
    freq: 402.118,
    style: "night",
    desc: "You are hearing city lights on the night side of Earth — the real 2023 VIIRS composite from NASA SVS 5313 (Black Marble, EIC version). Each bright urban cluster triggers higher, brighter tones; oceans, deserts and countryside stay silent. Dense cities produce fast clusters of notes — you can literally hear where people live.",
    credit:
      "REAL DATA — NASA SVS 5313 \u201CChange in Night Lights 2012\u20132023 (EIC version)\u201D, VIIRS year 2023 bundled frame. The globe shows and sonifies that exact frame. Drop any other equirectangular NASA frame via LOAD REAL FRAME to swap it in.",
  },
  aerosol: {
    key: "aerosol",
    num: "DISC 03",
    title: "GEOS AEROSOLS",
    subtitle: "Smoke, dust & sea salt plumes · REAL GEOS-5",
    freq: 417.92,
    style: "aerosol",
    desc: "You are hearing real atmospheric particles in motion around the globe — the NASA GEOS-5 aerosol simulation from SVS 5552 (Science On A Sphere). Each colour family behaves like an instrument: purple means dust, orange means smoke, green means sea salt. Bigger, brighter plumes play louder; thin haze becomes a shimmering background.",
    credit:
      "REAL DATA — NASA SVS 5552 \u201CAerosols in the Air\u201D (GEOS-5 model, Science On A Sphere) bundled frame. The globe shows and sonifies that exact frame. Drop any other equirectangular NASA frame via LOAD REAL FRAME to swap it in.",
  },
};

/** The bundled real-data frames, for the footer credits (SVS IDs + dates). */
export const REAL_SOURCES = {
  ocean: "NASA SVS 3912 — Global Sea Surface Currents & Temperature (ECCO2)",
  night: "NASA SVS 5313 — Night Lights 2012\u20132023, EIC version (VIIRS, 2023 frame)",
  aerosol: "NASA SVS 5552 — Aerosols in the Air (GEOS-5, Science On A Sphere)",
  fires: "FIRMS / VIIRS NOAA-20 active fire anomalies · GIBS Worldview, 2026-11-14",
  ndvi: "MODIS Terra NDVI 8-day · GIBS Worldview, 2026-11-14",
  clouds: "MODIS Terra cloud cover · GIBS Worldview, 2026-11-15",
} as const;

export interface PresetDef {
  type: OscillatorType;
  attack: number;
  release: number;
  cutoff: number;
  wet: number;
  label: string;
}

/** Synth presets — ported verbatim from v3. */
export const PRESETS: Record<PresetKey, PresetDef> = {
  ocean: { type: "sine", attack: 0.35, release: 1.25, cutoff: 900, wet: 0.5, label: "OCEAN BREATH — soft sine drones" },
  forest: { type: "triangle", attack: 0.12, release: 0.55, cutoff: 1800, wet: 0.3, label: "FOREST ALIVE — plucked triangles" },
  fire: { type: "sawtooth", attack: 0.02, release: 0.3, cutoff: 2600, wet: 0.15, label: "FIRE ALERT — sharp saw + noise" },
};

export const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));

/** Deterministic PRNG so procedural globe art matches v3 exactly. */
export function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** BRIGHT knob (0-100) -> lowpass cutoff in Hz (v3 formula). */
export function brightToCutoff(br: number): number {
  return Math.round(200 * Math.pow(30, br / 100));
}

/** Cutoff (Hz) -> BRIGHT knob value (v3 preset formula). */
export function cutoffToBright(cutoff: number): number {
  return clamp(Math.round((100 * Math.log(cutoff / 200)) / Math.log(30)), 0, 100);
}

/** REVERB knob (0-100) -> convolver wet gain (v3 formula). */
export function reverbToWet(rev: number): number {
  return (rev / 100) * 0.8;
}

/** Wet gain -> REVERB knob value (v3 preset formula). */
export function wetToReverb(wet: number): number {
  return clamp(Math.round(wet / 0.8 * 100), 0, 100);
}
