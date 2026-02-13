'use client';

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { PhaseGroupGuard } from "@/components/PhaseGroupGuard";
import { usePhase } from "@/lib/PhaseContext";
import { getGroupNumber, getRouteAccess } from "@/lib/accessControl";

type Identity = {
  displayName: string;
  groupId: string;
  groupName: string;
  sessionId: string;
};

function CategoryGovernanceContent() {
  const searchParams = useSearchParams();
  const flaggedJourneyId = searchParams.get("flag");

  const [fieldName, setFieldName] = useState(
    flaggedJourneyId ? "flag_inconsistent" : "",
  );
  const [suggestion, setSuggestion] = useState(
    flaggedJourneyId
      ? `Flag journey ${flaggedJourneyId.slice(0, 8)}… as needing governance review`
      : "",
  );
  const [rationale, setRationale] = useState("");
  const [observedPattern, setObservedPattern] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{
    id: string;
    field_name: string;
    suggestion: string;
    rationale: string | null;
    observed_pattern: string | null;
    suggested_session_id: string | null;
  }[]>([]);
  const [summary, setSummary] = useState<{
    totalJourneys: number;
    topBarrierType: string;
    otherCount: number;
  } | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [reassignField, setReassignField] = useState<string>("barrier_type");
  const [reassignOld, setReassignOld] = useState("");
  const [reassignNew, setReassignNew] = useState("");
  const [reassignCount, setReassignCount] = useState<number | null>(null);
  const [reassignBusy, setReassignBusy] = useState(false);
  const [reassignMessage, setReassignMessage] = useState<string | null>(null);
  const [groupNumber, setGroupNumber] = useState<1 | 2 | 3 | 4 | null>(null);
  const { phase } = usePhase();

  useEffect(() => {
    setGroupNumber(getGroupNumber());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("week6-identity");
    if (!raw) return;
    try {
      setIdentity(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const supabase = getSupabaseClient();
        const { data, error: dbError } = await supabase
          .from("category_suggestions")
          .select("id, field_name, suggestion, rationale, observed_pattern, suggested_session_id")
          .order("created_at", { ascending: false })
          .limit(100);
        if (dbError) throw dbError;
        if (!cancelled && data) setSuggestions(data as any);
      } catch {
        // Graceful: no data until Supabase is wired
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [saved]);

  useEffect(() => {
    let cancelled = false;
    async function loadSummary() {
      try {
        const supabase = getSupabaseClient();
        const { data, error: dbError } = await supabase
          .from("journeys")
          .select("barrier_type, where_happened, user_focus")
          .limit(500);
        if (dbError) throw dbError;
        if (cancelled || !data) return;
        const total = data.length;
        const otherCount = (data as { barrier_type?: string; where_happened?: string; user_focus?: string }[]).filter(
          (j) => j.barrier_type === "other" || j.where_happened === "other" || j.user_focus === "other"
        ).length;
        const barrierCounts: Record<string, number> = {};
        (data as { barrier_type?: string }[]).forEach((j) => {
          const bt = j.barrier_type || "unknown";
          barrierCounts[bt] = (barrierCounts[bt] ?? 0) + 1;
        });
        const topBarrierType =
          Object.entries(barrierCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
        setSummary({ totalJourneys: total, topBarrierType, otherCount });
      } catch {
        // ignore
      }
    }
    loadSummary();
    return () => { cancelled = true; };
  }, []);

  const BULK_FIELDS = [
    { key: "barrier_type", label: "Barrier type" },
    { key: "access_result", label: "Access result" },
    { key: "status", label: "Status" },
    { key: "user_focus", label: "User focus" },
    { key: "where_happened", label: "Where happened" },
  ] as const;

  const countReassign = async () => {
    setReassignMessage(null);
    setReassignCount(null);
    if (!reassignOld.trim()) {
      setReassignMessage("Enter the current (old) value to count.");
      return;
    }
    setReassignBusy(true);
    try {
      const supabase = getSupabaseClient();
      const { count, error: err } = await supabase
        .from("journeys")
        .select("*", { count: "exact", head: true })
        .eq(reassignField, reassignOld.trim());
      if (err) throw err;
      setReassignCount(count ?? 0);
      setReassignMessage(
        count === 0
          ? "No entries with that value."
          : `${count} entries may require updating.`
      );
    } catch (e: any) {
      setReassignMessage(e?.message ?? "Could not count.");
    } finally {
      setReassignBusy(false);
    }
  };

  const runReassign = async () => {
    setReassignMessage(null);
    if (!reassignOld.trim() || !reassignNew.trim()) {
      setReassignMessage("Enter both old and new values.");
      return;
    }
    setReassignBusy(true);
    try {
      const supabase = getSupabaseClient();
      const { data: ids, error: selErr } = await supabase
        .from("journeys")
        .select("id")
        .eq(reassignField, reassignOld.trim());
      if (selErr) throw selErr;
      const idList = (ids ?? []).map((r: { id: string }) => r.id);
      if (idList.length === 0) {
        setReassignMessage("No entries to update.");
        setReassignBusy(false);
        return;
      }
      const { error: updErr } = await supabase
        .from("journeys")
        .update({ [reassignField]: reassignNew.trim() })
        .in("id", idList);
      if (updErr) throw updErr;
      setReassignMessage(`Updated ${idList.length} entries.`);
      setReassignCount(null);
      setSuggestions((prev) => prev);
    } catch (e: any) {
      setReassignMessage(e?.message ?? "Could not update.");
    } finally {
      setReassignBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (!fieldName.trim() || !suggestion.trim()) {
      setError("Field name and suggestion are required.");
      return;
    }
    if (!confirm("This will immediately affect the shared dataset. Continue?")) {
      return;
    }
    try {
      const supabase = getSupabaseClient();
      const { error: insertError } = await supabase
        .from("category_suggestions")
        .insert({
          journey_id: flaggedJourneyId ?? null,
          field_name: fieldName.trim(),
          suggestion: suggestion.trim(),
          rationale: rationale.trim() || null,
          observed_pattern: observedPattern.trim() || null,
          suggested_name: identity?.displayName ?? null,
          suggested_session_id: identity?.sessionId ?? null,
        });
      if (insertError) throw insertError;
      setFieldName(flaggedJourneyId ? "flag_inconsistent" : "");
      setSuggestion("");
      setRationale("");
      setObservedPattern("");
      setSaved(true);
    } catch (err: any) {
      setError(err?.message ?? "Could not save suggestion.");
    }
  };

  const categoryAccess = getRouteAccess(phase, groupNumber, "category");
  const readOnly = categoryAccess === "readonly";

  return (
    <PhaseGroupGuard route="category">
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      {summary !== null && (
        <div className="rounded-xl border border-white/15 bg-white/[0.03] p-3 flex flex-wrap items-center gap-4 text-[11px] text-white/80">
          <span><strong className="text-white/90">Total journeys:</strong> {summary.totalJourneys}</span>
          <span><strong className="text-white/90">Most frequent barrier type:</strong> {summary.topBarrierType}</span>
          <span><strong className="text-white/90">Entries using &quot;Other&quot;:</strong> {summary.otherCount}</span>
        </div>
      )}

      <div className="rounded-xl border border-white/15 bg-white/[0.03] p-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50 mb-3">
          Before suggesting a category
        </div>
        <p className="text-sm text-white/85 mb-2">
          Look at the feed carefully.
        </p>
        <ul className="list-disc list-inside text-sm text-white/75 space-y-1">
          <li>Which barrier types appear repeatedly?</li>
          <li>Which entries fall into &quot;Other&quot;?</li>
          <li>Are similar issues described using different words?</li>
          <li>Does the schema shape what can be said?</li>
        </ul>
        <p className="mt-3 text-[11px] text-white/60">
          You are not adding labels. You are reshaping the dataset.
        </p>
      </div>

      <div className="rounded-xl border border-white/15 bg-white/[0.03] p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          Category / Governance
        </div>
        <h1 className="mt-2 text-xl font-semibold">
          Suggest missing categories
        </h1>
        <p className="mt-1 text-sm text-white/70">
          Stress-test barrier types and “where happened” values. Suggest new
          options or flag inconsistent entries so the dataset stays useful.
        </p>
      </div>

      {readOnly && (
        <p className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-[11px] text-white/70">
          View only — submitting suggestions and using the Bulk Reassign tool are available for Groups 3 & 4 in this phase.
        </p>
      )}

      {!readOnly && (
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-white/15 bg-white/[0.02] p-5"
      >
        <div className="space-y-1">
          <label className="text-[11px] text-white/70">Field (e.g. barrier_type, where_happened)</label>
          <input
            type="text"
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
            placeholder="barrier_type"
            className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-white/70">Suggestion</label>
          <input
            type="text"
            value={suggestion}
            onChange={(e) => setSuggestion(e.target.value)}
            placeholder="e.g. New value: environmental"
            className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-white/70">Rationale (optional)</label>
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            rows={2}
            placeholder="Why this category would help."
            className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-white/70">Observed Pattern (optional)</label>
          <textarea
            value={observedPattern}
            onChange={(e) => setObservedPattern(e.target.value)}
            rows={2}
            placeholder="e.g. 5 entries describe “signage confusion” but barrier_type lacks this category."
            className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
          />
        </div>
        {error && (
          <p className="rounded border border-red-500/60 bg-red-500/10 px-3 py-2 text-[11px] text-red-100">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full border-2 border-white bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white/10"
        >
          Submit suggestion
        </button>
        {saved && (
          <p className="text-[11px] text-emerald-200">Suggestion saved.</p>
        )}
      </form>
      )}

      <section className="rounded-xl border border-white/15 bg-white/[0.02] p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          Category Suggestions
        </div>
        <p className="mt-1 text-[11px] text-white/50">
          All suggestions become immediately available.
          Use responsibly — schema changes affect all entries.
        </p>
        {suggestions.length === 0 ? (
          <p className="mt-2 text-sm text-white/60">
            No category suggestions yet. Add one above to improve the taxonomy.
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {suggestions.map((s) => {
              const canDelete = Boolean(identity?.sessionId && s.suggested_session_id === identity.sessionId);
              return (
              <li
                key={s.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-white/12 bg-black/40 p-3"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-[11px] text-white/70">{s.field_name}</span>
                  <p className="mt-1 text-white/90">{s.suggestion}</p>
                  {s.rationale && (
                    <p className="mt-1 text-[11px] text-white/60">{s.rationale}</p>
                  )}
                  {s.observed_pattern && (
                    <p className="mt-1 text-[11px] text-white/50 italic">{s.observed_pattern}</p>
                  )}
                  <a
                    href="/feed"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-[10px] text-white/60 underline hover:text-white/80"
                  >
                    Preview affected entries
                  </a>
                </div>
                {canDelete && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm("Delete this suggestion?")) return;
                      try {
                        const supabase = getSupabaseClient();
                        const { error: err } = await supabase.from("category_suggestions").delete().eq("id", s.id);
                        if (err) throw err;
                        setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
                      } catch {
                        // ignore
                      }
                    }}
                    className="rounded-full border-2 border-white bg-black px-2 py-0.5 text-[10px] font-semibold text-red-200 hover:bg-white/10 shrink-0"
                  >
                    Delete
                  </button>
                )}
              </li>
            );})}
          </ul>
        )}
      </section>

      {!readOnly && (
      <section className="rounded-xl border border-white/15 bg-white/[0.02] p-5 space-y-4">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          Bulk Reassign Tool
        </div>
        <p className="text-sm text-white/85">
          When adding or refining a category,
          reassign affected entries to maintain dataset consistency.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-[11px] text-white/70">Field</label>
            <select
              value={reassignField}
              onChange={(e) => setReassignField(e.target.value)}
              className="block rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white focus:border-white/60 focus:outline-none"
            >
              {BULK_FIELDS.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-white/70">From (old value)</label>
            <input
              type="text"
              value={reassignOld}
              onChange={(e) => setReassignOld(e.target.value)}
              placeholder="e.g. other"
              className="w-32 rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-white/70">To (new value)</label>
            <input
              type="text"
              value={reassignNew}
              onChange={(e) => setReassignNew(e.target.value)}
              placeholder="e.g. environmental"
              className="w-32 rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={countReassign}
            disabled={reassignBusy}
            className="rounded-full border-2 border-white bg-black px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50"
          >
            Count affected
          </button>
          <button
            type="button"
            onClick={runReassign}
            disabled={reassignBusy}
            className="rounded-full border-2 border-emerald-500 bg-black px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
          >
            Reassign all
          </button>
        </div>
        {reassignCount !== null && (
          <p className="text-[11px] text-white/70">
            {reassignCount} entries with &quot;{reassignOld}&quot; → &quot;{reassignNew}&quot;
          </p>
        )}
        {reassignMessage && (
          <p className={`text-[11px] ${reassignMessage.startsWith("Updated") ? "text-emerald-200" : "text-white/80"}`}>
            {reassignMessage}
          </p>
        )}
      </section>
      )}
    </div>
    </PhaseGroupGuard>
  );
}

export default function CategoryGovernancePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl p-6 text-center text-sm text-white/60">Loading…</div>}>
      <CategoryGovernanceContent />
    </Suspense>
  );
}
