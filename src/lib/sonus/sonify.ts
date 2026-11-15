/**
 * SONUS sonification grammar — pure, testable functions ported verbatim
 * from the v3 prototype `step()` logic. Nothing here touches the DOM,
 * React or the AudioContext.
 */

import { COLS, ROWS, SCALE, clamp } from "./constants";

export interface RowCell {
  /** Row index 0 (top / north) .. ROWS-1 (bottom / south). */
  r: number;
  /** Rec.709 luminance, 0..1. */
  bright: number;
  /** (R - (G+B)/2)/255 — hot pixels (fires). */
  redness: number;
  /** (G - max(R,B))/255 — vegetation pixels (NDVI). */
  greenness: number;
}

/**
 * v3 rowHz: rows are mapped to a musical scale from the bottom row (low)
 * to the top row (high), base note 196 Hz.
 */
export function rowHz(r: number): number {
  const t = 1 - r / (ROWS - 1);
  const st = SCALE[clamp(Math.floor(t * SCALE.length), 0, SCALE.length - 1)];
  return 196 * Math.pow(2, st / 12);
}

/**
 * Analyze one projected-sphere pixel column (1 x FSZ RGBA) into the 8 grid
 * cells sampled by v3 at y = (r + .5) * FSZ / ROWS.
 */
export function analyzeColumn(px: Uint8ClampedArray, fsz: number, rows: number): RowCell[] {
  const cells: RowCell[] = [];
  for (let r = 0; r < rows; r++) {
    const y = Math.floor((r + 0.5) * fsz / rows);
    const i = y * 4;
    const R = px[i];
    const G = px[i + 1];
    const B = px[i + 2];
    cells.push({
      r,
      bright: (0.2126 * R + 0.7152 * G + 0.0722 * B) / 255,
      redness: (R - (G + B) / 2) / 255,
      greenness: (G - Math.max(R, B)) / 255,
    });
  }
  return cells;
}

export interface VoiceEvent {
  freq: number;
  gain: number;
  pan: number;
  /** Detune spread in cents derived from MOD, or null for undetuned layers. */
  detuneCents: number | null;
  kind: "core" | "ndvi";
}

export interface PercEvent {
  gain: number;
  pan: number;
  freq: number;
}

export interface ColumnPlan {
  voices: VoiceEvent[];
  percs: PercEvent[];
  /** Loudest-highest core voice stats for HUD readouts (null when silent). */
  hi: { freq: number; gain: number; pan: number } | null;
}

export interface PlanOptions {
  cells: RowCell[];
  /** MOD knob 0..100 — voice density + detune spread. */
  mod: number;
  /** FIRES layer toggle. */
  firesOn: boolean;
  /** Active preset key — 'fire' lowers the percussion threshold. */
  preset: "ocean" | "forest" | "fire";
}

/**
 * Core grammar port of v3 `step()`:
 * - sort the 8 cells by brightness (loudest first)
 * - take nVoices = 1 + round(mod/33) brightest cells
 * - cells under brightness .06 stay silent
 * - pitch from row, gain = bright^1.6 * .55, pan spread across latitude
 * - percussion on red pixels (FIRES layer or fire preset)
 */
export function planColumn({ cells, mod, firesOn, preset }: PlanOptions): ColumnPlan {
  const sorted = [...cells].sort((a, b) => b.bright - a.bright);
  const nVoices = 1 + Math.round(mod / 33);
  const detune = (mod / 100) * 14;
  const voices: VoiceEvent[] = [];
  const percs: PercEvent[] = [];
  let hi: ColumnPlan["hi"] = null;
  let hiF = 0;

  for (let k = 0; k < Math.min(nVoices, sorted.length); k++) {
    const c = sorted[k];
    if (c.bright < 0.06) break;
    const f = rowHz(c.r);
    const g = Math.pow(c.bright, 1.6) * 0.55;
    const p = (c.r / (ROWS - 1)) * 1.6 - 0.8;
    voices.push({ freq: f, gain: g, pan: p, detuneCents: detune, kind: "core" });
    if (firesOn && c.redness > 0.28) percs.push({ gain: g * 0.85, pan: p, freq: f });
    else if (preset === "fire" && c.redness > 0.2) percs.push({ gain: g * 0.85, pan: p, freq: f });
    if (f > hiF) {
      hiF = f;
      hi = { freq: f, gain: g, pan: p };
    }
  }
  return { voices, percs, hi };
}

/**
 * NDVI layer: the single greenest cell in the column sings one fifth above
 * its row pitch (v3: rowHz(best.r) * 1.5, gain = greenness * .4, pan .4).
 */
export function pickNdvi(cells: RowCell[]): VoiceEvent | null {
  let best: RowCell | null = null;
  for (const c of cells) if (!best || c.greenness > best.greenness) best = c;
  if (best && best.greenness > 0.08) {
    return {
      freq: rowHz(best.r) * 1.5,
      gain: best.greenness * 0.4,
      pan: 0.4,
      detuneCents: null,
      kind: "ndvi",
    };
  }
  return null;
}

/**
 * CLOUDS layer: every 4th column, if the column average brightness exceeds
 * .15, breathe a high-passed noise shimmer at level avgBright * .06.
 */
export function cloudShimmerLevel(cells: RowCell[], col: number): number {
  if (col % 4 !== 0) return 0;
  let w = 0;
  for (const c of cells) w += c.bright;
  w /= cells.length;
  return w > 0.15 ? w * 0.06 : 0;
}

/** HUD pan label, ported from v3 ('L0.42' / 'R0.30' / 'C 0.00'). */
export function panLabel(p: number): string {
  if (p < -0.05) return "L" + Math.abs(p).toFixed(2);
  if (p > 0.05) return "R" + p.toFixed(2);
  return "C 0.00";
}

/** Padded sweep percentage readout (v3: 000..096). */
export function sweepPctLabel(col: number): string {
  return String(Math.round((col / COLS) * 100)).padStart(3, "0");
}
