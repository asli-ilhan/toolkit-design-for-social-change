"use client";

import Link from "next/link";
import { usePhase, type WorkshopPhase } from "@/lib/PhaseContext";

type Props = {
  allowedPhases: WorkshopPhase[];
  children: React.ReactNode;
};

export function PhaseGuard({ allowedPhases, children }: Props) {
  const { phase } = usePhase();
  if (allowedPhases.includes(phase)) return <>{children}</>;
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-6 text-center">
      <h1 className="text-lg font-semibold text-amber-200">
        Not available in this phase
      </h1>
      <p className="text-sm text-white/80">
        This section is only available during{" "}
        {allowedPhases.map((p) => phaseLabel(p)).join(" or ")}.
      </p>
      <Link
        href="/"
        className="inline-flex rounded-full border-2 border-white bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10"
      >
        Back to Home
      </Link>
    </div>
  );
}

function phaseLabel(p: WorkshopPhase): string {
  switch (p) {
    case "0":
      return "Phase 0 — Claimed Access Scan";
    case "1":
      return "Phase 1 — Evidence Collection";
    case "2":
      return "Phase 2";
    case "3":
      return "Phase 3 — Public Contribution";
    default:
      return String(p);
  }
}
