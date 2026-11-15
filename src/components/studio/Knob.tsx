"use client";

import { useCallback, useRef } from "react";

interface KnobProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  ariaLabel: string;
  /** Hex accent color for the value arc. */
  accent?: string;
  /** Optional value restored on double-click. */
  defaultValue?: number;
}

const ARC_START_DEG = 135;
const SWEEP_DEG = 270;
const NEEDLE_ROT_PER_UNIT = 2.7; // v3: rot = v * 2.7 - 135

/**
 * HUD knob with full keyboard + pointer support (v3 drag + arrows, plus
 * PageUp/PageDown/Home/End). Exposed as role="slider" with live aria values.
 */
export function Knob({ label, value, onChange, ariaLabel, accent = "#22D3EE", defaultValue }: KnobProps) {
  const dragY = useRef<number | null>(null);

  const commit = useCallback(
    (v: number) => {
      onChange(Math.min(100, Math.max(0, v)));
    },
    [onChange],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragY.current = e.clientY;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragY.current === null) return;
    const delta = dragY.current - e.clientY;
    dragY.current = e.clientY;
    if (delta !== 0) commit(value + delta * 0.6);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    dragY.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const jumps: Record<string, number> = {
      ArrowUp: 5,
      ArrowRight: 5,
      ArrowDown: -5,
      ArrowLeft: -5,
      PageUp: 20,
      PageDown: -20,
      Home: -value,
      End: 100 - value,
    };
    const d = jumps[e.key];
    if (d !== undefined) {
      e.preventDefault();
      e.stopPropagation();
      commit(value + d);
    }
  };

  const R = 26;
  const CIRC = 2 * Math.PI * R;
  const arcLen = CIRC * (SWEEP_DEG / 360) * (value / 100);
  const trackLen = CIRC * (SWEEP_DEG / 360);
  const needleRot = value * NEEDLE_ROT_PER_UNIT - 135;

  return (
    <div className="flex min-w-[72px] flex-1 flex-col items-center gap-1.5">
      <div
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`${value} out of 100`}
        className="relative h-16 w-16 cursor-ns-resize touch-none select-none rounded-full border border-hud/30 transition-shadow duration-200 hover:shadow-[0_0_16px_rgba(34,211,238,0.25)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-neon md:h-[62px] md:w-[62px]"
        style={{ background: "radial-gradient(circle at 35% 28%, #14203A, #070C18)" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        onDoubleClick={() => defaultValue !== undefined && commit(defaultValue)}
      >
        <svg viewBox="0 0 64 64" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <circle
            cx="32"
            cy="32"
            r={R}
            fill="none"
            stroke="rgba(34,211,238,.16)"
            strokeWidth="3"
            strokeDasharray={`${trackLen} ${CIRC}`}
            strokeLinecap="round"
            transform={`rotate(${ARC_START_DEG} 32 32)`}
          />
          <circle
            cx="32"
            cy="32"
            r={R}
            fill="none"
            stroke={accent}
            strokeWidth="3"
            strokeDasharray={`${arcLen} ${CIRC}`}
            strokeLinecap="round"
            transform={`rotate(${ARC_START_DEG} 32 32)`}
            style={{ filter: `drop-shadow(0 0 4px ${accent})` }}
          />
          <line
            x1="32"
            y1="9"
            x2="32"
            y2="17"
            stroke="#39FF88"
            strokeWidth="2"
            strokeLinecap="round"
            transform={`rotate(${needleRot} 32 32)`}
            style={{ filter: "drop-shadow(0 0 5px #39FF88)" }}
          />
        </svg>
      </div>
      <span className="font-mono text-[8.5px] tracking-[0.2em] text-mut">{label}</span>
      <span className="font-mono text-xs text-hud" style={{ textShadow: "0 0 9px rgba(34,211,238,.5)" }}>
        {value}
      </span>
    </div>
  );
}
