"use client";

import { usePhase, type WorkshopPhase } from "@/lib/PhaseContext";

const PHASES: { value: WorkshopPhase; label: string }[] = [
  { value: "1", label: "Phase 1 — Evidence Collection" },
  { value: "2_categories", label: "Phase 2 — Categories & Governance" },
  { value: "2_story", label: "Phase 2 — Storyboard & Public Expression" },
  { value: "3", label: "Phase 3 — Public Contribution" },
];

export default function AdminPage() {
  const { phase, setPhase } = usePhase();

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="rounded-xl border border-white/15 bg-white/[0.03] p-5">
        <h1 className="text-lg font-semibold">Workshop phase (lecturer)</h1>
        <p className="mt-1 text-sm text-white/70">
          Change the current phase to control which parts of the toolkit are
          available. The phase is stored for everyone: students on other devices
          will see the update within a few seconds (or as soon as they switch
          back to the tab). Share this page link only with the lecturer.
        </p>
      </div>
      <div className="rounded-xl border border-white/15 bg-white/[0.02] p-5 space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          Current phase
        </label>
        <div className="flex flex-col gap-2">
          {PHASES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setPhase(value)}
              className={`rounded-full border-2 px-4 py-2 text-left text-sm font-medium ${
                phase === value
                  ? "border-white bg-white text-black"
                  : "border-white bg-black text-white hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-white/50">
          Flow: 1 → 2 Categories (approve + reallocate) → 2 Storyboard → 3 OSM.
        </p>
      </div>
    </div>
  );
}
