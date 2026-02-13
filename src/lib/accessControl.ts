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

/** Group number 1–4 from identity. Groups 1,2 = Storyboard + Map; 3,4 = Category + OSM. */
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
 * - full: full access (submit, edit, use tools)
 * - readonly: can view only
 * - none: cannot access (redirect)
 */
export function getRouteAccess(
  phase: WorkshopPhase,
  groupNumber: 1 | 2 | 3 | 4 | null,
  route: RouteId
): AccessMode {
  // Phase 0
  if (phase === "0") {
    if (route === "home" || route === "start" || route === "feed" || route === "phase0links") return "full";
    return "none"; // export disabled in phase 0
  }

  // Phase 1
  if (phase === "1") {
    if (route === "home" || route === "start" || route === "feed" || route === "wizard") return "full";
    if (route === "journey") return "full";
    return "none"; // export disabled in phase 1
  }

  // Phase 2
  if (phase === "2") {
    if (route === "home" || route === "start" || route === "feed" || route === "export" || route === "journey") return "full";
    if (route === "category") {
      if (groupNumber === 3 || groupNumber === 4) return "full";
      if (groupNumber === 1 || groupNumber === 2) return "readonly";
      return "none";
    }
    if (route === "storyboard") {
      if (groupNumber === 1 || groupNumber === 2) return "full";
      if (groupNumber === 3 || groupNumber === 4) return "readonly";
      return "none";
    }
    if (route === "map") {
      if (groupNumber === 1 || groupNumber === 2) return "full";
      return "none";
    }
    return "none"; // osm, wheelmap locked
  }

  // Phase 3
  if (phase === "3") {
    if (route === "home" || route === "start" || route === "feed" || route === "export" || route === "journey") return "full";
    if (route === "storyboard") return "readonly"; // all groups read-only
    if (route === "category") return "none"; // no one in phase 3
    if (route === "wizard") return "none"; // locked for all
    if (route === "osm") {
      if (groupNumber === 3 || groupNumber === 4) return "full";
      return "none";
    }
    if (route === "wheelmap") {
      if (groupNumber === 1 || groupNumber === 2) return "full";
      return "none";
    }
    if (route === "map") {
      if (groupNumber === 1 || groupNumber === 2) return "full";
      return "none";
    }
    return "none";
  }

  return "none";
}

/** Tooltip for nav when link is disabled. */
export function getNavTooltip(
  route: RouteId,
  phase: WorkshopPhase,
  groupNumber: 1 | 2 | 3 | 4 | null,
  phaseLabels: Record<WorkshopPhase, string>
): string {
  const mode = getRouteAccess(phase, groupNumber, route);
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
  const routeToGroup: Partial<Record<RouteId, string>> = {
    category: "Groups 3 & 4",
    storyboard: "Groups 1 & 2",
    osm: "Groups 3 & 4",
    wheelmap: "Groups 1 & 2",
    map: "Groups 1 & 2",
  };

  const p = routeToPhase[route];
  const g = routeToGroup[route];
  if (p && phase !== p) return `Available in ${phaseLabels[p as WorkshopPhase]}`;
  if (g) return `Available for ${g}`;
  return "This module becomes available in a later phase.";
}

export const PHASE_LABELS: Record<WorkshopPhase, string> = {
  "0": "Phase 0",
  "1": "Phase 1",
  "2": "Phase 2",
  "3": "Phase 3",
};
