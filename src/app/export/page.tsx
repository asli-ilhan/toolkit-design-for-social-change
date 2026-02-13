'use client';

import { useState } from "react";

export default function ExportPage() {
  const [storyPackIds, setStoryPackIds] = useState("");
  const [storyPackNoteId, setStoryPackNoteId] = useState("");

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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
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
              One row per journey, with outcome, classification, interpretation
              and action fields.
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
    </div>
  );
}

