"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { usePhase, type WorkshopPhase } from "@/lib/PhaseContext";

type Identity = {
  displayName: string;
  groupId: string;
  groupName: string;
  sessionId: string;
};

type GroupConfig = {
  id: string;
  name: string;
  role_key: string | null;
  role_title: string | null;
  role_instructions: string | null;
};

/** Parse role_instructions into time blocks (e.g. "0–10 min:") and bullet items. */
function RoleInstructionsTimebox({ text }: { text: string }) {
  const blocks: { title: string; items: string[] }[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let current: { title: string; items: string[] } | null = null;
  for (const line of lines) {
    const timeMatch = line.match(/^(\d+[–\-]\d+\s*min:?)\s*(.*)$/i) ?? line.match(/^(By end:?)\s*(.*)$/i);
    if (timeMatch) {
      const title = (timeMatch[1] + " " + (timeMatch[2] ?? "").trim()).trim();
      current = { title, items: [] };
      blocks.push(current);
    } else if (current && (line.startsWith("-") || line.startsWith("•"))) {
      current.items.push(line.replace(/^[-•]\s*/, "").trim());
    } else if (current && line.length > 0) {
      current.items.push(line);
    }
  }
  if (blocks.length === 0) {
    return (
      <div className="whitespace-pre-wrap text-sm text-white/70">{text}</div>
    );
  }
  return (
    <div className="space-y-4 text-sm">
      {blocks.map((block, i) => (
        <div key={i} className="space-y-1.5">
          <p className="font-bold text-white/95">{block.title}</p>
          <ul className="list-inside list-disc space-y-0.5 text-white/70">
            {block.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [groupConfig, setGroupConfig] = useState<GroupConfig | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("week6-identity");
    if (!raw) return;
    try {
      const parsed: Identity = JSON.parse(raw);
      setIdentity(parsed);
    } catch {
      // ignore invalid identity
    }
  }, []);

  useEffect(() => {
    if (!identity) return;
    const groupId = identity.groupId;
    let cancelled = false;
    async function loadGroup() {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("groups")
          .select("id, name, role_key, role_title, role_instructions")
          .eq("id", groupId)
          .maybeSingle();
        if (!cancelled && !error && data) {
          setGroupConfig(data as GroupConfig);
        }
      } catch {
        // ignore; fall back to identity groupName only
      }
    }
    loadGroup();
    return () => {
      cancelled = true;
    };
  }, [identity]);

  const { phase, refetch } = usePhase();
  const roleTitle = groupConfig?.role_title ?? null;

  useEffect(() => {
    refetch();
  }, [refetch]);

  const phaseConfig: Record<
    WorkshopPhase,
    { title: string; instructions: string; primaryHref: string; primaryLabel: string }
  > = {
    "1": {
      title: "PHASE 1 — Evidence Collection",
      instructions: `PHASE 1 — Evidence Collection (Everyone)

0–5 min:
• Choose one physical zone AND one digital system.
• Define your journey goal clearly.

5–20 min:
• Log one complete physical journey.
• Minimum 2 steps.
• Add at least one photo AND one guidance URL.

20–35 min:
• Log one complete digital journey.
• Include screenshots.
• Ensure "what happened" is factual, not interpretation.

Before Phase 2:
• Review your entries in the feed.
• Improve vague steps.
• Confirm guidance URLs are present.`,
      primaryHref: "/wizard",
      primaryLabel: "Start New Entry",
    },
    "2_categories": {
      title: "PHASE 2 — Categories & Governance",
      instructions: `PHASE 2 — Categories & Governance

0–10 min:
• Scan the feed.
• Identify repeated barrier patterns.
• Identify frequent use of "Other" values.

10–20 min:
• Submit 5–10 category suggestions.
• Include: field_name, suggested_value, rationale.

20–30 min:
• Identify 2 schema weaknesses.
  (e.g. ambiguous field, missing enum option)

30–40 min:
• Propose 1 governance rule that improves data quality.

Before Phase 3:
• Review lecturer-approved suggestions.
• Reallocate affected entries if schema changes were approved.`,
      primaryHref: "/category",
      primaryLabel: "Review & Suggest Categories",
    },
    "2_story": {
      title: "PHASE 2 — Storyboard & Public Expression",
      instructions: `PHASE 2 — Storyboard & Public Expression

0–10 min:
• Identify one clear theme emerging from the feed.

10–20 min:
• Select 3–6 strong journeys as supporting evidence.
• Avoid incomplete or vague entries.

20–30 min:
• Complete structured story note:
  - Claim
  - Supporting evidence
  - What is missing
  - Framing for Figma

30–40 min:
• Decide how this will be expressed publicly:
  - Single-location issue?
  - Recurring pattern?
  - Information failure?`,
      primaryHref: "/story-board",
      primaryLabel: "Open Story Board",
    },
    "3": {
      title: "PHASE 3 — Public Contribution",
      instructions: `PHASE 3 — Public Contribution (All Groups)

1. Select approved journeys.
2. Confirm no personal data.
3. Generate OpenStreetMap note text.

Ask:
• Is this a single location issue?
• Is this a recurring pattern?
• Does this reflect missing information?

Then:
• Submit OSM Note.
• Paste OSM URL back into the journey.`,
      primaryHref: "/osm-helper",
      primaryLabel: "Open OSM Helper",
    },
  };

  const config = phaseConfig[phase] ?? phaseConfig["1"];
  const { title, instructions, primaryHref, primaryLabel } = config;

  const handleSwitchGroup = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("week6-identity");
    }
    window.location.href = "/start";
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-xl border border-white/15 bg-white/[0.03] p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          Home · Week 6
        </div>
        <h1 className="text-xl font-semibold">
          {title}
        </h1>
        {!identity ? (
          <p className="max-w-xl text-sm text-white/70">
            Start by entering your name and group. This is used for attribution
            in the shared dataset.{" "}
            <Link
              href="/start"
              className="inline-flex rounded-full border-2 border-white bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10"
            >
              Go to Start
            </Link>
            .
          </p>
        ) : (
          <>
            <div className="max-w-xl space-y-0.5 text-sm">
              <p className="text-white/90">
                <span className="font-semibold text-white">{identity.displayName}</span>
                {" · "}
                <span className="font-semibold text-white">{identity.groupName}</span>
                {roleTitle && (
                  <> — <span className="text-white/90">{roleTitle}</span></>
                )}
              </p>
              {identity.sessionId && (
                <p className="text-[11px] text-white/50">
                  Session: {identity.sessionId.slice(0, 8)}…
                </p>
              )}
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <Link
                href={primaryHref}
                className="inline-flex items-center justify-center rounded-full border-2 border-white bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white/10"
              >
                {primaryLabel}
              </Link>
              <Link
                href="/feed"
                className="inline-flex items-center justify-center rounded-full border-2 border-white bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10"
              >
                Explore live feed
              </Link>
              <Link
                href="/export"
                className="inline-flex items-center justify-center rounded-full border-2 border-white bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10"
              >
                Export
              </Link>
            </div>
            <button
              type="button"
              onClick={handleSwitchGroup}
              className="mt-2 self-start rounded-full border-2 border-white bg-black px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10"
            >
              Switch group
            </button>
          </>
        )}
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-xl border border-white/12 bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold">Phase instructions</h2>
          <RoleInstructionsTimebox text={instructions} />
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-xl border border-white/12 bg-white/[0.02] p-4">
          <div className="space-y-2 text-sm text-white/75">
            <h2 className="text-sm font-semibold text-white">
              Example entry · Physical access
            </h2>
            <p className="text-xs uppercase tracking-[0.18em] text-white/50">
              Journey code: UAL-W6-G3-001
            </p>
            <p>
              Lift out of service at UAL Camberwell Peckham Building; no clearly signposted step-free
              alternative route or live lift status information.
            </p>
          </div>
          <Link
            href="/examples/ual-w6-g3-001"
            className="self-start rounded-full border-2 border-white bg-black px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10"
          >
            View full example entry
          </Link>
        </div>
      </section>

      <div className="mt-2 rounded-lg border border-white/15 bg-white/[0.02] px-4 py-3 text-xs text-white/70">
        Privacy: no faces, no emails or student IDs, no confidential documents.
        Use evidence that can safely be shared in class.
      </div>
    </div>
  );
}

