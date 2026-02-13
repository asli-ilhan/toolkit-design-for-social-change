'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { usePhase } from "@/lib/PhaseContext";
import { PhaseGroupGuard } from "@/components/PhaseGroupGuard";

type Journey = {
  id: string;
  journey_code: string;
  group_id: string | null;
  mode: "physical" | "digital";
  campus_or_system: string;
  claimed_access_statement?: string | null;
  claimed_statement_id?: string | null;
  what_happened: string;
  barrier_type: string;
  access_result: string;
  status: string;
  lat: number | null;
  lng: number | null;
  user_focus?: string | null;
  where_happened?: string | null;
  issue_scope?: string | null;
};

type FilterState = {
  group: string;
  mode: string;
  barrier: string;
  result: string;
  status: string;
  campus: string;
};

const SAMPLE_JOURNEY: Journey = {
  id: "example-1",
  journey_code: "UAL-W6-G3-001",
  group_id: "Group 3 — Digital Systems",
  mode: "physical",
  campus_or_system: "UAL Camberwell Peckham Building",
  what_happened:
    "Lift was out of service and the step-free alternative route was not clearly signposted.",
  barrier_type: "mixed",
  access_result: "blocked",
  status: "observed",
  lat: null,
  lng: null,
  issue_scope: "recurring_pattern",
};

