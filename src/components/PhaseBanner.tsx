"use client";

import { usePhase, phaseBannerLabel } from "@/lib/PhaseContext";

export function PhaseBanner() {
  const { phase } = usePhase();
  const label = phaseBannerLabel(phase);
  return (
    <div className="border-b border-white/15 bg-black px-4 py-2 text-center text-sm font-semibold uppercase tracking-[0.18em] text-white">
      {label}
    </div>
  );
}
