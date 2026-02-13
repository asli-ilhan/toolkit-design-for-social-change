"use client";

import Link from "next/link";
import { usePhase, type WorkshopPhase } from "@/lib/PhaseContext";

function NavLink({
  href,
  label,
  disabled,
}: {
  href: string;
  label: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span className="cursor-not-allowed text-white/40" title="Unavailable in this phase">
        {label}
      </span>
    );
  }
  return (
    <Link href={href} className="text-white/60 hover:text-white">
      {label}
    </Link>
  );
}

export function AppHeader() {
  const { phase } = usePhase();

  const categoryDisabled = phase === "0" || phase === "1" || phase === "3";
  const storyBoardDisabled = phase === "0" || phase === "1" || phase === "3";
  const osmDisabled = phase === "0" || phase === "1" || phase === "2";
  const wheelMapDisabled = phase === "0" || phase === "1" || phase === "2";

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
          <NavLink href="/wizard" label="Log" />
          <NavLink href="/feed" label="Feed" />
          <NavLink href="/map" label="Map" />
          <NavLink href="/story-board" label="Story Board" disabled={storyBoardDisabled} />
          <NavLink href="/category" label="Category" disabled={categoryDisabled} />
          <NavLink href="/wheelmap-helper" label="WheelMap" disabled={wheelMapDisabled} />
          <NavLink href="/osm-helper" label="OSM" disabled={osmDisabled} />
          <NavLink href="/export" label="Export" />
        </nav>
      </div>
    </header>
  );
}
