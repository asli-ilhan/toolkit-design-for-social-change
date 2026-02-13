'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { usePhase } from "@/lib/PhaseContext";

type Journey = {
  id: string;
  journey_code: string;
  mode: string;
  campus_or_system: string;
  location_text: string | null;
  url: string | null;
  user_focus: string;
  journey_goal: string;
  claimed_access_statement: string | null;
  claimed_statement_id: string | null;
  what_happened: string;
  expected_outcome: string;
  barrier_type: string;
  where_happened: string;
  access_result: string;
  missing_or_unclear: string;
  suggested_improvement: string;
  status: string;
  issue_scope: string | null;
  osm_note_url: string | null;
  created_at: string;
  created_session_id: string | null;
};

type Step = {
  id: string;
  step_index: number;
  go_to: string;
  attempt_to: string;
  observe: string;
};

type Evidence = {
  id: string;
  type: string;
  external_url: string | null;
  storage_path: string | null;
  caption: string;
};

type Tab = "summary" | "steps" | "evidence" | "osm";

export default function JourneyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [tab, setTab] = useState<Tab>("summary");
  const [journey, setJourney] = useState<Journey | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [playingTimeline, setPlayingTimeline] = useState(false);
  const [localSessionId, setLocalSessionId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [evidenceUrls, setEvidenceUrls] = useState<Record<string, string>>({});
  const [savingScope, setSavingScope] = useState(false);
  const [linkedClaim, setLinkedClaim] = useState<{ source_url: string; source_label: string | null; user_focus: string; claim_text: string } | null>(null);
  const { phase } = usePhase();

  const isExample = id === "example-1";
  const canEdit = Boolean(journey?.created_session_id && localSessionId && journey.created_session_id === localSessionId);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("week6-session-id");
    if (raw) setLocalSessionId(raw);
  }, []);

  useEffect(() => {
    if (!id || isExample) {
      if (isExample) {
        setJourney({
          id: "example-1",
          journey_code: "UAL-W6-G3-001",
          mode: "physical",
          campus_or_system: "UAL Camberwell Peckham Building",
          location_text: "UAL Camberwell Peckham Building, lift bank near main reception",
          url: null,
          user_focus: "wheelchair",
          journey_goal: "Reach a studio on the 2nd floor.",
          claimed_access_statement: "This building is fully accessible with step-free routes and lift access.",
          claimed_statement_id: "example-claim",
          what_happened:
            "Lift was out of service and the step-free alternative route was not clearly signposted.",
          expected_outcome:
            "A clearly signposted step-free route with live lift status information.",
          barrier_type: "mixed",
          where_happened: "navigation",
          access_result: "blocked",
          missing_or_unclear:
            "No public info for lift outages or where to check accessibility disruptions.",
          suggested_improvement:
            "Publish lift outage status on a single page + QR code at lift; add consistent signage to step-free routes.",
          status: "observed",
          issue_scope: "recurring_pattern",
          osm_note_url: null,
          created_at: new Date().toISOString(),
          created_session_id: null,
        });
        setLinkedClaim({
          source_url: "https://www.arts.ac.uk/accessibility-statement",
          source_label: null,
          user_focus: "wheelchair",
          claim_text: "This building is fully accessible with step-free routes and lift access.",
        });
        setSteps([
          {
            id: "s1",
            step_index: 1,
            go_to: "Main entrance (Entrance A)",
            attempt_to: "Use step-free route to enter",
            observe: "Ramp route not signposted.",
          },
          {
            id: "s2",
            step_index: 2,
            go_to: "Lift bank near reception",
            attempt_to: "Use lift to access 2nd floor",
            observe: "Lift out of service; no alternative route info.",
          },
          {
            id: "s3",
            step_index: 3,
            go_to: "Stairwell signage area",
            attempt_to: "Find alternate step-free path",
            observe: "No QR/help point; staff directions inconsistent.",
          },
        ]);
        setEvidence([
          { id: "e1", type: "photo", external_url: null, storage_path: null, caption: "Photo of lift notice (no faces)." },
          { id: "e2", type: "policy_doc", external_url: null, storage_path: null, caption: "Link to accessibility statement / campus access page." },
        ]);
      }
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const supabase = getSupabaseClient();
        const { data: jData, error: jErr } = await supabase
          .from("journeys")
          .select("*")
          .eq("id", id)
          .single();

        if (jErr) throw jErr;
        if (!cancelled && jData) setJourney(jData as Journey);

        const claimId = (jData as any)?.claimed_statement_id;
        if (claimId) {
          const { data: claimData } = await supabase
            .from("claimed_access_statements")
            .select("source_url, source_label, user_focus, claim_text")
            .eq("id", claimId)
            .single();
          if (!cancelled && claimData) setLinkedClaim(claimData as { source_url: string; source_label: string | null; user_focus: string; claim_text: string });
        } else if (!cancelled) setLinkedClaim(null);

        const { data: sData } = await supabase
          .from("journey_steps")
          .select("id, step_index, go_to, attempt_to, observe")
          .eq("journey_id", id)
          .order("step_index");
        if (!cancelled && sData) setSteps(sData as Step[]);

        const { data: eData } = await supabase
          .from("evidence")
          .select("id, type, external_url, storage_path, caption")
          .eq("journey_id", id);
        if (!cancelled && eData) setEvidence(eData as Evidence[]);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? "Could not load journey.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, isExample]);

  useEffect(() => {
    if (!evidence.length || isExample) return;
    let cancelled = false;
    const supabase = getSupabaseClient();
    (async () => {
      const next: Record<string, string> = {};
      for (const e of evidence) {
        if (e.storage_path && e.type === "photo") {
          try {
            const { data } = await supabase.storage.from("wizard").createSignedUrl(e.storage_path, 3600);
            if (!cancelled && data?.signedUrl) next[e.id] = data.signedUrl;
          } catch {
            // ignore
          }
        }
      }
      if (!cancelled) setEvidenceUrls((prev) => ({ ...prev, ...next }));
    })();
    return () => {
      cancelled = true;
    };
  }, [evidence, isExample]);

  const handleDelete = async () => {
    if (!canEdit || !id || isExample) return;
    if (!confirm("Delete this journey? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const supabase = getSupabaseClient();
      await supabase.from("journey_steps").delete().eq("journey_id", id);
      await supabase.from("evidence").delete().eq("journey_id", id);
      const { error } = await supabase.from("journeys").delete().eq("id", id);
      if (error) throw error;
      router.push("/feed");
    } catch (err: any) {
      setError(err?.message ?? "Could not delete.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading && !journey) {
    return (
      <div className="mx-auto max-w-3xl py-8 text-center text-sm text-white/60">
        Loading…
      </div>
    );
  }

  if (error && !journey) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="rounded border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
        <Link href="/feed" className="inline-flex rounded-full border-2 border-white bg-black px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/10">
          Back to feed
        </Link>
      </div>
    );
  }

  if (!journey) return null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "summary", label: "Summary" },
    { key: "steps", label: "Steps" },
    { key: "evidence", label: "Evidence" },
    { key: "osm", label: "OSM" },
  ];

  const osmNoteBody = [
    `Location: ${journey.location_text || journey.campus_or_system}`,
    `Issue: ${journey.what_happened}`,
    `Expected: ${journey.expected_outcome}`,
    `Logged by: Week 6 Access Journey`,
  ].join("\n\n");

  // Simple auto-advance timeline playback
  useEffect(() => {
    if (!playingTimeline || activeStepIndex == null) return;
    if (activeStepIndex >= steps.length - 1) {
      setPlayingTimeline(false);
      return;
    }
    const timer = setTimeout(
      () => setActiveStepIndex((prev) => (prev == null ? 0 : prev + 1)),
      2000,
    );
    return () => clearTimeout(timer);
  }, [playingTimeline, activeStepIndex, steps.length]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/feed" className="inline-flex rounded-full border-2 border-white bg-black px-3 py-1 text-[11px] font-semibold text-white hover:bg-white/10">
            ← Back to feed
          </Link>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <h1 className="font-mono text-lg font-semibold">
              {journey.journey_code}
            </h1>
            {canEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-full border-2 border-white bg-black px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-200 hover:bg-white/10 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-[10px]">
            <span className="rounded-full border border-white/30 px-2 py-[2px] uppercase tracking-[0.18em] text-white/70">
              {journey.mode === "physical" ? "Physical" : "Digital"}
            </span>
            <span className="rounded-full border border-white/20 px-2 py-[2px] text-white/70">
              {journey.campus_or_system}
            </span>
            <span className="rounded-full border border-white/20 px-2 py-[2px] text-white/70">
              {journey.barrier_type} · {journey.access_result}
            </span>
            {journey.issue_scope && (
              <span className="rounded-full border border-amber-400/50 px-2 py-[2px] text-amber-200">
                {journey.issue_scope === "single_location"
                  ? "Single Location"
                  : journey.issue_scope === "recurring_pattern"
                  ? "Recurring Pattern"
                  : "Unclear"}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/story-board?add=${journey.id}`}
            className="rounded-full border-2 border-white bg-black px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10"
          >
            Add to Story Board
          </Link>
          <Link
            href={`/osm-helper?journey=${journey.id}`}
            className="rounded-full border-2 border-white bg-black px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10"
          >
            Create OSM Note
          </Link>
          <Link
            href={`/category?flag=${journey.id}`}
            className="rounded-full border-2 border-white bg-black px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10"
          >
            Flag for governance
          </Link>
        </div>
      </div>

      <div className="flex gap-1 rounded-lg border border-white/15 bg-white/[0.02] p-1 text-[11px]">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 rounded-md border-2 px-3 py-2 font-semibold uppercase tracking-[0.18em] ${
              tab === key
                ? "border-white bg-white text-black"
                : "border-white bg-black text-white hover:bg-white/10"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "summary" && (
        <section className="space-y-4 rounded-xl border border-white/15 bg-white/[0.02] p-5 text-sm">
          <div className="space-y-4 rounded-lg border border-white/20 bg-black/40 p-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
                Claimed Access
              </div>
              {linkedClaim ? (
                <div className="mt-1 space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-white/50">Source URL</p>
                  <a href={linkedClaim.source_url} target="_blank" rel="noopener noreferrer" className="block truncate text-white/80 underline hover:text-white">
                    {linkedClaim.source_label || linkedClaim.source_url}
                  </a>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-white/50">User focus</p>
                  <p className="text-white/80">
                    {linkedClaim.user_focus === "general" ? "General" : linkedClaim.user_focus === "wheelchair" ? "Wheelchair users" : linkedClaim.user_focus === "blind_vi" ? "Blind & visually impaired users" : linkedClaim.user_focus === "both" ? "Both" : linkedClaim.user_focus}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-white/50">Original logged claim</p>
                  <p className="rounded border border-white/15 bg-black/30 px-2 py-1.5 text-white/90">{linkedClaim.claim_text}</p>
                  {journey.claimed_access_statement && journey.claimed_access_statement.trim() !== linkedClaim.claim_text.trim() && (
                    <>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-white/50">Edited claim (in this journey)</p>
                      <p className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-white/90">{journey.claimed_access_statement}</p>
                    </>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-white/90">
                  {journey.claimed_access_statement || "—"}
                </p>
              )}
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
                Experienced Access
              </div>
              <p className="mt-1 text-white/90">{journey.what_happened}</p>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
                Expected Access
              </div>
              <p className="mt-1 text-white/90">{journey.expected_outcome || "—"}</p>
            </div>
          </div>

          {phase === "3" && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">
                Issue scope (for public contribution)
              </div>
              {journey.issue_scope ? (
                <p className="mt-1 text-white/90">
                  {journey.issue_scope === "single_location"
                    ? "Single Location"
                    : journey.issue_scope === "recurring_pattern"
                    ? "Recurring Pattern"
                    : "Unclear"}
                </p>
              ) : canEdit ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {(
                    [
                      ["single_location", "Single Location"],
                      ["recurring_pattern", "Recurring Pattern"],
                      ["unclear", "Unclear"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      disabled={savingScope}
                      onClick={async () => {
                        setSavingScope(true);
                        try {
                          const supabase = getSupabaseClient();
                          const { error } = await supabase
                            .from("journeys")
                            .update({ issue_scope: value })
                            .eq("id", journey.id);
                          if (error) throw error;
                          setJourney((j) => (j ? { ...j, issue_scope: value } : j));
                        } catch {
                          // ignore
                        } finally {
                          setSavingScope(false);
                        }
                      }}
                      className="rounded-full border-2 border-white bg-black px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-white/10 disabled:opacity-50"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-white/50">Not set</p>
              )}
            </div>
          )}

          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">
              Journey goal
            </div>
            <p className="mt-1 text-white/90">{journey.journey_goal}</p>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">
              Missing / unclear (interpretation)
            </div>
            <p className="mt-1 text-white/90">{journey.missing_or_unclear}</p>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">
              Suggested improvement (action)
            </div>
            <p className="mt-1 text-white/90">{journey.suggested_improvement}</p>
          </div>
        </section>
      )}

      {tab === "steps" && (
        <section className="space-y-3 rounded-xl border border-white/15 bg-white/[0.02] p-5">
          {steps.length === 0 ? (
            <p className="text-sm text-white/60">No steps recorded.</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <div className="text-white/70">
                  Timeline playback:{" "}
                  {activeStepIndex != null
                    ? `Step ${activeStepIndex + 1} of ${steps.length}`
                    : "Select a step or press Play"}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={steps.length === 0}
                    onClick={() => setActiveStepIndex(0)}
                    className="rounded-full border-2 border-white bg-black px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10 disabled:opacity-40"
                  >
                    Start
                  </button>
                  <button
                    type="button"
                    disabled={steps.length === 0}
                    onClick={() => {
                      if (activeStepIndex == null) {
                        setActiveStepIndex(0);
                        setPlayingTimeline(true);
                        return;
                      }
                      setPlayingTimeline((prev) => !prev);
                    }}
                    className="rounded-full border-2 border-white bg-black px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10 disabled:opacity-40"
                  >
                    {playingTimeline ? "Pause" : "Play"}
                  </button>
                </div>
              </div>
              {playingTimeline && activeStepIndex != null && (
                <div className="text-[11px] text-white/60">
                  Step will auto-advance every 2 seconds.
                </div>
              )}
              <ol className="mt-3 space-y-3 text-sm">
                {steps.map((s, idx) => (
                  <li
                    key={s.id}
                    onClick={() => setActiveStepIndex(idx)}
                    className={`cursor-pointer rounded-lg border px-3 py-2 ${
                      idx === activeStepIndex
                        ? "border-white bg-white/10"
                        : "border-white/15 bg-black/40 hover:border-white/40"
                    }`}
                  >
                    <div className="mb-1 text-[11px] font-semibold text-white/75">
                      Step {s.step_index}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-white/50">
                        Go to:{" "}
                      </span>
                      {s.go_to}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-white/50">
                        Attempt to:{" "}
                      </span>
                      {s.attempt_to}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-white/50">
                        Observe:{" "}
                      </span>
                      {s.observe}
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      )}

      {tab === "evidence" && (
        <section className="space-y-3 rounded-xl border border-white/15 bg-white/[0.02] p-5">
          {evidence.length === 0 ? (
            <p className="text-sm text-white/60">No evidence items.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {evidence.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-col gap-1 rounded-lg border border-white/12 bg-black/40 p-3"
                >
                  <span className="text-[10px] uppercase tracking-[0.18em] text-white/50">
                    {e.type}
                  </span>
                  {e.type === "photo" && evidenceUrls[e.id] && (
                    <img
                      src={evidenceUrls[e.id]}
                      alt={e.caption}
                      className="max-h-48 w-auto max-w-full rounded border border-white/20 object-contain"
                    />
                  )}
                  <p className="text-white/90">{e.caption}</p>
                  {e.external_url && (
                    <a
                      href={e.external_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 truncate text-[11px] text-white/70 underline hover:text-white"
                    >
                      {e.external_url}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "osm" && (
        <section className="space-y-4 rounded-xl border border-white/15 bg-white/[0.02] p-5 text-sm">
          <p className="text-white/80">
            Use OpenStreetMap Notes to report this issue without editing the map.
            Copy the text below and paste it when creating an OSM Note.
          </p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-white/20 bg-black/70 p-3 text-[12px] text-white/85">
            {osmNoteBody}
          </pre>
          {journey.osm_note_url ? (
            <div>
              <span className="text-[10px] uppercase text-white/50">OSM note URL: </span>
              <a
                href={journey.osm_note_url}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-white/80 underline"
              >
                {journey.osm_note_url}
              </a>
            </div>
          ) : (
            <Link
              href="/osm-helper"
              className="inline-flex rounded-full border-2 border-white bg-black px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10"
            >
              Open OSM Helper
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
