'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PhaseGroupGuard } from "@/components/PhaseGroupGuard";
import { getSupabaseClient } from "@/lib/supabaseClient";

type JourneyRow = {
  id: string;
  journey_code: string;
  mode: string;
  campus_or_system: string;
  location_text: string | null;
  where_happened: string | null;
  where_happened_other: string | null;
};

function buildPlaceLabel(j: JourneyRow): string {
  const buildingOrSystem = j.campus_or_system?.trim() || "—";
  if (j.mode === "digital") {
    return buildingOrSystem;
  }
  const specific =
    j.location_text?.trim() ||
    j.where_happened_other?.trim() ||
    j.where_happened?.trim() ||
    "";
  if (specific) {
    return `${buildingOrSystem} — ${specific}`;
  }
  return buildingOrSystem;
}

export default function MapPage() {
  const [journeys, setJourneys] = useState<JourneyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const supabase = getSupabaseClient();
        const { data, error: dbError } = await supabase
          .from("journeys")
          .select(
            "id, journey_code, mode, campus_or_system, location_text, where_happened, where_happened_other",
          )
          .order("created_at", { ascending: false })
          .limit(500);
        if (dbError) throw dbError;
        if (!cancelled && data) {
          setJourneys(data as JourneyRow[]);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.message ??
              "Could not load journeys. Check Supabase configuration.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const placesWithCounts = useMemo(() => {
    const byPlace = new Map<string, { count: number; journeyIds: string[] }>();
    for (const j of journeys) {
      const label = buildPlaceLabel(j);
      const normalized = label.trim() || "(Unspecified location)";
      const entry = byPlace.get(normalized);
      if (entry) {
        entry.count += 1;
        entry.journeyIds.push(j.id);
      } else {
        byPlace.set(normalized, { count: 1, journeyIds: [j.id] });
      }
    }
    return Array.from(byPlace.entries())
      .map(([place, { count, journeyIds }]) => ({ place, count, journeyIds }))
      .sort((a, b) => b.count - a.count);
  }, [journeys]);

  return (
    <PhaseGroupGuard route="map">
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="rounded-xl border border-white/15 bg-white/[0.03] p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          Spatial view · Where submissions were made
        </div>
        <h1 className="mt-2 text-xl font-semibold">
          Submissions by location
        </h1>
        <p className="mt-1 text-sm text-white/70">
          Each row is a place (building, floor, room or system) where at least
          one journey was logged. The number shows how many submissions were
          made there — use it to spot repeated barriers in the same spot.
        </p>
      </div>

      {error && (
        <p className="rounded border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      )}

      {loading && (
        <div className="rounded-xl border border-white/15 bg-white/[0.02] p-6 text-center text-sm text-white/60">
          Loading…
        </div>
      )}

      {!loading && placesWithCounts.length === 0 && (
        <div className="rounded-xl border border-white/15 bg-white/[0.02] p-6 text-center text-sm text-white/60">
          No submissions yet. Log a journey to see locations here.
        </div>
      )}

      {!loading && placesWithCounts.length > 0 && (
        <section className="rounded-xl border border-white/15 bg-white/[0.02] overflow-hidden">
          <ul className="divide-y divide-white/10">
            {placesWithCounts.map(({ place, count, journeyIds }) => (
              <li
                key={place}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <span className="font-medium text-white/95">{place}</span>
                <div className="flex items-center gap-2">
                  {count > 1 ? (
                    <span
                      className="rounded-full border border-white/30 bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white/90"
                      title={`${count} submissions at this location`}
                    >
                      +{count - 1}
                    </span>
                  ) : null}
                  <span className="text-[11px] text-white/50">
                    {count} {count === 1 ? "submission" : "submissions"}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {journeyIds.slice(0, 5).map((id) => (
                      <Link
                        key={id}
                        href={`/journeys/${id}`}
                        className="rounded-full border border-white/25 px-2 py-[2px] text-[11px] text-white/70 hover:bg-white/10 hover:text-white"
                      >
                        {id.slice(0, 8)}…
                      </Link>
                    ))}
                    {journeyIds.length > 5 && (
                      <span className="text-[11px] text-white/50">
                        +{journeyIds.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
    </PhaseGroupGuard>
  );
}
