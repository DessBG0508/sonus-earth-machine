/**
 * SONUS audio engine — a singleton that lives OUTSIDE React.
 *
 * The AudioContext is created lazily on the first user gesture (autoplay
 * policy). Master chain ports v3 exactly:
 *
 *   voices -> pan -> lowpass(BRIGHT) -> master(VOLUME) --dry--> compressor(-18dB) -> analyser -> destination
 *                                          \-> convolver(2.2s impulse) -> wet(REVERB) --/
 */

import { clamp, type PresetDef } from "./constants";

export class SonusEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private lp: BiquadFilterNode | null = null;
  private wet: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  /** Values kept before the context exists, applied on creation (v3 `desired`). */
  private desiredWet = 0.5;
  private desiredCutoff = 900;
  private desiredVolume = 0.8;

  get context(): AudioContext | null {
    return this.ctx;
  }

  get ready(): boolean {
    return this.ctx !== null;
  }

  get fftSize(): number {
    return this.analyser?.fftSize ?? 2048;
  }

  get binCount(): number {
    return this.analyser?.frequencyBinCount ?? 1024;
  }

  /** Must be called from a user gesture (PLAY button / key press). */
  ensure(): AudioContext {
    if (this.ctx) return this.ctx;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const actx = new Ctor();

    const master = actx.createGain();
    master.gain.value = this.desiredVolume;

    const lp = actx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = this.desiredCutoff;

    const analyser = actx.createAnalyser();
    analyser.fftSize = 2048;

    const comp = actx.createDynamicsCompressor();
    comp.threshold.value = -18;

    const conv = actx.createConvolver();
    const rate = actx.sampleRate;
    const len = Math.floor(rate * 2.2);
    const ib = actx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const dd = ib.getChannelData(ch);
      for (let i = 0; i < len; i++) dd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    conv.buffer = ib;

    const wet = actx.createGain();
    wet.gain.value = this.desiredWet;

    lp.connect(master);
    master.connect(comp);
    master.connect(conv);
    conv.connect(wet);
    wet.connect(comp);
    comp.connect(analyser);
    analyser.connect(actx.destination);

    this.ctx = actx;
    this.master = master;
    this.lp = lp;
    this.wet = wet;
    this.analyser = analyser;
    return actx;
  }

  async resume(): Promise<void> {
    if (this.ctx && this.ctx.state !== "running") {
      try {
        await this.ctx.resume();
      } catch {
        /* ignore — will retry on next gesture */
      }
    }
  }

  setVolume(v: number): void {
    this.desiredVolume = v;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
    }
  }

  setWet(w: number): void {
    this.desiredWet = w;
    if (this.ctx && this.wet) {
      this.wet.gain.setTargetAtTime(w, this.ctx.currentTime, 0.1);
    }
  }

  setCutoff(hz: number): void {
    this.desiredCutoff = Math.round(hz);
    if (this.ctx && this.lp) {
      this.lp.frequency.setTargetAtTime(this.desiredCutoff, this.ctx.currentTime, 0.1);
    }
  }

  private panNode(v: number): StereoPannerNode | GainNode {
    const actx = this.ctx as AudioContext;
    if (actx.createStereoPanner) {
      const p = actx.createStereoPanner();
      p.pan.value = clamp(v, -1, 1);
      return p;
    }
    return actx.createGain();
  }

  private noise(): AudioBuffer {
    const actx = this.ctx as AudioContext;
    if (!this.noiseBuf) {
      this.noiseBuf = actx.createBuffer(1, Math.floor(actx.sampleRate * 0.5), actx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.noiseBuf;
  }

  /** Synth voice (port of v3 `voice()`). */
  voice(freq: number, gain: number, pan: number, detuneCents: number | null, preset: PresetDef): void {
    const actx = this.ctx;
    if (!actx || !this.lp) return;
    const t = actx.currentTime;
    const o = actx.createOscillator();
    const g = actx.createGain();
    const p = this.panNode(pan);
    o.type = preset.type;
    o.frequency.value = freq;
    if (detuneCents) o.detune.value = (Math.random() - 0.5) * 2 * detuneCents;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + preset.attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + preset.attack + preset.release);
    o.connect(g);
    g.connect(p);
    p.connect(this.lp);
    o.start(t);
    o.stop(t + preset.attack + preset.release + 0.05);
  }

  /** Percussive noise ping on hot pixels (port of v3 `perc()`). */
  perc(gain: number, pan: number, freq: number): void {
    const actx = this.ctx;
    if (!actx || !this.lp) return;
    const t = actx.currentTime;
    const s = actx.createBufferSource();
    s.buffer = this.noise();
    const bp = actx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = clamp(freq * 3, 200, 8000);
    bp.Q.value = 7;
    const g = actx.createGain();
    const p = this.panNode(pan);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    s.connect(bp);
    bp.connect(g);
    g.connect(p);
    p.connect(this.lp);
    s.start(t);
    s.stop(t + 0.2);
  }

  /** Airy high-passed shimmer for the CLOUDS layer (port of v3 cloud code). */
  shimmer(level: number): void {
    const actx = this.ctx;
    if (!actx || !this.lp) return;
    const s = actx.createBufferSource();
    s.buffer = this.noise();
    const hp = actx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 3200;
    const g = actx.createGain();
    const t = actx.currentTime;
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    s.connect(hp);
    hp.connect(g);
    g.connect(this.lp);
    s.start(t);
    s.stop(t + 0.32);
  }

  getFrequencyData(out: Uint8Array<ArrayBuffer>): boolean {
    if (!this.analyser) return false;
    this.analyser.getByteFrequencyData(out);
    return true;
  }

  getTimeDomainData(out: Uint8Array<ArrayBuffer>): boolean {
    if (!this.analyser) return false;
    this.analyser.getByteTimeDomainData(out);
    return true;
  }

  dispose(): void {
    this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.master = null;
    this.lp = null;
    this.wet = null;
    this.analyser = null;
    this.noiseBuf = null;
  }
}

/** Module-level singleton — React components never own the audio graph. */
export const engine = new SonusEngine();
