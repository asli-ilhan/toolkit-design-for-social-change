"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePhase } from "@/lib/PhaseContext";
import {
  getGroupNumber,
  getRouteAccess,
  getNavTooltip,
  PHASE_LABELS,
  type RouteId,
} from "@/lib/accessControl";

const NAV_ITEMS: { href: string; label: string; route: RouteId }[] = [
  { href: "/wizard", label: "Log", route: "wizard" },
  { href: "/feed", label: "Feed", route: "feed" },
  { href: "/map", label: "Map", route: "map" },
  { href: "/story-board", label: "Story Board", route: "storyboard" },
  { href: "/category", label: "Category", route: "category" },
  { href: "/wheelmap-helper", label: "WheelMap", route: "wheelmap" },
  { href: "/osm-helper", label: "OSM", route: "osm" },
  { href: "/export", label: "Export", route: "export" },
];

function NavLink({
  href,
  label,
  access,
  tooltip,
}: {
  href: string;
  label: string;
  access: "full" | "readonly" | "none";
  tooltip: string;
}) {
  if (access === "none") {
    return (
      <span
        className="cursor-not-allowed text-white/40"
        title={tooltip || "This module becomes available in a later phase."}
      >
        {label}
      </span>
    );
  }
  const readOnlyTip = access === "readonly" ? " (read-only for your group in this phase)" : "";
  return (
    <Link
      href={href}
      className={access === "readonly" ? "text-white/50 hover:text-white/70" : "text-white/60 hover:text-white"}
      title={tooltip ? tooltip + readOnlyTip : readOnlyTip || undefined}
    >
      {label}
    </Link>
  );
}

export function AppHeader() {
  const { phase } = usePhase();
  const [groupNumber, setGroupNumber] = useState<1 | 2 | 3 | 4 | null>(null);

  useEffect(() => {
    setGroupNumber(getGroupNumber());
  }, []);

  return (
    <header className="border-b border-white/10 bg-black/80 px-4 py-3 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
        <Link href="/" className="flex flex-col hover:opacity-90">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
            Toolkit
          </span>
          <span className="text-sm font-medium">
            Access Journey Logging
          </span>
        </Link>
        <nav className="hidden items-center gap-4 text-xs sm:flex">
          {NAV_ITEMS.map(({ href, label, route }) => {
            const access = getRouteAccess(phase, groupNumber, route);
            const tooltip = getNavTooltip(route, phase, groupNumber, PHASE_LABELS);
            return (
              <NavLink
                key={route}
                href={href}
                label={label}
                access={access}
                tooltip={tooltip}
              />
            );
          })}
        </nav>
      </div>
    </header>
  );
}
