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
    subtitle: "Sea surface currents & temperature",
    freq: 389.733,
    style: "ocean",
    desc: "You are hearing global sea-surface currents and temperature (NASA SVS), rendered on a rotating Earth globe. The scan sweeps west to east across the sphere: higher tones come from northern latitudes; brighter blue-green currents sing louder and longer. The ocean stays quiet where the water is calm.",
    credit:
      "Globe texture: NASA Blue Marble (public domain) + procedural current overlay. Drop a real NASA SVS \u201CPerpetual Ocean 2\u201D frame via LOAD REAL FRAME — it is projected onto the sphere and sonified.",
  },
  night: {
    key: "night",
    num: "DISC 02",
    title: "NIGHT LIGHTS 2012\u20132023",
    subtitle: "Urban lights around the globe",
    freq: 402.118,
    style: "night",
    desc: "You are hearing city lights on the night side of Earth, 2012\u20132023 (NASA SVS Black Marble). Each bright urban cluster triggers higher, brighter tones; oceans, deserts and countryside stay silent. Dense cities produce fast clusters of notes — you can literally hear where people live.",
    credit:
      "Globe texture: NASA Black Marble night lights (public domain). Drop a real NASA SVS \u201CNight Lights (EIC version)\u201D frame via LOAD REAL FRAME to sonify it on the globe.",
  },
  aerosol: {
    key: "aerosol",
    num: "DISC 03",
    title: "GEOS AEROSOLS",
    subtitle: "Smoke, dust & sea salt plumes",
    freq: 417.92,
    style: "aerosol",
    desc: "You are hearing atmospheric particles in motion around the globe — smoke, dust and sea salt (NASA SVS GEOS model). Each colour family behaves like an instrument: purple means dust, orange means smoke, green means sea salt. Bigger, brighter plumes play louder; thin haze becomes a shimmering background.",
    credit:
      "Globe base: NASA Blue Marble (public domain) + GEOS-style plume overlay. Drop a real NASA SVS \u201CGEOS Aerosols\u201D frame via LOAD REAL FRAME to sonify it on the globe.",
  },
};

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
