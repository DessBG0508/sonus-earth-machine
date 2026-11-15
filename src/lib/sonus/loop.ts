/**
 * Shared requestAnimationFrame loop for ALL SONUS canvases (globe, sweep,
 * spectrogram, waveform, spectrum, readouts). One rAF for the whole app,
 * automatically suspended when the tab is not visible.
 */

export type LoopCallback = (now: number, dt: number) => void;

class RenderLoop {
  private cbs = new Set<LoopCallback>();
  private rafId: number | null = null;
  private last = 0;
  private visible = true;
  private boundVisibility = false;

  add(cb: LoopCallback): () => void {
    this.cbs.add(cb);
    this.ensureVisibilityHook();
    this.ensureRunning();
    return () => {
      this.cbs.delete(cb);
      if (this.cbs.size === 0) this.stop();
    };
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.last = 0;
  }

  private ensureVisibilityHook(): void {
    if (this.boundVisibility || typeof document === "undefined") return;
    this.boundVisibility = true;
    document.addEventListener("visibilitychange", () => {
      this.visible = !document.hidden;
      if (this.cbs.size > 0) this.ensureRunning();
    });
  }

  private ensureRunning(): void {
    if (this.rafId === null && this.cbs.size > 0) {
      this.rafId = requestAnimationFrame(this.tick);
    }
  }

  private tick = (now: number): void => {
    this.rafId = this.cbs.size > 0 ? requestAnimationFrame(this.tick) : null;
    if (!this.visible || this.cbs.size === 0) {
      this.last = now;
      return;
    }
    const dt = this.last > 0 ? Math.min((now - this.last) / 1000, 0.1) : 0.016;
    this.last = now;
    for (const cb of [...this.cbs]) cb(now, dt);
  };
}

export const renderLoop = new RenderLoop();
