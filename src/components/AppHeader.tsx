"use client";

import Link from "next/link";

const NAV_ITEMS: { href: string; label: string }[] = [
  { href: "/wizard", label: "Log" },
  { href: "/feed", label: "Feed" },
  { href: "/map", label: "Map" },
  { href: "/story-board", label: "Story Board" },
  { href: "/category", label: "Category" },
  { href: "/wheelmap-helper", label: "WheelMap" },
  { href: "/osm-helper", label: "OSM" },
  { href: "/export", label: "Export" },
];

export function AppHeader() {
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
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-white/60 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
