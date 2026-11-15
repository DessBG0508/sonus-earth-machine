"use client";

import { useEffect } from "react";
import { HeaderBar } from "@/components/studio/HeaderBar";
import { DiscSelector } from "@/components/studio/DiscSelector";
import { GlobeStage } from "@/components/studio/GlobeStage";
import { StageMeta } from "@/components/studio/StageMeta";
import { LoaderRow } from "@/components/studio/LoaderRow";
import { AudioDescription } from "@/components/studio/AudioDescription";
import { VisualizerPanel } from "@/components/studio/VisualizerPanel";
import { AnalyzerPanel } from "@/components/studio/AnalyzerPanel";
import { ControlDeck } from "@/components/studio/ControlDeck";
import { TransportControls } from "@/components/studio/TransportControls";
import { SiDisclosure } from "@/components/studio/SiDisclosure";
import { NASA_TEXTURES, loadImage, rebuildDefaults } from "@/lib/sonus/textures";
import { initSequencer, stopSweep } from "@/lib/sonus/sequencer";
import { engine } from "@/lib/sonus/audio-engine";
import { useSonusStore } from "@/store/sonus-store";

/**
 * SONUS v4 — The Earth Information Machine.
 * NASA Space Apps Challenge 2026 · "The Earth Information Jukebox" · Team Tesh Sonus.
 *
 * Everything runs 100% in the client: the audio engine is created lazily on
 * the first gesture, and the render surfaces poll a plain JS bus from a
 * single shared rAF — the per-column sonification loop never re-renders React.
 */
export default function Page() {
  useEffect(() => {
    // boot with the procedural fallback, then swap in the real NASA textures
    rebuildDefaults(null, null);
    let cancelled = false;
    void Promise.all([loadImage(NASA_TEXTURES.day), loadImage(NASA_TEXTURES.night)]).then(
      ([day, night]) => {
        if (!cancelled) rebuildDefaults(day, night);
      },
    );

    const unsubSequencer = initSequencer();

    // v3 global shortcut: Space toggles PLAY/PAUSE (outside form controls)
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName ?? "";
      if (
        ["BUTTON", "SELECT", "INPUT", "TEXTAREA", "A"].includes(tag) ||
        t?.getAttribute("role") === "slider"
      ) {
        return;
      }
      e.preventDefault();
      const st = useSonusStore.getState();
      st.setPlaying(!st.playing);
    };
    document.addEventListener("keydown", onKey);

    return () => {
      cancelled = true;
      document.removeEventListener("keydown", onKey);
      unsubSequencer();
      stopSweep();
      engine.dispose();
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-4 pb-5 pt-3.5 md:px-5">
        <HeaderBar />

        <main className="mt-3.5 grid grid-cols-1 gap-3.5 lg:grid-cols-[2fr_1fr]">
          <section className="chrome rounded-[2px] p-3.5" aria-label="Frame viewer and disc selection">
            <DiscSelector />
            <GlobeStage />
            <StageMeta />
            <LoaderRow />
            <AudioDescription />
          </section>

          <aside className="flex flex-col gap-3.5">
            <VisualizerPanel />
            <AnalyzerPanel />
            <ControlDeck />
          </aside>
        </main>

        <TransportControls />

        <div className="mt-auto">
          <SiDisclosure />
        </div>
      </div>
    </div>
  );
}
