"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type WorkshopPhase = "0" | "1" | "2" | "3";

const PhaseContext = createContext<{
  phase: WorkshopPhase;
  setPhase: (p: WorkshopPhase) => void;
  refetch: () => void;
} | null>(null);

const VALID_PHASES: WorkshopPhase[] = ["0", "1", "2", "3"];

export function PhaseProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhaseState] = useState<WorkshopPhase>("0");

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/workshop-state");
      const data = await res.json();
      if (!res.ok) return;
      const p = data?.phase ?? "0";
      if (VALID_PHASES.includes(p as WorkshopPhase)) {
        setPhaseState(p as WorkshopPhase);
      }
    } catch {
      // Keep current phase on network/parse error
    }
  }, []);

  useEffect(() => {
    refetch();
    const interval = setInterval(refetch, 10000);
    const onVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refetch();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refetch]);

  const setPhase = useCallback(
    async (p: WorkshopPhase) => {
      try {
        await fetch("/api/workshop-state", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phase: p }),
        });
        setPhaseState(p);
      } catch {
        // ignore
      }
    },
    [],
  );

  return (
    <PhaseContext.Provider value={{ phase, setPhase, refetch }}>
      {children}
    </PhaseContext.Provider>
  );
}

export function usePhase() {
  const ctx = useContext(PhaseContext);
  return ctx ?? { phase: "0" as WorkshopPhase, setPhase: async () => {}, refetch: () => {} };
}

export function phaseBannerLabel(phase: WorkshopPhase): string {
  switch (phase) {
    case "0":
      return "PHASE 0 — Claimed Access Scan";
    case "1":
      return "PHASE 1 — Evidence Collection";
    case "2":
      return "PHASE 2 — Categories & Storyboard";
    case "3":
      return "PHASE 3 — Public Contribution";
    default:
      return "PHASE 0 — Claimed Access Scan";
  }
}
