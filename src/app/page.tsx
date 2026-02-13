"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

type LoggedClaim = {
  id: string;
  source_url: string;
  source_label: string | null;
  user_focus: string | null;
  claim_text: string;
  created_name: string | null;
  created_session_id: string | null;
  created_at: string;
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

const USER_FOCUS_OPTIONS = [
  { value: "general", label: "General" },
  { value: "wheelchair", label: "Wheelchair users" },
  { value: "blind_vi", label: "Blind & visually impaired users" },
  { value: "both", label: "Both" },
];

function HomeContent() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [groupConfig, setGroupConfig] = useState<GroupConfig | null>(null);
  const [loggedClaims, setLoggedClaims] = useState<LoggedClaim[]>([]);
  const [claimSourceUrl, setClaimSourceUrl] = useState("");
  const [claimSourceLabel, setClaimSourceLabel] = useState("");
  const [claimUserFocus, setClaimUserFocus] = useState("general");
  const [claimText, setClaimText] = useState("");
  const [claimSaveMessage, setClaimSaveMessage] = useState<string | null>(null);
  const [claimSaveError, setClaimSaveError] = useState<string | null>(null);
  const [claimSaving, setClaimSaving] = useState(false);

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
  const searchParams = useSearchParams();
  const accessDeniedMessage = searchParams.get("accessDenied") === "1";
  const exportDeniedMessage = searchParams.get("exportDenied") === "1";
  const roleTitle = groupConfig?.role_title ?? null;

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (phase !== "0") return;
    let cancelled = false;
    async function load() {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase
          .from("claimed_access_statements")
          .select("id, source_url, source_label, user_focus, claim_text, created_name, created_session_id, created_at")
          .order("created_at", { ascending: false })
          .limit(50);
        if (!cancelled && data) setLoggedClaims(data as LoggedClaim[]);
      } catch {
        // ignore
      }
    }
    load();
    return () => { cancelled = true; };
  }, [phase, claimSaveMessage]);

  const handleSaveClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimSaveError(null);
    setClaimSaveMessage(null);
    const url = claimSourceUrl.trim();
    const text = claimText.trim();
    if (!url) {
      setClaimSaveError("Source URL is required.");
      return;
    }
    if (text.length < 15) {
      setClaimSaveError("Claim text must be at least 15 characters.");
      return;
    }
    setClaimSaving(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("claimed_access_statements")
        .insert({
          source_url: url,
          source_label: claimSourceLabel.trim() || null,
          user_focus: claimUserFocus || null,
          claim_text: text,
          created_name: identity?.displayName ?? null,
          created_group_id: identity?.groupId ?? null,
          created_session_id: identity?.sessionId ?? null,
        });
      if (error) throw error;
      setClaimSaveMessage("Claim saved.");
      setClaimSourceUrl("");
      setClaimSourceLabel("");
      setClaimUserFocus("general");
      setClaimText("");
    } catch (err: unknown) {
      setClaimSaveError(err instanceof Error ? err.message : "Could not save claim.");
    } finally {
      setClaimSaving(false);
    }
  };

  const handleDeleteClaim = async (id: string, sessionId: string | null) => {
    if (!identity?.sessionId || sessionId !== identity.sessionId) return;
    if (!confirm("Delete this logged claim?")) return;
    try {
      const supabase = getSupabaseClient();
      await supabase.from("claimed_access_statements").delete().eq("id", id);
      setLoggedClaims((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // ignore
    }
  };

  const phaseConfig: Record<
    WorkshopPhase,
    { title: string; instructions: string; primaryHref: string; primaryLabel: string }
  > = {
    "0": {
      title: "PHASE 0 — Claimed Access Scan",
      instructions: `Start from official guidance and collect URLs.
Use these starting points and add any other relevant pages you find as URLs you can cite.`,
      primaryHref: "/phase-0-links",
      primaryLabel: "Open link list",
    },
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
    "2": {
      title: "PHASE 2 — Categories & Storyboard",
      instructions: "",
      primaryHref: "/category",
      primaryLabel: "Review & Suggest Categories",
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
      primaryLabel: "Open OSM",
    },
  };

  const config = phaseConfig[phase] ?? phaseConfig["0"];
  const { title, instructions, primaryHref, primaryLabel } = config;
  const isPhase2 = phase === "2";

  const handleSwitchGroup = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("week6-identity");
    }
    window.location.href = "/start";
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      {exportDeniedMessage && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Export becomes available in later phases.
        </div>
      )}
      {accessDeniedMessage && !exportDeniedMessage && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          This module is not available for your group in the current phase.
        </div>
      )}
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
              {!isPhase2 && (
                <Link
                  href={primaryHref}
                  className="inline-flex items-center justify-center rounded-full border-2 border-white bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white/10"
                >
                  {primaryLabel}
                </Link>
              )}
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

      {isPhase2 ? (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-xl border border-white/12 bg-white/[0.02] p-4">
            <h2 className="text-sm font-semibold">Module A — Categories & Governance</h2>
            <RoleInstructionsTimebox
              text={`0–10 min:
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
• Reallocate affected entries if schema changes were approved.`}
            />
            <Link
              href="/category"
              className="self-start rounded-full border-2 border-white bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10"
            >
              Open Categories
            </Link>
          </div>
          <div className="flex flex-col gap-3 rounded-xl border border-white/12 bg-white/[0.02] p-4">
            <h2 className="text-sm font-semibold">Module B — Storyboard & Public Expression</h2>
            <RoleInstructionsTimebox
              text={`0–10 min:
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
  - Information failure?`}
            />
            <Link
              href="/story-board"
              className="self-start rounded-full border-2 border-white bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10"
            >
              Open Story Board
            </Link>
          </div>
        </section>
      ) : (
      <section className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-xl border border-white/12 bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold">Phase instructions</h2>
          {phase === "0" ? (
            <>
              <RoleInstructionsTimebox text={instructions} />
              <ul className="mt-2 space-y-1.5 text-sm text-white/90">
                <li>
                  <a href="https://www.arts.ac.uk/accessibility-statement" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-white no-underline hover:text-white/90">
                    UAL accessibility statement
                    <span className="text-white/70" aria-hidden>→</span>
                  </a>
                </li>
                <li>
                  <a href="https://www.arts.ac.uk/students/it-services" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-white no-underline hover:text-white/90">
                    IT Services
                    <span className="text-white/70" aria-hidden>→</span>
                  </a>
                </li>
                <li>
                  <a href="https://www.arts.ac.uk/students/student-services/disability-and-dyslexia" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-white no-underline hover:text-white/90">
                    Disability and Dyslexia support
                    <span className="text-white/70" aria-hidden>→</span>
                  </a>
                </li>
                <li>
                  <a href="https://www.arts.ac.uk/students/locations-and-opening-times/central-saint-martins/smartcards-and-building-access" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-white no-underline hover:text-white/90">
                    Smartcards and building access
                    <span className="text-white/70" aria-hidden>→</span>
                  </a>
                </li>
              </ul>

              <div className="mt-4 border-t border-white/15 pt-4">
                <h3 className="text-sm font-semibold text-white/95">Log a Claimed Access Statement</h3>
                <form onSubmit={handleSaveClaim} className="mt-2 space-y-2 text-sm">
                  <div>
                    <label className="block text-[11px] text-white/60">Source URL (required)</label>
                    <input
                      type="url"
                      value={claimSourceUrl}
                      onChange={(e) => setClaimSourceUrl(e.target.value)}
                      placeholder="https://…"
                      className="mt-0.5 w-full rounded-md border border-white/25 bg-black px-2 py-1.5 text-white placeholder:text-white/30 focus:border-white/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-white/60">Source label (optional)</label>
                    <input
                      type="text"
                      value={claimSourceLabel}
                      onChange={(e) => setClaimSourceLabel(e.target.value)}
                      placeholder="Short title"
                      className="mt-0.5 w-full rounded-md border border-white/25 bg-black px-2 py-1.5 text-white placeholder:text-white/30 focus:border-white/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-white/60">User focus</label>
                    <select
                      value={claimUserFocus}
                      onChange={(e) => setClaimUserFocus(e.target.value)}
                      className="mt-0.5 w-full rounded-md border border-white/25 bg-black px-2 py-1.5 text-white focus:border-white/50 focus:outline-none"
                    >
                      {USER_FOCUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-white/60">Claim text (required, min 15 characters)</label>
                    <textarea
                      value={claimText}
                      onChange={(e) => setClaimText(e.target.value)}
                      rows={2}
                      placeholder="What does the source claim about access?"
                      className="mt-0.5 w-full rounded-md border border-white/25 bg-black px-2 py-1.5 text-white placeholder:text-white/30 focus:border-white/50 focus:outline-none"
                    />
                  </div>
                  {claimSaveError && <p className="text-[11px] text-red-300">{claimSaveError}</p>}
                  {claimSaveMessage && <p className="text-[11px] text-emerald-300">{claimSaveMessage}</p>}
                  <button
                    type="submit"
                    disabled={claimSaving}
                    className="rounded-full border-2 border-white bg-black px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    {claimSaving ? "Saving…" : "Save Claim"}
                  </button>
                </form>

                {loggedClaims.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-white/95 mb-2">Logged Claims</h3>
                    <ul className="space-y-2">
                      {loggedClaims.map((c) => (
                        <li key={c.id} className="rounded-lg border border-white/15 bg-black/40 p-2.5 text-[12px]">
                          <div className="font-medium text-white/90">{c.source_label || c.source_url}</div>
                          {c.user_focus && <div className="text-[11px] text-white/60">User focus: {USER_FOCUS_OPTIONS.find((o) => o.value === c.user_focus)?.label ?? c.user_focus}</div>}
                          <p className="mt-1 text-white/85">{c.claim_text}</p>
                          {c.created_name && <p className="mt-1 text-[11px] text-white/50">Created by {c.created_name}</p>}
                          {identity?.sessionId && c.created_session_id === identity.sessionId && c.id && (
                            <button
                              type="button"
                              onClick={() => handleDeleteClaim(c.id, c.created_session_id)}
                              className="mt-1.5 rounded border border-white/30 px-1.5 py-0.5 text-[10px] text-red-200 hover:bg-red-500/20"
                            >
                              Delete
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          ) : (
            <RoleInstructionsTimebox text={instructions} />
          )}
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
      )}

      <div className="mt-2 rounded-lg border border-white/15 bg-white/[0.02] px-4 py-3 text-xs text-white/70">
        Privacy: no faces, no emails or student IDs, no confidential documents.
        Use evidence that can safely be shared in class.
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex flex-1 flex-col gap-6 p-6 text-center text-sm text-white/60">Loading…</div>}>
      <HomeContent />
    </Suspense>
  );
}

