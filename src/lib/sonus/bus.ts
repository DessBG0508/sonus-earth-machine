/**
 * SONUS bus — a plain mutable object shared by the audio sequencer and all
 * rendering surfaces. The per-column audio loop NEVER triggers React
 * renders; canvases and readouts poll this bus inside the shared rAF at
 * display rate.
 */
import { COLS, ROWS } from "./constants";

export interface SonusBus {
  /** Current scan column 0..COLS-1 (texture space, advances per audio tick). */
  col: number;
  playing: boolean;
  /** Bumped every sequencer step so renderers can detect column changes. */
  version: number;
  /** Per-row brightness/redness/greenness of the column being sonified. */
  rows: Float32Array;
  reds: Float32Array;
  greens: Float32Array;
  /** Highest-pitched core voice of the last step (HUD readouts). */
  hiFreq: number;
  hiGain: number;
  hiPan: number;
  hasVoice: boolean;
  layers: { fires: boolean; ndvi: boolean; clouds: boolean };
}

export const sonusBus: SonusBus = {
  col: 0,
  playing: false,
  version: 0,
  rows: new Float32Array(ROWS),
  reds: new Float32Array(ROWS),
  greens: new Float32Array(ROWS),
  hiFreq: 0,
  hiGain: 0,
  hiPan: 0,
  hasVoice: false,
  layers: { fires: false, ndvi: false, clouds: false },
};
