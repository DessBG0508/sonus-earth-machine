"use client";

import { PRESETS, DATE_TAG, type PresetKey } from "@/lib/sonus/constants";
import { cutoffToBright, wetToReverb } from "@/lib/sonus/constants";
import { useSonusStore } from "@/store/sonus-store";
import { Slider } from "@/components/ui/slider";

const PRESET_KEYS = Object.keys(PRESETS) as PresetKey[];

/** Transport bar — PLAY/PAUSE, preset select, sweep speed + volume (v3). */
export function TransportControls() {
  const playing = useSonusStore((s) => s.playing);
  const setPlaying = useSonusStore((s) => s.setPlaying);
  const preset = useSonusStore((s) => s.preset);
  const setPreset = useSonusStore((s) => s.setPreset);
  const speed = useSonusStore((s) => s.speed);
  const setSpeed = useSonusStore((s) => s.setSpeed);
  const volume = useSonusStore((s) => s.volume);
  const setVolume = useSonusStore((s) => s.setVolume);

  const onPreset = (key: PresetKey) => {
    // v3: choosing a preset also moves the REVERB / BRIGHT knobs
    const P = PRESETS[key];
    setPreset(key);
    setReverbAndBright(P.wet, P.cutoff);
  };

  const setReverbAndBright = (wet: number, cutoff: number) => {
    useSonusStore.getState().setReverb(wetToReverb(wet));
    useSonusStore.getState().setBright(cutoffToBright(cutoff));
  };

  return (
    <section
      className="chrome mt-3.5 flex flex-wrap items-center gap-4 rounded-[2px] px-4 py-3.5"
      aria-label="Transport controls"
    >
      <button
        type="button"
        className="play-btn"
        aria-pressed={playing}
        onClick={() => setPlaying(!playing)}
        aria-keyshortcuts="Space"
      >
        {playing ? "PAUSE" : "PLAY"}
      </button>

      <div className="flex min-w-[170px] flex-1 flex-col gap-1.5">
        <label htmlFor="preset" className="font-mono text-[8.5px] tracking-[0.24em] text-mut">
          PRESET
        </label>
        <select
          id="preset"
          value={preset}
          onChange={(e) => onPreset(e.target.value as PresetKey)}
          className="rounded-[2px] border border-hud/30 bg-[rgba(4,8,18,.9)] px-2.5 py-2 font-mono text-[11.5px] text-ink focus-visible:outline-2 focus-visible:outline-neon"
        >
          {PRESET_KEYS.map((k) => (
            <option key={k} value={k} className="bg-[#070C18]">
              {PRESETS[k].label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex min-w-[190px] flex-1 flex-col gap-1.5">
        <label htmlFor="speed" className="font-mono text-[8.5px] tracking-[0.24em] text-mut">
          SWEEP SPEED · <span className="font-mono text-[11px] text-neon" style={{ textShadow: "0 0 8px rgba(57,255,136,.35)" }}>{speed} ms/col</span>
        </label>
        <Slider
          id="speed"
          min={40}
          max={200}
          step={5}
          value={[speed]}
          onValueChange={(v) => setSpeed(v[0] ?? speed)}
          aria-label="Sweep speed in milliseconds per column"
          className="**:data-[slot=slider-track]:bg-[rgba(34,211,238,.18)] **:data-[slot=slider-thumb]:border-hud **:data-[slot=slider-thumb]:bg-[#0B1626] **:data-[slot=slider-thumb]:shadow-[0_0_10px_rgba(34,211,238,.5)] **:data-[slot=slider-range]:bg-hud"
        />
      </div>

      <div className="flex min-w-[190px] flex-1 flex-col gap-1.5">
        <label htmlFor="vol" className="font-mono text-[8.5px] tracking-[0.24em] text-mut">
          VOLUME · <span className="font-mono text-[11px] text-neon" style={{ textShadow: "0 0 8px rgba(57,255,136,.35)" }}>{volume}%</span>
        </label>
        <Slider
          id="vol"
          min={0}
          max={100}
          step={1}
          value={[volume]}
          onValueChange={(v) => setVolume(v[0] ?? volume)}
          aria-label="Master volume"
          className="**:data-[slot=slider-track]:bg-[rgba(255,45,146,.18)] **:data-[slot=slider-thumb]:border-mag **:data-[slot=slider-thumb]:bg-[#1B0A14] **:data-[slot=slider-thumb]:shadow-[0_0_10px_rgba(255,45,146,.5)] **:data-[slot=slider-range]:bg-mag"
        />
      </div>

      <div className="ml-auto text-right font-mono text-[8.5px] leading-[1.9] tracking-[0.18em] text-mut opacity-75" aria-hidden="true">
        DATE <b className="font-normal text-hud">{DATE_TAG}</b> · DATA LINK <b className="font-normal text-hud">OK</b> · SONIC MAPPER <b className="font-normal text-hud">v4.0</b>
        <br />
        GLOBE WEBGL 3D · {`96`} COLS · {`8`} ROWS
      </div>
    </section>
  );
}
