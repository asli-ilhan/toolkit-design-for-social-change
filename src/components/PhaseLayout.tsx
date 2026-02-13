"use client";

import { PhaseProvider } from "@/lib/PhaseContext";
import { PhaseBanner } from "./PhaseBanner";

export function PhaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <PhaseProvider>
      <PhaseBanner />
      {children}
    </PhaseProvider>
  );
}