export default function FeedPage() {
  const [filters, setFilters] = useState<FilterState>({
    group: "",
    mode: "",
    barrier: "",
    result: "",
    status: "",
    campus: "",
  });
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [journeyIdsWithGuidance, setJourneyIdsWithGuidance] = useState<Set<string>>(new Set());
  const { phase } = usePhase();

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
            "id, journey_code, group_id, mode, campus_or_system, claimed_access_statement, claimed_statement_id, what_happened, barrier_type, access_result, status, lat, lng, user_focus, where_happened",
          )
          .order("created_at", { ascending: false })
          .limit(50);

        if (dbError) {
          throw dbError;
        }
        if (!cancelled && data) {
          setJourneys(data as Journey[]);
        }
      } catch (err: any) {
        if (!cancelled) {
          const is404 =
            err?.code === "PGRST116" ||
            err?.message?.includes("404") ||
            (err?.status ?? err?.statusCode) === 404;
          setError(
            is404
              ? "Journeys table not found. Run supabase/schema.sql in your Supabase project (SQL Editor) and create a storage bucket named 'wizard' if you use photo uploads."
              : "Database connection issue — submissions may not be saved.",
          );
          setJourneys([]);
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

  useEffect(() => {
    if (phase !== "2") return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error: evError } = await supabase
          .from("evidence")
          .select("journey_id")
          .eq("type", "policy_doc");
        if (evError || cancelled) return;
        const ids = new Set((data ?? []).map((r: { journey_id: string }) => r.journey_id));
        if (!cancelled) setJourneyIdsWithGuidance(ids);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase]);

  const filtered = journeys.filter((j) => {
    if (filters.mode && j.mode !== filters.mode) return false;
    if (filters.barrier && j.barrier_type !== filters.barrier) return false;
    if (filters.result && j.access_result !== filters.result) return false;
    if (filters.status && j.status !== filters.status) return false;
    if (
      filters.campus &&
      j.campus_or_system.toLowerCase() !== filters.campus.toLowerCase()
    )
      return false;
    // For now group filter matches by string on group_id (in real DB this is FK)
    if (
      filters.group &&
      j.group_id &&
      !j.group_id.toLowerCase().includes(filters.group.toLowerCase())
    )
      return false;
    return true;
  });

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const patternSummary = (() => {
    const btCounts: Record<string, number> = {};
    const resultCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};

    filtered.forEach((j) => {
      btCounts[j.barrier_type] = (btCounts[j.barrier_type] ?? 0) + 1;
      resultCounts[j.access_result] = (resultCounts[j.access_result] ?? 0) + 1;
      statusCounts[j.status] = (statusCounts[j.status] ?? 0) + 1;
    });

    return { btCounts, resultCounts, statusCounts };
  })();

  const similarityMap = (() => {
    const keyCounts: Record<string, number> = {};
    journeys.forEach((j) => {
      const key = `${j.campus_or_system}::${j.barrier_type}::${j.status}`;
      keyCounts[key] = (keyCounts[key] ?? 0) + 1;
    });
    return keyCounts;
  })();

  return (
    <PhaseGroupGuard route="feed">
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="rounded-xl border border-white/15 bg-white/[0.03] p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          Screen 06 · Live feed / explore
        </div>
        <h1 className="mt-2 text-xl font-semibold">Class live feed</h1>
        <p className="mt-1 text-sm text-white/70">
          Browse logged journeys across groups. Use filters to see patterns in
          access, barriers, and outcomes, and send promising entries to the
          Story Board.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/60 bg-red-500/15 px-4 py-3 text-sm font-medium text-red-100">
          {error}
        </div>
      )}

      {/* Phase-specific prompts */}
      {phase === "1" && (
        <div className="rounded-xl border border-white/15 bg-white/[0.03] p-4">
          <h2 className="text-sm font-semibold text-white/90">Check your entries</h2>
          <ul className="mt-2 list-inside list-disc space-y-0.5 text-sm text-white/80">
            <li>Are your steps specific?</li>
            <li>Does your entry include guidance?</li>
          </ul>
        </div>
      )}
      {phase === "2" && (
        <div className="rounded-xl border border-white/15 bg-white/[0.03] p-4">
          <h2 className="text-sm font-semibold text-white/90">Categories & governance</h2>
          <p className="mt-1 text-[11px] text-white/60">Use the feed to spot patterns:</p>
          <ul className="mt-2 list-inside list-disc space-y-0.5 text-sm text-white/80">
            <li>Most common barrier types (see Patterns below)</li>
            <li>&quot;Other&quot; usage: {journeys.filter((j) => (j.user_focus === "other" || j.where_happened === "other")).length} entries with Other</li>
            <li>Missing guidance: {journeys.length - journeyIdsWithGuidance.size} entries without a guidance URL</li>
          </ul>
        </div>
      )}
      {phase === "2" && (
        <div className="rounded-xl border border-white/15 bg-white/[0.03] p-4">
          <h2 className="text-sm font-semibold text-white/90">Storyboard focus</h2>
          <ul className="mt-2 list-inside list-disc space-y-0.5 text-sm text-white/80">
            <li>Most complete entries (with steps, photos, guidance)</li>
            <li>Entries with strongest evidence</li>
            <li>Entries with approved category updates</li>
          </ul>
        </div>
      )}
      {phase === "3" && (
        <div className="rounded-xl border border-white/15 bg-white/[0.03] p-4">
          <h2 className="text-sm font-semibold text-white/90">Ready for OSM</h2>
          <ul className="mt-2 list-inside list-disc space-y-0.5 text-sm text-white/80">
            <li>Approved journeys ready for OSM: {filtered.filter((j) => j.lat != null && j.lng != null).length} with location</li>
            <li>Highlight journeys with location data for public contribution</li>
          </ul>
        </div>
      )}

      <section className="rounded-xl border border-white/15 bg-white/[0.02] p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          Filters
        </div>
        <div className="grid gap-3 text-[11px] md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-white/70">Group</label>
            <input
              value={filters.group}
              onChange={(e) => handleFilterChange("group", e.target.value)}
              placeholder="e.g., Group 3"
              className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-white/70">Mode</label>
            <select
              value={filters.mode}
              onChange={(e) => handleFilterChange("mode", e.target.value)}
              className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-xs text-white focus:border-white/60 focus:outline-none"
            >
              <option value="">All</option>
              <option value="physical">Physical</option>
              <option value="digital">Digital</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-white/70">Campus / system</label>
            <input
              value={filters.campus}
              onChange={(e) => handleFilterChange("campus", e.target.value)}
              placeholder="e.g., UAL Camberwell Peckham Building, Moodle"
              className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-white/70">Barrier type</label>
            <select
              value={filters.barrier}
              onChange={(e) => handleFilterChange("barrier", e.target.value)}
              className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-xs text-white focus:border-white/60 focus:outline-none"
            >
              <option value="">All</option>
              <option value="physical">Physical</option>
              <option value="digital">Digital</option>
              <option value="information">Information</option>
              <option value="process">Process</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-white/70">Access result</label>
            <select
              value={filters.result}
              onChange={(e) => handleFilterChange("result", e.target.value)}
              className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-xs text-white focus:border-white/60 focus:outline-none"
            >
              <option value="">All</option>
              <option value="granted">Granted</option>
              <option value="blocked">Blocked</option>
              <option value="partial">Partial</option>
              <option value="unclear">Unclear</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-white/70">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-xs text-white focus:border-white/60 focus:outline-none"
            >
              <option value="">All</option>
              <option value="observed">Observed</option>
              <option value="confirmed">Confirmed</option>
              <option value="needs_verification">Needs verification</option>
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/15 bg-white/[0.02] p-4 text-[11px] text-white/80">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          Patterns in current results
        </div>
        {filtered.length === 0 ? (
          <p className="text-white/60">
            Adjust filters to see barrier and outcome patterns.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-white/50">
                Barrier type
              </div>
              <ul className="space-y-0.5">
                {Object.entries(patternSummary.btCounts).map(([k, v]) => (
                  <li key={k}>
                    <span className="font-semibold">{k}</span>: {v}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-white/50">
                Access result
              </div>
              <ul className="space-y-0.5">
                {Object.entries(patternSummary.resultCounts).map(([k, v]) => (
                  <li key={k}>
                    <span className="font-semibold">{k}</span>: {v}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-white/50">
                Status
              </div>
              <ul className="space-y-0.5">
                {Object.entries(patternSummary.statusCounts).map(([k, v]) => (
                  <li key={k}>
                    <span className="font-semibold">{k}</span>: {v}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-white/15 bg-white/[0.02] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
            Journeys
          </div>
          <div className="text-[11px] text-white/50">
            {loading
              ? "Loading…"
              : `${filtered.length} of ${journeys.length} shown`}
          </div>
        </div>

        {filtered.length === 0 && !loading && !error && (
          <p className="text-sm text-white/60">
            No journeys match these filters yet. Try clearing some filters or
            log a new entry.
          </p>
        )}

        <div className="space-y-3">
          {filtered.map((j) => (
            <article
              key={j.id}
              className="flex flex-col gap-2 rounded-lg border border-white/12 bg-black/60 p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="font-mono text-[11px] text-white/80">
                  {j.journey_code}
                </div>
                <div className="flex flex-wrap gap-1 text-[10px]">
                  <span className="rounded-full border border-white/30 px-2 py-[2px] uppercase tracking-[0.18em] text-white/70">
                    {j.mode === "physical" ? "Physical" : "Digital"}
                  </span>
                  <span className="rounded-full border border-white/20 px-2 py-[2px] text-white/70">
                    {j.campus_or_system}
                  </span>
                </div>
              </div>
              <p className="text-[13px] text-white/85">
                {j.what_happened.length > 150
                  ? j.what_happened.slice(0, 147) + "…"
                  : j.what_happened}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                <div className="flex flex-wrap gap-1">
                  <span className="rounded-full border border-white/30 px-2 py-[2px] text-white/80">
                    Barrier: {j.barrier_type}
                  </span>
                  <span className="rounded-full border border-white/30 px-2 py-[2px] text-white/80">
                    Result: {j.access_result}
                  </span>
                  <span className="rounded-full border border-white/30 px-2 py-[2px] text-white/80">
                    Status: {j.status}
                  </span>
                  {j.claimed_statement_id && (
                    <span className="rounded-full border border-white/40 px-2 py-[2px] text-white/90">
                      Linked Claim
                    </span>
                  )}
                  {j.claimed_access_statement &&
                    j.claimed_access_statement.length > 20 &&
                    j.what_happened.length > 20 && (
                      <span className="rounded-full border border-amber-400/50 px-2 py-[2px] text-[10px] text-amber-200">
                        Claim Mismatch Documented
                      </span>
                    )}
                  {(() => {
                    const key = `${j.campus_or_system}::${j.barrier_type}::${j.status}`;
                    const count = similarityMap[key] ?? 0;
                    if (count > 1) {
                      return (
                        <span className="rounded-full border border-amber-400/70 px-2 py-[2px] text-amber-200">
                          Similar here: {count - 1} more
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/journeys/${j.id}`}
                    className="rounded-full border-2 border-white bg-black px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10"
                  >
                    View
                  </Link>
                  <Link
                    href={`/story-board?add=${j.id}`}
                    className="rounded-full border-2 border-white bg-black px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10"
                  >
                    Add to Story Board
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {error && (
          <section className="mt-6 rounded-xl border border-white/20 bg-white/[0.02] p-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              Demo Example (Not Live Data)
            </h3>
            <p className="mt-1 text-[11px] text-white/60">
              Below is a sample entry so you can see the format. It is not from
              the live database.
            </p>
            <div className="mt-3 space-y-3">
              <article className="flex flex-col gap-2 rounded-lg border border-white/12 border-dashed bg-black/60 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="font-mono text-[11px] text-white/80">
                    {SAMPLE_JOURNEY.journey_code}
                  </div>
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    <span className="rounded-full border border-white/30 px-2 py-[2px] uppercase tracking-[0.18em] text-white/70">
                      {SAMPLE_JOURNEY.mode === "physical" ? "Physical" : "Digital"}
                    </span>
                    <span className="rounded-full border border-white/20 px-2 py-[2px] text-white/70">
                      {SAMPLE_JOURNEY.campus_or_system}
                    </span>
                  </div>
                </div>
                <p className="text-[13px] text-white/85">
                  {SAMPLE_JOURNEY.what_happened.length > 150
                    ? SAMPLE_JOURNEY.what_happened.slice(0, 147) + "…"
                    : SAMPLE_JOURNEY.what_happened}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                  <div className="flex flex-wrap gap-1">
                    <span className="rounded-full border border-white/30 px-2 py-[2px] text-white/80">
                      Barrier: {SAMPLE_JOURNEY.barrier_type}
                    </span>
                    <span className="rounded-full border border-white/30 px-2 py-[2px] text-white/80">
                      Result: {SAMPLE_JOURNEY.access_result}
                    </span>
                    <span className="rounded-full border border-white/30 px-2 py-[2px] text-white/80">
                      Status: {SAMPLE_JOURNEY.status}
                    </span>
                  </div>
                  <Link
                    href="/examples/ual-w6-g3-001"
                    className="rounded-full border-2 border-white bg-black px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10"
                  >
                    View example
                  </Link>
                </div>
              </article>
            </div>
          </section>
        )}
      </section>
    </div>
    </PhaseGroupGuard>
  );
}

