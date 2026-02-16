"use client";

import type { WorkshopPhase } from "@/lib/PhaseContext";

export type RouteId =
  | "home"
  | "start"
  | "wizard"
  | "feed"
  | "category"
  | "storyboard"
  | "osm"
  | "wheelmap"
  | "map"
  | "export"
  | "phase0links"
  | "journey";

/** Group number 1–4 from identity (for display only; access control is phase-only). */
export function getGroupNumber(): 1 | 2 | 3 | 4 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("week6-identity");
    if (!raw) return null;
    const { groupName } = JSON.parse(raw) as { groupName?: string };
    if (!groupName || typeof groupName !== "string") return null;
    const n = parseInt(groupName.replace(/^Group\s*/i, ""), 10);
    if (n >= 1 && n <= 4) return n as 1 | 2 | 3 | 4;
    return null;
  } catch {
    return null;
  }
}

export type AccessMode = "full" | "readonly" | "none";

/**
 * Returns whether the user can access the route and in what mode.
 * Phase-based gating is disabled: all routes are always accessible (full access).
 */
export function getRouteAccess(
  _phase: WorkshopPhase,
  _groupNumber: 1 | 2 | 3 | 4 | null,
  _route: RouteId
): AccessMode {
  return "full";
}

export const PHASE_LABELS: Record<WorkshopPhase, string> = {
  "0": "Phase 0",
  "1": "Phase 1",
  "2": "Phase 2",
  "3": "Phase 3",
};
