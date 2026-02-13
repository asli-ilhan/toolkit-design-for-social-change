'use client';

import { useEffect, useState } from "react";
import { usePhase } from "@/lib/PhaseContext";
import { PhaseGroupGuard } from "@/components/PhaseGroupGuard";
import { getSupabaseClient } from "@/lib/supabaseClient";

type StoryNotePreview = {
  claim: string | null;
  evidenceCount: number;
  publicStrategy: string | null;
  journeyCount: number;
  singleLocation: number;
  recurringPattern: number;
  unclear: number;
};

type PublicSummary = {
  singleLocation: number;
  recurringPattern: number;
  linkedOsm: number;
};

const PUBLIC_STRATEGY_LABELS: Record<string, string> = {
  osm_single: "OSM single-location note",
  osm_recurring: "OSM recurring pattern note",
  wheelmap: "WheelMap classification",
  informational_only: "Informational annotation only",
  not_ready: "Not ready for public contribution",
};

export default function ExportPage() {
  const { phase } = usePhase();
  const [storyPackIds, setStoryPackIds] = useState("");
  const [storyPackNoteId, setStoryPackNoteId] = useState("");
  const [storyPreview, setStoryPreview] = useState<StoryNotePreview | null>(null);
  const [storyPreviewLoading, setStoryPreviewLoading] = useState(false);
  const [publicSummary, setPublicSummary] = useState<PublicSummary | null>(null);

  useEffect(() => {
    if (phase !== "3") return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseClient();
        const [singleRes, recurringRes, osmRes] = await Promise.all([
          supabase.from("journeys").select("id", { count: "exact", head: true }).eq("issue_scope", "single_location"),
          supabase.from("journeys").select("id", { count: "exact", head: true }).eq("issue_scope", "recurring_pattern"),
          supabase.from("journeys").select("id", { count: "exact", head: true }).not("osm_note_url", "is", null),
        ]);
        if (cancelled) return;
        setPublicSummary({
          singleLocation: singleRes.count ?? 0,
          recurringPattern: recurringRes.count ?? 0,
          linkedOsm: osmRes.count ?? 0,
        });
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [phase]);

  useEffect(() => {
    const noteId = storyPackNoteId.trim();
    if (!noteId || phase === "0" || phase === "1") {
      setStoryPreview(null);
      return;
    }
    let cancelled = false;
    setStoryPreviewLoading(true);
    (async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: note, error: noteErr } = await supabase
          .from("story_board_notes")
          .select("claim, public_strategy, supporting_evidence_ids, linked_journey_ids")
          .eq("id", noteId)
          .single();
        if (noteErr || !note) {
          if (!cancelled) setStoryPreview(null);
          return;
        }
        const journeyIds = (note.supporting_evidence_ids ?? note.linked_journey_ids ?? []) as string[];
        const evidenceCount = journeyIds.length;
        let singleLocation = 0;
        let recurringPattern = 0;
        let unclear = 0;
        if (journeyIds.length > 0) {
          const { data: journeys } = await supabase
            .from("journeys")
            .select("issue_scope")
            .in("id", journeyIds);
          if (!cancelled && journeys) {
            for (const j of journeys as { issue_scope?: string }[]) {
              if (j.issue_scope === "single_location") singleLocation++;
              else if (j.issue_scope === "recurring_pattern") recurringPattern++;
              else unclear++;
            }
          }
        }
        if (!cancelled) {
          setStoryPreview({
            claim: (note as any).claim ?? null,
            evidenceCount,
            publicStrategy: (note as any).public_strategy ?? null,
            journeyCount: journeyIds.length,
            singleLocation,
            recurringPattern,
            unclear,
          });
        }
      } catch {
        if (!cancelled) setStoryPreview(null);
      } finally {
        if (!cancelled) setStoryPreviewLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [storyPackNoteId, phase]);

  const storyPackUrl = (() => {
    if (storyPackNoteId.trim()) {
      return `/api/export/story-pack?note=${encodeURIComponent(storyPackNoteId.trim())}`;
    }
    if (storyPackIds.trim()) {
      const ids = storyPackIds.split(/[\s,]+/).filter(Boolean).join(",");
      return ids ? `/api/export/story-pack?ids=${encodeURIComponent(ids)}` : null;
    }
    return null;
  })();

  return (
    <PhaseGroupGuard route="export">
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="rounded-xl border border-white/15 bg-white/[0.03] p-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50 mb-3">
          Before exporting
        </div>
        <p className="text-sm text-white/85 mb-2">
          Exports represent different stages of the access intervention pipeline:
        </p>
        <ul className="list-disc list-inside text-sm text-white/75 space-y-1">
          <li>Raw documentation (Journeys, Steps, Evidence CSV)</li>
          <li>Narrative assembly (Story Pack JSON)</li>
          <li>Public intervention (OSM / WheelMap links)</li>
        </ul>
        <p className="mt-3 text-[11px] text-white/60">
          Export is not the end. It is a handover between phases.
        </p>
      </div>

      <div className="rounded-xl border border-white/15 bg-white/[0.03] p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          Screen 08 · Export
        </div>
        <h1 className="mt-2 text-xl font-semibold">
          Export Week 6 dataset
        </h1>
        <p className="mt-1 text-sm text-white/70">
          Download CSVs for journeys, steps, and evidence so you can work
          offline or bring data into other tools. In class, exports are usually
          handled by tutors or story leads.
        </p>
      </div>

      <section className="space-y-3 rounded-xl border border-white/15 bg-white/[0.02] p-5 text-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          Story pack (JSON)
        </div>
        <p className="text-[11px] text-white/65">
          Export a set of journeys with their steps and evidence as one JSON
          file for the Story Board team (e.g. for Figma or presentation).
        </p>
        <div className="space-y-2">
          <div>
            <label className="text-[11px] text-white/70">
              Journey IDs (comma- or space-separated)
            </label>
            <input
              type="text"
              value={storyPackIds}
              onChange={(e) => setStoryPackIds(e.target.value)}
              placeholder="e.g. uuid1, uuid2"
              className="mt-1 w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] text-white/70">
              Or story note ID (uses linked journeys from that note)
            </label>
            <input
              type="text"
              value={storyPackNoteId}
              onChange={(e) => setStoryPackNoteId(e.target.value)}
              placeholder="e.g. story note uuid"
              className="mt-1 w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
            />
          </div>

          {storyPreviewLoading && (
            <p className="text-[11px] text-white/50">Loading preview…</p>
          )}
          {!storyPreviewLoading && storyPreview && storyPackNoteId.trim() && (
            <div className="rounded-lg border border-white/20 bg-black/40 p-3 text-[12px] space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">Story pack preview</div>
              <p className="text-white/90"><strong>Claim:</strong> {storyPreview.claim || "—"}</p>
              <p className="text-white/80"><strong>Evidence count:</strong> {storyPreview.evidenceCount}</p>
              <p className="text-white/80"><strong>Public strategy:</strong> {storyPreview.publicStrategy ? (PUBLIC_STRATEGY_LABELS[storyPreview.publicStrategy] ?? storyPreview.publicStrategy) : "—"}</p>
              <p className="text-white/80"><strong>Number of journeys:</strong> {storyPreview.journeyCount}</p>
              <p className="text-white/70"><strong>Issue scope:</strong> single_location {storyPreview.singleLocation}, recurring_pattern {storyPreview.recurringPattern}, unclear {storyPreview.unclear}</p>
            </div>
          )}

          {storyPackUrl && (
            <a
              href={storyPackUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-full border-2 border-white bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10"
            >
              Download story pack JSON
            </a>
          )}
        </div>
      </section>

      {phase === "3" && publicSummary !== null && (
        <section className="rounded-xl border border-white/15 bg-white/[0.02] p-5 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
            Public Intervention Summary
          </div>
          <ul className="text-sm text-white/80 space-y-1">
            <li>Journeys marked single_location: <strong>{publicSummary.singleLocation}</strong></li>
            <li>Journeys marked recurring_pattern: <strong>{publicSummary.recurringPattern}</strong></li>
            <li>Journeys linked to OSM: <strong>{publicSummary.linkedOsm}</strong></li>
            <li>WheelMap: contributions made via the WheelMap tool</li>
          </ul>
        </section>
      )}

      {phase === "3" && (
        <section className="space-y-3 rounded-xl border border-white/15 bg-white/[0.02] p-5 text-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
            CSV exports
          </div>
          <p className="text-[11px] text-white/65">
            These endpoints assume Supabase is configured and that the requester
            is allowed to read the relevant tables via Row Level Security.
          </p>

          <div className="space-y-2 text-sm">
            <a
              href="/api/export/journeys"
              className="block rounded-lg border-2 border-white bg-black px-3 py-2 text-sm text-white hover:bg-white/10"
            >
              <div className="font-semibold text-white">
                Export Journeys CSV
              </div>
              <div className="text-[11px] text-white/65">
                One row per journey, with outcome, classification, interpretation,
                claimed_access_statement, claimed_statement_id, issue_scope, and action fields.
              </div>
            </a>

            <a
              href="/api/export/steps"
              className="block rounded-lg border-2 border-white bg-black px-3 py-2 text-sm text-white hover:bg-white/10"
            >
              <div className="font-semibold text-white">Export Steps CSV</div>
              <div className="text-[11px] text-white/65">
                One row per step, joined to journeys by journey_id and step_index.
              </div>
            </a>

            <a
              href="/api/export/evidence"
              className="block rounded-lg border-2 border-white bg-black px-3 py-2 text-sm text-white hover:bg-white/10"
            >
              <div className="font-semibold text-white">
                Export Evidence CSV
              </div>
              <div className="text-[11px] text-white/65">
                One row per evidence item, including storage paths or external
                URLs and captions.
              </div>
            </a>
          </div>
        </section>
      )}

      {phase === "2" && (
        <p className="text-[11px] text-white/50 rounded-xl border border-white/15 bg-white/[0.02] px-4 py-2">
          Full CSV exports become available in Phase 3. In Phase 2 you can export Story Pack JSON only.
        </p>
      )}
    </div>
    </PhaseGroupGuard>
  );
}
