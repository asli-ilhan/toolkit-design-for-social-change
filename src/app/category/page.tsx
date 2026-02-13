'use client';

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { PhaseGuard } from "@/components/PhaseGuard";

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
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{
    id: string;
    field_name: string;
    suggestion: string;
    rationale: string | null;
    suggested_session_id: string | null;
    status: string;
    approved_at: string | null;
  }[]>([]);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [reassignField, setReassignField] = useState<string>("barrier_type");
  const [reassignOld, setReassignOld] = useState("");
  const [reassignNew, setReassignNew] = useState("");
  const [reassignCount, setReassignCount] = useState<number | null>(null);
  const [reassignBusy, setReassignBusy] = useState(false);
  const [reassignMessage, setReassignMessage] = useState<string | null>(null);

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
          .select("id, field_name, suggestion, rationale, suggested_session_id, status, approved_at")
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
    try {
      const supabase = getSupabaseClient();
      const { error: insertError } = await supabase
        .from("category_suggestions")
        .insert({
          journey_id: flaggedJourneyId ?? null,
          field_name: fieldName.trim(),
          suggestion: suggestion.trim(),
          rationale: rationale.trim() || null,
          suggested_name: identity?.displayName ?? null,
          suggested_session_id: identity?.sessionId ?? null,
        });
      if (insertError) throw insertError;
      setFieldName(flaggedJourneyId ? "flag_inconsistent" : "");
      setSuggestion("");
      setRationale("");
      setSaved(true);
    } catch (err: any) {
      setError(err?.message ?? "Could not save suggestion.");
    }
  };

  return (
    <PhaseGuard allowedPhases={["2_categories"]}>
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
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

      <section className="rounded-xl border border-white/15 bg-white/[0.02] p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          Recent suggestions
        </div>
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
                <div>
                  <span className="font-mono text-[11px] text-white/70">
                    {s.field_name}
                  </span>
                  <p className="mt-1 text-white/90">{s.suggestion}</p>
                  {s.rationale && (
                    <p className="mt-1 text-[11px] text-white/60">{s.rationale}</p>
                  )}
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

      <section className="rounded-xl border border-white/15 bg-white/[0.02] p-5 space-y-6">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          Suggestions (Lecturer: approve or reject)
        </div>
        {["pending", "approved", "rejected"].map((status) => {
          const list = suggestions.filter((s) => (s.status || "pending") === status);
          const title =
            status === "pending"
              ? "Pending"
              : status === "approved"
              ? "Approved"
              : "Rejected";
          return (
            <div key={status}>
              <h3 className="mb-2 text-sm font-semibold text-white/90">{title}</h3>
              {list.length === 0 ? (
                <p className="text-[11px] text-white/50">None</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {list.map((s) => {
                    const canDelete = Boolean(identity?.sessionId && s.suggested_session_id === identity.sessionId);
                    return (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-white/12 bg-black/40 p-3"
                      >
                        <div>
                          <span className="font-mono text-[11px] text-white/70">{s.field_name}</span>
                          <p className="mt-1 text-white/90">{s.suggestion}</p>
                          {s.rationale && (
                            <p className="mt-1 text-[11px] text-white/60">{s.rationale}</p>
                          )}
                          {s.approved_at && status === "approved" && (
                            <p className="mt-1 text-[10px] text-white/50">
                              Approved {new Date(s.approved_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          {(s.status || "pending") === "pending" && (
                            <>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const supabase = getSupabaseClient();
                                    await supabase
                                      .from("category_suggestions")
                                      .update({ status: "approved", approved_at: new Date().toISOString() })
                                      .eq("id", s.id);
                                    setSuggestions((prev) =>
                                      prev.map((x) =>
                                        x.id === s.id
                                          ? { ...x, status: "approved", approved_at: new Date().toISOString() }
                                          : x,
                                      ),
                                    );
                                  } catch {}
                                }}
                                className="rounded-full border-2 border-white bg-black px-2 py-0.5 text-[10px] font-semibold text-emerald-200 hover:bg-white/10"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const supabase = getSupabaseClient();
                                    await supabase
                                      .from("category_suggestions")
                                      .update({ status: "rejected" })
                                      .eq("id", s.id);
                                    setSuggestions((prev) =>
                                      prev.map((x) => (x.id === s.id ? { ...x, status: "rejected" } : x)),
                                    );
                                  } catch {}
                                }}
                                className="rounded-full border-2 border-white bg-black px-2 py-0.5 text-[10px] font-semibold text-red-200 hover:bg-white/10"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {canDelete && (s.status || "pending") !== "approved" && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!confirm("Delete this suggestion?")) return;
                                try {
                                  const supabase = getSupabaseClient();
                                  await supabase.from("category_suggestions").delete().eq("id", s.id);
                                  setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
                                } catch {}
                              }}
                              className="rounded-full border-2 border-white bg-black px-2 py-0.5 text-[10px] font-semibold text-red-200 hover:bg-white/10"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </section>

      <section className="rounded-xl border border-white/15 bg-white/[0.02] p-5 space-y-4">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          Bulk Reassign Tool
        </div>
        <p className="text-[11px] text-white/70">
          After approving a new category or merge, reassign affected entries to the new value.
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
    </div>
    </PhaseGuard>
  );
}

export default function CategoryGovernancePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl p-6 text-center text-sm text-white/60">Loading…</div>}>
      <CategoryGovernanceContent />
    </Suspense>
  );
}
