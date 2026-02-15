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
 * Access is phase-only; group is not used for gating.
 * - full: full access (submit, edit, use tools)
 * - readonly: can view only
 * - none: cannot access (redirect)
 */
export function getRouteAccess(
  phase: WorkshopPhase,
  _groupNumber: 1 | 2 | 3 | 4 | null,
  route: RouteId
): AccessMode {
  // Phase 0
  if (phase === "0") {
    if (route === "home" || route === "start" || route === "feed" || route === "phase0links") return "full";
    return "none";
  }

  // Phase 1
  if (phase === "1") {
    if (route === "home" || route === "start" || route === "feed" || route === "wizard" || route === "journey") return "full";
    return "none";
  }

  // Phase 2
  if (phase === "2") {
    if (route === "home" || route === "start" || route === "feed" || route === "export" || route === "journey") return "full";
    if (route === "category" || route === "storyboard" || route === "map") return "full";
    return "none";
  }

  // Phase 3
  if (phase === "3") {
    if (route === "home" || route === "start" || route === "feed" || route === "export" || route === "journey") return "full";
    if (route === "storyboard") return "readonly";
    if (route === "category" || route === "wizard") return "none";
    if (route === "osm" || route === "wheelmap" || route === "map") return "full";
    return "none";
  }

  return "none";
}

/** Tooltip for nav when link is disabled (phase-only). */
export function getNavTooltip(
  route: RouteId,
  phase: WorkshopPhase,
  _groupNumber: 1 | 2 | 3 | 4 | null,
  phaseLabels: Record<WorkshopPhase, string>
): string {
  const mode = getRouteAccess(phase, null, route);
  if (mode !== "none") return "";

  const routeToPhase: Partial<Record<RouteId, WorkshopPhase>> = {
    wizard: "1",
    category: "2",
    storyboard: "2",
    osm: "3",
    wheelmap: "3",
    map: "2",
    phase0links: "0",
    export: "2",
  };
  const p = routeToPhase[route];
  if (p && phase !== p) return `Available in ${phaseLabels[p as WorkshopPhase]}`;
  return "This module becomes available in a later phase.";
}

export const PHASE_LABELS: Record<WorkshopPhase, string> = {
  "0": "Phase 0",
  "1": "Phase 1",
  "2": "Phase 2",
  "3": "Phase 3",
};
