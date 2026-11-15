/**
 * SONUS sequencer — the imperative bridge between the zustand UI store and
 * the audio engine. Runs the v3 step() loop on a plain setInterval (never
 * inside React render), publishes visuals to the bus, and syncs engine
 * parameters (volume / wet / cutoff / speed / play state) from the store.
 */

import { useSonusStore } from "@/store/sonus-store";
import { FSZ, COLS, ROWS, PRESETS, brightToCutoff, reverbToWet } from "./constants";
import { engine } from "./audio-engine";
import { sonusBus } from "./bus";
import { frameStore } from "./textures";
import { analyzeColumn, cloudShimmerLevel, panLabel, pickNdvi, planColumn } from "./sonify";

let timer: ReturnType<typeof setInterval> | null = null;

function clearTimer(): void {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

function startTimer(speed: number): void {
  clearTimer();
  timer = setInterval(step, speed);
}

/** One sonification step — verbatim port of v3 `step()`. */
function step(): void {
  const st = useSonusStore.getState();
  const frame = frameStore.get(st.disc);
  if (!frame) return;

  const x = Math.floor((sonusBus.col * FSZ) / COLS);
  const px = frame.projCtx.getImageData(x, 0, 1, FSZ).data;
  const cells = analyzeColumn(px, FSZ, ROWS);

  const plan = planColumn({ cells, mod: st.mod, firesOn: st.layers.fires, preset: st.preset });
  const presetDef = PRESETS[st.preset];
  for (const v of plan.voices) engine.voice(v.freq, v.gain, v.pan, v.detuneCents, presetDef);
  for (const p of plan.percs) engine.perc(p.gain, p.pan, p.freq);

  if (st.layers.ndvi) {
    const nv = pickNdvi(cells);
    if (nv) engine.voice(nv.freq, nv.gain, nv.pan, nv.detuneCents, presetDef);
  }
  if (st.layers.clouds) {
    const level = cloudShimmerLevel(cells, sonusBus.col);
    if (level > 0) engine.shimmer(level);
  }

  // publish to the visual bus (no React re-renders involved)
  for (let r = 0; r < ROWS; r++) {
    sonusBus.rows[r] = cells[r].bright;
    sonusBus.reds[r] = cells[r].redness;
    sonusBus.greens[r] = cells[r].greenness;
  }
  if (plan.hi) {
    sonusBus.hiFreq = plan.hi.freq;
    sonusBus.hiGain = plan.hi.gain;
    sonusBus.hiPan = plan.hi.pan;
    sonusBus.hasVoice = true;
  } else {
    sonusBus.hasVoice = false;
  }
  sonusBus.col = (sonusBus.col + 1) % COLS;
  sonusBus.version++;
}

export function startSweep(): void {
  engine.ensure();
  void engine.resume();
  sonusBus.playing = true;
  sonusBus.col = 0;
  startTimer(useSonusStore.getState().speed);
}

export function stopSweep(): void {
  clearTimer();
  sonusBus.playing = false;
  sonusBus.hasVoice = false;
}

/** Subscribes the engine to the store; returns an unsubscribe function. */
export function initSequencer(): () => void {
  const st0 = useSonusStore.getState();
  engine.setVolume(st0.volume / 100);
  engine.setWet(reverbToWet(st0.reverb));
  engine.setCutoff(brightToCutoff(st0.bright));
  sonusBus.layers = { ...st0.layers };

  return useSonusStore.subscribe((state, prev) => {
    if (state.playing !== prev.playing) {
      if (state.playing) startSweep();
      else stopSweep();
    }
    if (state.speed !== prev.speed && state.playing) startTimer(state.speed);
    if (state.volume !== prev.volume) engine.setVolume(state.volume / 100);
    if (state.reverb !== prev.reverb) engine.setWet(reverbToWet(state.reverb));
    if (state.bright !== prev.bright) engine.setCutoff(brightToCutoff(state.bright));
    if (state.disc !== prev.disc) sonusBus.col = 0;
    if (state.layers !== prev.layers) sonusBus.layers = { ...state.layers };
  });
}

export { panLabel };
