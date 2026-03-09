'use client';

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  campus: string;
};

type Claim = {
  id: string;
  source_url: string;
  source_label: string | null;
  user_focus: string | null;
  claim_text: string;
  created_name: string | null;
  created_group_id: string | null;
  created_at: string;
};

type ClaimFilterState = {
  user_focus: string;
  search: string;
};

const USER_FOCUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "general", label: "General" },
  { value: "wheelchair", label: "Wheelchair users" },
  { value: "blind_vi", label: "Blind & visually impaired" },
  { value: "both", label: "Both" },
];

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

type FeedView = "journeys" | "claims";

function FeedContent() {
  const [feedView, setFeedView] = useState<FeedView>("journeys");
  const [filters, setFilters] = useState<FilterState>({
    group: "",
    mode: "",
    barrier: "",
    result: "",
    campus: "",
  });
  const [claimFilters, setClaimFilters] = useState<ClaimFilterState>({
    user_focus: "",
    search: "",
  });
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [journeyIdsWithGuidance, setJourneyIdsWithGuidance] = useState<Set<string>>(new Set());
  const [deletingJourneyId, setDeletingJourneyId] = useState<string | null>(null);
  const [deletingClaimId, setDeletingClaimId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    type: "journey" | "claim";
    id: string;
    step: 1 | 2;
    label?: string;
  } | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { phase } = usePhase();

  useEffect(() => {
    if (pathname !== "/feed") return;
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
          const seenIds = new Set<string>();
          const seenCodes = new Set<string>();
          let list = (data as Journey[]).filter((j) => {
            if (seenIds.has(j.id)) return false;
            seenIds.add(j.id);
            if (j.journey_code && seenCodes.has(j.journey_code)) return false;
            if (j.journey_code) seenCodes.add(j.journey_code);
            return true;
          });
          if (typeof window !== "undefined") {
            try {
              const deletedId = sessionStorage.getItem("feed-deleted-journey-id");
              if (deletedId) {
                sessionStorage.removeItem("feed-deleted-journey-id");
                list = list.filter((j) => j.id !== deletedId);
              }
            } catch {
              // ignore
            }
          }
          setJourneys(list);
        }

        const { data: claimsData, error: claimsErr } = await supabase
          .from("claimed_access_statements")
          .select("id, source_url, source_label, user_focus, claim_text, created_name, created_group_id, created_at")
          .order("created_at", { ascending: false })
          .limit(100);
        if (!cancelled && !claimsErr && claimsData) {
          setClaims(claimsData as Claim[]);
        } else if (!cancelled && claimsErr) {
          setClaims([]);
        }
      } catch (err: any) {
        if (!cancelled) {
          const is404 =
            err?.code === "PGRST116" ||
            err?.message?.includes("404") ||
            (err?.status ?? err?.statusCode) === 404;
          setError(
            is404
              ? "Journeys table not found. Run supabase/schema.sql in your Supabase project (SQL Editor). Photo uploads use the storage bucket named 'evidence'."
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
  }, [pathname, searchParams.get("refresh")]);

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

  const handleClaimFilterChange = (key: keyof ClaimFilterState, value: string) => {
    setClaimFilters((prev) => ({ ...prev, [key]: value }));
  };

  const openDeleteConfirm = (type: "journey" | "claim", id: string, label?: string) => {
    if (type === "journey" && id === "example-1") return;
    setConfirmDelete({ type, id, step: 1, label });
  };

  const handleConfirmDeleteNext = async () => {
    if (!confirmDelete) return;
    if (confirmDelete.step === 1) {
      setConfirmDelete((prev) => (prev ? { ...prev, step: 2 } : null));
      return;
    }
    const { type, id } = confirmDelete;
    setConfirmDelete(null);
    if (type === "journey") {
      setDeletingJourneyId(id);
      try {
        const supabase = getSupabaseClient();
        await supabase.from("journey_steps").delete().eq("journey_id", id);
        await supabase.from("evidence").delete().eq("journey_id", id);
        const { error } = await supabase.from("journeys").delete().eq("id", id);
        if (error) throw error;
        setJourneys((prev) => prev.filter((x) => x.id !== id));
      } catch (err: any) {
        alert(err?.message ?? "Could not delete.");
      } finally {
        setDeletingJourneyId(null);
      }
    } else {
      setDeletingClaimId(id);
      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase.from("claimed_access_statements").delete().eq("id", id);
        if (error) throw error;
        setClaims((prev) => prev.filter((x) => x.id !== id));
      } catch (err: any) {
        alert(err?.message ?? "Could not delete.");
      } finally {
        setDeletingClaimId(null);
      }
    }
  };

  const handleConfirmDeleteCancel = () => {
    setConfirmDelete(null);
  };

  const filteredClaims = claims.filter((c) => {
    if (claimFilters.user_focus && c.user_focus !== claimFilters.user_focus) return false;
    if (!claimFilters.search.trim()) return true;
    const q = claimFilters.search.toLowerCase().trim();
    return (
      (c.claim_text && c.claim_text.toLowerCase().includes(q)) ||
      (c.source_label && c.source_label.toLowerCase().includes(q)) ||
      (c.source_url && c.source_url.toLowerCase().includes(q)) ||
      (c.created_name && c.created_name.toLowerCase().includes(q))
    );
  });

  const patternSummary = (() => {
    const btCounts: Record<string, number> = {};
    const resultCounts: Record<string, number> = {};

    filtered.forEach((j) => {
      btCounts[j.barrier_type] = (btCounts[j.barrier_type] ?? 0) + 1;
      resultCounts[j.access_result] = (resultCounts[j.access_result] ?? 0) + 1;
    });

    return { btCounts, resultCounts };
  })();

  const similarityMap = (() => {
    const keyCounts: Record<string, number> = {};
    journeys.forEach((j) => {
      const key = `${j.campus_or_system}::${j.barrier_type}`;
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
          Browse logged journeys and claims across groups. Use filters to see patterns in
          access, barriers, claims based on user focus.
        </p>
        <div className="mt-4 flex gap-1 rounded-lg border border-white/15 bg-white/[0.02] p-1 text-[11px]">
          <button
            type="button"
            onClick={() => setFeedView("journeys")}
            className={`flex-1 rounded-md border-2 px-3 py-2 font-semibold uppercase tracking-[0.18em] ${
              feedView === "journeys"
                ? "border-white bg-white text-black"
                : "border-white/15 bg-black/40 text-white hover:bg-white/10"
            }`}
          >
            Journeys
          </button>
          <button
            type="button"
            onClick={() => setFeedView("claims")}
            className={`flex-1 rounded-md border-2 px-3 py-2 font-semibold uppercase tracking-[0.18em] ${
              feedView === "claims"
                ? "border-white bg-white text-black"
                : "border-white/15 bg-black/40 text-white hover:bg-white/10"
            }`}
          >
            claims
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/60 bg-red-500/15 px-4 py-3 text-sm font-medium text-red-100">
          {error}
        </div>
      )}

      {/* Phase-specific prompts */}
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

      {feedView === "journeys" && (
        <>
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
          <div className="grid gap-3 md:grid-cols-2">
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
          </div>
        )}
      </section>
        </>
      )}

      {feedView === "claims" && (
      <section className="rounded-xl border border-white/15 bg-white/[0.02] p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          Filters
        </div>
        <div className="grid gap-3 text-[11px] md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-white/70">User focus</label>
            <select
              value={claimFilters.user_focus}
              onChange={(e) => handleClaimFilterChange("user_focus", e.target.value)}
              className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-xs text-white focus:border-white/60 focus:outline-none"
            >
              {USER_FOCUS_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-white/70">Search (claim, source, name)</label>
            <input
              value={claimFilters.search}
              onChange={(e) => handleClaimFilterChange("search", e.target.value)}
              placeholder="Search in claim text, source URL/label, creator name"
              className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
            />
          </div>
        </div>
      </section>
      )}

      <section className="space-y-3 rounded-xl border border-white/15 bg-white/[0.02] p-4">
        {feedView === "journeys" ? (
          <>
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
                    const key = `${j.campus_or_system}::${j.barrier_type}`;
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
                <div className="flex items-center gap-2">
                  <Link
                    href={`/journeys/${j.id}`}
                    className="rounded-full border-2 border-white bg-black px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10"
                  >
                    View
                  </Link>
                  {j.id !== "example-1" && (
                    <button
                      type="button"
                      onClick={() => openDeleteConfirm("journey", j.id, j.journey_code)}
                      disabled={deletingJourneyId === j.id}
                      className="rounded-full border border-red-500/60 px-3 py-1 text-[10px] font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      {deletingJourneyId === j.id ? "Deleting…" : "Delete"}
                    </button>
                  )}
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
                  </div>
                  <Link
                    href="/journeys/example-1"
                    className="rounded-full border-2 border-white bg-black px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10"
                  >
                    View example
                  </Link>
                </div>
              </article>
            </div>
          </section>
        )}
          </>
        ) : (
          <>
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
            claims
          </div>
          <div className="text-[11px] text-white/50">
            {loading ? "Loading…" : `${filteredClaims.length} of ${claims.length} shown`}
          </div>
        </div>
        {filteredClaims.length === 0 && !loading && (
          <p className="text-sm text-white/60">
            No Phase 0 claims match these filters. Log claims on the Start screen in Phase 0.
          </p>
        )}
        <div className="space-y-3">
          {filteredClaims.map((c) => (
            <article
              key={c.id}
              className="flex flex-col gap-2 rounded-lg border border-white/12 bg-black/60 p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <a
                  href={c.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="max-w-[70%] truncate font-mono text-[11px] text-white/80 underline hover:text-white"
                >
                  {c.source_label || c.source_url}
                </a>
                {c.user_focus && (
                  <span className="rounded-full border border-white/30 px-2 py-[2px] text-[10px] text-white/70">
                    {USER_FOCUS_OPTIONS.find((o) => o.value === c.user_focus)?.label ?? c.user_focus}
                  </span>
                )}
              </div>
              <p className="text-[13px] text-white/85">
                {c.claim_text.length > 200 ? c.claim_text.slice(0, 197) + "…" : c.claim_text}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                {c.created_name && (
                  <span className="text-white/60">Logged by {c.created_name}</span>
                )}
                <button
                  type="button"
                  onClick={() => openDeleteConfirm("claim", c.id)}
                  disabled={deletingClaimId === c.id}
                  className="rounded-full border border-red-500/60 px-3 py-1 text-[10px] font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                >
                  {deletingClaimId === c.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </article>
          ))}
        </div>
          </>
        )}
      </section>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-md rounded-xl border border-white/20 bg-black p-5 shadow-xl">
            {confirmDelete.step === 1 ? (
              <>
                <h3 className="text-base font-semibold text-white">
                  {confirmDelete.type === "journey"
                    ? "Delete this journey?"
                    : "Delete this logged claim?"}
                </h3>
                <p className="mt-2 text-sm text-white/70">
                  This cannot be undone. You will need to re-log if you delete by mistake.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmDeleteCancel}
                    className="rounded-full border border-white/30 bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteNext}
                    className="rounded-full border-2 border-red-500/70 bg-red-500/20 px-4 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/30"
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-base font-semibold text-amber-200">
                  Are you sure?
                </h3>
                <p className="mt-2 text-sm text-white/70">
                  This will permanently remove it. Click &quot;Yes, delete&quot; only if you are certain.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmDeleteCancel}
                    className="rounded-full border border-white/30 bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteNext}
                    className="rounded-full border-2 border-red-500 bg-red-600/80 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600"
                  >
                    Yes, delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
    </PhaseGroupGuard>
  );
}

export default function FeedPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 py-12 text-center text-sm text-white/60">
          Loading feed…
        </div>
      }
    >
      <FeedContent />
    </Suspense>
  );
}

