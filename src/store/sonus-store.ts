import { create } from "zustand";
import type { DiscKey, LayerKey, PresetKey } from "@/lib/sonus/constants";

export type FrameSourceKind = "procedural" | "real";

interface SonusState {
  disc: DiscKey;
  preset: PresetKey;
  layers: Record<LayerKey, boolean>;
  /** MOD knob — voice density (0-100). */
  mod: number;
  /** REVERB knob — convolver wet (0-100). */
  reverb: number;
  /** BRIGHT knob — lowpass cutoff (0-100). */
  bright: number;
  /** Sweep speed in ms per column (40-200). */
  speed: number;
  /** Master volume percent (0-100). */
  volume: number;
  playing: boolean;
  frameSource: Record<DiscKey, FrameSourceKind>;
  setDisc: (key: DiscKey) => void;
  setPreset: (key: PresetKey) => void;
  toggleLayer: (key: LayerKey) => void;
  setMod: (v: number) => void;
  setReverb: (v: number) => void;
  setBright: (v: number) => void;
  setSpeed: (v: number) => void;
  setVolume: (v: number) => void;
  setPlaying: (v: boolean) => void;
  markRealFrame: (key: DiscKey) => void;
}

/** Defaults ported from v3: MOD 50, REVERB 62, BRIGHT 44, 80 ms/col, 80%. */
export const useSonusStore = create<SonusState>((set) => ({
  disc: "ocean",
  preset: "ocean",
  layers: { fires: false, ndvi: false, clouds: false },
  mod: 50,
  reverb: 62,
  bright: 44,
  speed: 80,
  volume: 80,
  playing: false,
  frameSource: { ocean: "procedural", night: "procedural", aerosol: "procedural" },
  setDisc: (key) => set({ disc: key }),
  setPreset: (key) => set({ preset: key }),
  toggleLayer: (key) => set((s) => ({ layers: { ...s.layers, [key]: !s.layers[key] } })),
  setMod: (v) => set({ mod: Math.round(v) }),
  setReverb: (v) => set({ reverb: Math.round(v) }),
  setBright: (v) => set({ bright: Math.round(v) }),
  setSpeed: (v) => set({ speed: Math.round(v) }),
  setVolume: (v) => set({ volume: Math.round(v) }),
  setPlaying: (v) => set({ playing: v }),
  markRealFrame: (key) =>
    set((s) => ({ frameSource: { ...s.frameSource, [key]: "real" as FrameSourceKind } })),
}));
