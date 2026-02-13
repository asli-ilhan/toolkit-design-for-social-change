'use client';

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { PhaseGuard } from "@/components/PhaseGuard";
import { usePhase } from "@/lib/PhaseContext";

type StoryNote = {
  id: string;
  title: string;
  note: string;
  tags: string[];
  linked_journey_ids?: string[];
  claim?: string | null;
  supporting_evidence_ids?: string[];
  what_is_missing?: string | null;
  framing_for_figma?: string | null;
  extra_notes?: string | null;
  created_at: string;
  created_session_id?: string | null;
};

type Identity = {
  displayName: string;
  groupId: string;
  groupName: string;
  sessionId: string;
};

function StoryBoardContent() {
  const searchParams = useSearchParams();
  const addId = searchParams.get("add");

  const [notes, setNotes] = useState<StoryNote[]>([]);
  const [claim, setClaim] = useState("");
  const [supportingEvidenceIds, setSupportingEvidenceIds] = useState<string[]>([]);
  const [whatIsMissing, setWhatIsMissing] = useState("");
  const [framingForFigma, setFramingForFigma] = useState("");
  const [extraNotes, setExtraNotes] = useState("");
  const [tags, setTags] = useState("");
  const [linkedJourneyIds, setLinkedJourneyIds] = useState<string[]>([]);
  const [availableJourneys, setAvailableJourneys] = useState<{ id: string; journey_code: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [pendingCategoryCount, setPendingCategoryCount] = useState<number>(0);
  const { phase } = usePhase();

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
    if (addId && supportingEvidenceIds.indexOf(addId) === -1) {
      setSupportingEvidenceIds((prev) => [...prev, addId]);
    }
  }, [addId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const supabase = getSupabaseClient();
        const { data, error: dbError } = await supabase
          .from("story_board_notes")
          .select("id, title, note, tags, linked_journey_ids, claim, supporting_evidence_ids, what_is_missing, framing_for_figma, extra_notes, created_at, created_session_id")
          .order("created_at", { ascending: false })
          .limit(20);
        if (dbError) throw dbError;
        if (!cancelled && data) {
          setNotes(data as StoryNote[]);
        }
      } catch {
        // Graceful fallback: no live notes until Supabase is wired.
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadPending() {
      try {
        const supabase = getSupabaseClient();
        const { count, error } = await supabase
          .from("category_suggestions")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");
        if (!cancelled && !error && count != null) setPendingCategoryCount(count);
      } catch {}
    }
    loadPending();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadJourneys() {
      try {
        const supabase = getSupabaseClient();
        const { data, error: dbError } = await supabase
          .from("journeys")
          .select("id, journey_code")
          .order("created_at", { ascending: false })
          .limit(100);
        if (dbError) throw dbError;
        if (!cancelled && data) setAvailableJourneys(data as { id: string; journey_code: string }[]);
      } catch {
        // ignore
      }
    }
    loadJourneys();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!claim.trim()) {
      setError("Claim is required.");
      return;
    }
    if (supportingEvidenceIds.length < 1) {
      setError("Select at least one supporting evidence journey.");
      return;
    }
    if (!whatIsMissing.trim()) {
      setError("What is missing? is required.");
      return;
    }
    if (!framingForFigma.trim()) {
      setError("How will we frame this in Figma? is required.");
      return;
    }
    try {
      setSaving(true);
      const supabase = getSupabaseClient();
      const tagArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const title = claim.slice(0, 80) + (claim.length > 80 ? "…" : "");
      const { data, error: dbError } = await supabase
        .from("story_board_notes")
        .insert({
          created_name: identity?.displayName ?? null,
          created_session_id: identity?.sessionId ?? null,
          title,
          note: extraNotes || claim,
          claim: claim.trim(),
          supporting_evidence_ids: supportingEvidenceIds,
          what_is_missing: whatIsMissing.trim(),
          framing_for_figma: framingForFigma.trim(),
          extra_notes: extraNotes.trim() || null,
          tags: tagArray,
          linked_journey_ids: supportingEvidenceIds,
        })
        .select("id, title, note, tags, linked_journey_ids, claim, supporting_evidence_ids, what_is_missing, framing_for_figma, extra_notes, created_at, created_session_id")
        .single();
      if (dbError) throw dbError;
      if (data) {
        setNotes((prev) => [data as StoryNote, ...prev]);
        setClaim("");
        setSupportingEvidenceIds([]);
        setWhatIsMissing("");
        setFramingForFigma("");
        setExtraNotes("");
        setTags("");
        setLinkedJourneyIds([]);
      }
    } catch (err: any) {
      setError(
        err?.message ??
          "Could not save to Supabase. Check your project keys and RLS policies.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <PhaseGuard allowedPhases={["2_story"]}>
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      {pendingCategoryCount > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          There are {pendingCategoryCount} pending category suggestion(s). Consider finalising governance before finalising storyboard.
        </div>
      )}
      <div className="rounded-xl border border-white/15 bg-white/[0.03] p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          Screen 07 · Story board
        </div>
        <h1 className="mt-2 text-xl font-semibold">Story / narrative board</h1>
        <p className="mt-1 text-sm text-white/70">
          The story team uses this space to write claims, link evidence
          journeys, and plan storyboard frames. Everyone else can read to see
          how evidence is being assembled.
        </p>
      </div>

      <section className="rounded-xl border border-white/15 bg-white/[0.02] p-5 space-y-4">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          Create story note
        </div>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] text-white/70">Section 1: Claim (required)</label>
            <input
              type="text"
              value={claim}
              onChange={(e) => setClaim(e.target.value)}
              placeholder="e.g., Step-free access gaps at UAL Camberwell Peckham Building entrance A"
              className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-white/70">Section 2: Supporting Evidence (required, min 1)</label>
            <select
              multiple
              value={supportingEvidenceIds}
              onChange={(e) => setSupportingEvidenceIds(Array.from(e.target.selectedOptions, (o) => o.value))}
              className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white min-h-[80px] focus:border-white/60 focus:outline-none"
            >
              {availableJourneys.map((j) => (
                <option key={j.id} value={j.id}>{j.journey_code}</option>
              ))}
            </select>
            <p className="text-[10px] text-white/50">Hold Ctrl/Cmd to select multiple.</p>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-white/70">Section 3: What is missing? (required)</label>
            <textarea value={whatIsMissing} onChange={(e) => setWhatIsMissing(e.target.value)} rows={3} placeholder="What information or evidence is missing?" className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-white/70">Section 4: How will we frame this in Figma? (required)</label>
            <textarea value={framingForFigma} onChange={(e) => setFramingForFigma(e.target.value)} rows={3} placeholder="How will this be presented in the storyboard?" className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-white/70">Tags (optional)</label>
            <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g., key-evidence" className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-white/70">Extra notes (optional)</label>
            <textarea value={extraNotes} onChange={(e) => setExtraNotes(e.target.value)} rows={2} placeholder="Additional context (markdown allowed)" className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none" />
          </div>
          {error && (
            <p className="rounded border border-red-500/60 bg-red-500/10 px-3 py-2 text-[11px] text-red-100">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-full border-2 border-white bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white/10 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save story note"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-white/15 bg-white/[0.02] p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
            Existing notes
          </div>
          <div className="text-[11px] text-white/50">
            {notes.length} notes
          </div>
        </div>
        {notes.length === 0 && (
          <p className="text-sm text-white/60">
            No story notes yet. Start by adding one using the prompts above,
            then link journeys from the live feed in a later iteration.
          </p>
        )}
        <div className="space-y-3">
          {notes.map((n) => {
            const canDelete = Boolean(identity?.sessionId && n.created_session_id === identity.sessionId);
            return (
            <article
              key={n.id}
              className="space-y-2 rounded-lg border border-white/12 bg-black/60 p-3 text-sm"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <h2 className="font-semibold text-white">{n.claim ?? n.title}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/50">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm("Delete this story note?")) return;
                        try {
                          const supabase = getSupabaseClient();
                          const { error: err } = await supabase.from("story_board_notes").delete().eq("id", n.id);
                          if (err) throw err;
                          setNotes((prev) => prev.filter((note) => note.id !== n.id));
                        } catch {
                          // ignore
                        }
                      }}
                      className="rounded-full border-2 border-white bg-black px-2 py-0.5 text-[10px] font-semibold text-red-200 hover:bg-white/10"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              {n.what_is_missing && (
                <p className="text-[12px] text-white/80"><strong>What is missing:</strong> {n.what_is_missing}</p>
              )}
              {n.framing_for_figma && (
                <p className="text-[12px] text-white/80"><strong>Framing for Figma:</strong> {n.framing_for_figma}</p>
              )}
              {(n.extra_notes || n.note) && (
              <pre className="whitespace-pre-wrap text-[12px] text-white/80">
                {n.extra_notes || n.note}
              </pre>
              )}
              {n.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 text-[10px]">
                  {n.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-white/30 px-2 py-[2px] text-white/80"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {(n.supporting_evidence_ids?.length ?? n.linked_journey_ids?.length) ? (
                <div className="flex flex-wrap gap-1 text-[10px] mt-1">
                  {(n.supporting_evidence_ids ?? n.linked_journey_ids ?? []).map((jid: string) => (
                    <Link
                      key={jid}
                      href={`/journeys/${jid}`}
                      className="rounded-full border border-white/25 px-2 py-[2px] text-white/70 hover:text-white hover:border-white/50"
                    >
                      {jid.slice(0, 8)}…
                    </Link>
                  ))}
                </div>
              ) : null}
            </article>
          );})}
        </div>
      </section>
    </div>
    </PhaseGuard>
  );
}

export default function StoryBoardPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-4xl p-6 text-center text-sm text-white/60">Loading…</div>}>
      <StoryBoardContent />
    </Suspense>
  );
}

