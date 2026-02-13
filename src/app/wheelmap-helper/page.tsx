'use client';

import { useState } from "react";
import Link from "next/link";
import { PhaseGroupGuard } from "@/components/PhaseGroupGuard";

const WHEELMAP_URL = "https://wheelmap.org";

export default function WheelMapHelperPage() {
  const [status, setStatus] = useState("");
  const [noPersonalDataConfirmed, setNoPersonalDataConfirmed] = useState(false);

  return (
    <PhaseGroupGuard route="wheelmap">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <div className="rounded-xl border border-white/15 bg-white/[0.03] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
            WheelMap
          </div>
          <h1 className="mt-2 text-xl font-semibold">
            WheelMap contribution
          </h1>
          <p className="mt-1 text-sm text-white/70">
            WheelMap is for structured wheelchair accessibility information. You can contribute whether a place is fully accessible, partially accessible, not accessible, or unknown. Use this for physical journeys where wheelchair access is relevant.
          </p>
        </div>

        <section className="rounded-xl border border-white/15 bg-white/[0.02] p-5 space-y-3">
          <h2 className="text-sm font-semibold">Accessibility status</h2>
          <p className="text-[12px] text-white/70">
            Choose the status that best describes wheelchair accessibility at the location.
          </p>
          <div className="flex flex-col gap-2 text-sm">
            {[
              { value: "fully_accessible", label: "Fully accessible" },
              { value: "partially_accessible", label: "Partially accessible" },
              { value: "not_accessible", label: "Not accessible" },
              { value: "unknown", label: "Unknown" },
            ].map(({ value, label }) => (
              <label
                key={value}
                className="flex items-center gap-3 rounded-lg border border-white/15 bg-black/40 px-3 py-2 cursor-pointer hover:border-white/30"
              >
                <input
                  type="radio"
                  name="wheelmap-status"
                  value={value}
                  checked={status === value}
                  onChange={() => setStatus(value)}
                  className="rounded-full border-white/30"
                />
                <span className="text-white/90">{label}</span>
              </label>
            ))}
          </div>
          <label className="mt-4 flex items-start gap-2 text-[12px] text-white/80">
            <input
              type="checkbox"
              checked={noPersonalDataConfirmed}
              onChange={(e) => setNoPersonalDataConfirmed(e.target.checked)}
              className="mt-[2px]"
            />
            <span>I confirm no personal data is included in this contribution.</span>
          </label>
          <a
            href={WHEELMAP_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full border-2 border-white bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10 disabled:opacity-50 disabled:pointer-events-none mt-2"
            style={!noPersonalDataConfirmed ? { opacity: 0.6, pointerEvents: "none" } : undefined}
            aria-disabled={!noPersonalDataConfirmed}
          >
            Open WheelMap
          </a>
        </section>

        <Link
          href="/"
          className="inline-flex rounded-full border-2 border-white bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10 w-fit"
        >
          ← Back to Home
        </Link>
      </div>
    </PhaseGroupGuard>
  );
}
