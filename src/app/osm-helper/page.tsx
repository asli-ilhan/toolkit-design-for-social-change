'use client';

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { PhaseGuard } from "@/components/PhaseGuard";
import { usePhase } from "@/lib/PhaseContext";
import Link from "next/link";

const EXAMPLE_NOTE = {
  location_text: "UAL Camberwell Peckham Building, lift bank near main reception (Entrance A)",
  campus_or_system: "UAL Camberwell Peckham Building",
  what_happened:
    "Lift was out of service and the step-free alternative route was not clearly signposted.",
  expected_outcome:
    "A clearly signposted step-free route with live lift status information.",
  journey_code: "UAL-W6-G3-001",
};

/** Build OSM note text: no display name, no session ID; generic attribution only. */
function buildNoteText(j: {
  location_text: string | null;
  campus_or_system: string;
  what_happened: string;
  expected_outcome: string;
}) {
  const location = j.location_text || j.campus_or_system;
  return `Access issue observed

Location: ${location}

Issue: ${j.what_happened}

Expected: ${j.expected_outcome}

Attribution: Week 6 Access Journey (MA IE)`;
}

type JourneyMeta = {
  mode: string;
  user_focus: string | null;
  claimed_access_statement: string | null;
  issue_scope: string | null;
  evidenceCount: number;
  guidanceCount: number;
};

function OSMHelperContent() {
  const searchParams = useSearchParams();
  const journeyId = searchParams.get("journey");
  const { phase } = usePhase();
  const defaultNoteText = useMemo(() => buildNoteText(EXAMPLE_NOTE), []);
  const [noteText, setNoteText] = useState(defaultNoteText);
  const [loading, setLoading] = useState(!!journeyId);
  const [osmUrl, setOsmUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [noPersonalDataConfirmed, setNoPersonalDataConfirmed] = useState(false);
  const [journeyMeta, setJourneyMeta] = useState<JourneyMeta | null>(null);
  const [wheelmapAccessibility, setWheelmapAccessibility] = useState<string>("");
  const [wheelmapNoPersonalConfirmed, setWheelmapNoPersonalConfirmed] = useState(false);

  useEffect(() => {
    if (!journeyId) {
      setNoteText(defaultNoteText);
      setJourneyMeta(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("journeys")
          .select(
            "location_text, campus_or_system, what_happened, expected_outcome, osm_note_url, mode, user_focus, claimed_access_statement, issue_scope",
          )
          .eq("id", journeyId)
          .single();
        if (error) throw error;
        if (!cancelled && data) {
          const d = data as any;
          setNoteText(buildNoteText(d));
          if (d.osm_note_url) setOsmUrl(d.osm_note_url as string);

          const { data: evData } = await supabase
            .from("evidence")
            .select("id, type")
            .eq("journey_id", journeyId);
          const evidence = (evData ?? []) as { type: string }[];
          const evidenceCount = evidence.length;
          const guidanceCount = evidence.filter((e) => e.type === "policy_doc").length;

          setJourneyMeta({
            mode: d.mode ?? "physical",
            user_focus: d.user_focus ?? null,
            claimed_access_statement: d.claimed_access_statement ?? null,
            issue_scope: d.issue_scope ?? null,
            evidenceCount,
            guidanceCount,
          });
        } else if (!cancelled) {
          setNoteText(defaultNoteText);
          setJourneyMeta(null);
        }
      } catch {
        if (!cancelled) {
          setNoteText(defaultNoteText);
          setJourneyMeta(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [journeyId, defaultNoteText]);

  const readyForPublicContribution =
    journeyId &&
    phase === "3" &&
    journeyMeta &&
    Boolean(journeyMeta.issue_scope) &&
    Boolean(journeyMeta.claimed_access_statement?.trim()) &&
    journeyMeta.evidenceCount >= 1 &&
    journeyMeta.guidanceCount >= 1;

  const showWheelMap =
    journeyMeta?.mode === "physical" &&
    (journeyMeta?.user_focus === "wheelchair" || journeyMeta?.user_focus === "both");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(noteText);
      alert("Note template copied. Paste it into OpenStreetMap Notes.");
    } catch {
      alert("Could not copy automatically. Select and copy the text manually.");
    }
  };

  const osmNotesUrl =
    "https://www.openstreetmap.org/note/new#map=18/51.529/-0.128"; // Example centre; adjust for your campus.

  const handleSaveOsmUrl = async () => {
    if (!journeyId) return;
    setSaveError(null);
    setSaveMessage(null);
    if (!osmUrl.trim()) {
      setSaveError("Paste the URL of the OSM note first.");
      return;
    }
    try {
      setSaving(true);
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("journeys")
        .update({ osm_note_url: osmUrl.trim() })
        .eq("id", journeyId);
      if (error) throw error;
      setSaveMessage("OSM note URL saved back to this journey.");
    } catch (err: any) {
      setSaveError(
        err?.message ??
          "Could not save OSM note URL. Check Supabase configuration and RLS.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <PhaseGuard allowedPhases={["3"]}>
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="rounded-xl border border-white/15 bg-white/[0.03] p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          Screen 09 · OSM helper
        </div>
        <h1 className="mt-2 text-xl font-semibold">
          OpenStreetMap Notes helper
        </h1>
        <p className="mt-1 text-sm text-white/70">
          Use OSM Notes to point out an accessibility issue without editing the
          map directly. Only contribute if you can safely generalise the issue
          without personal data.
        </p>
      </div>

      {journeyId && phase === "3" && journeyMeta && !readyForPublicContribution && (
        <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <strong>This journey is not ready for public contribution.</strong>
          <p className="mt-1 text-[12px] text-amber-200/90">
            Before generating an OSM note, ensure: issue scope is set (on the journey detail page),
            claimed access statement is present, at least one evidence item, and at least one guidance URL.
          </p>
          <Link
            href={`/journeys/${journeyId}`}
            className="mt-2 inline-block rounded-full border-2 border-amber-400 bg-black px-3 py-1.5 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/20"
          >
            Open journey to complete
          </Link>
        </div>
      )}

      <section className="space-y-3 rounded-xl border border-white/15 bg-white/[0.02] p-5 text-sm text-white/80">
        <ol className="list-decimal space-y-2 pl-5 text-[13px]">
          <li>
            Choose a journey from the toolkit where the barrier relates to
            physical access.
          </li>
          <li>
            Generate or adapt a note like the template below. Remove names,
            IDs, or anything that identifies an individual.
          </li>
          <li>
            Open OpenStreetMap Notes, place a marker at the relevant location,
            and paste your note text.
          </li>
          <li>
            After submitting, copy the OSM note URL and paste it back into the
            entry&apos;s OSM field (later iteration).
          </li>
        </ol>
      </section>

      <section className="space-y-3 rounded-xl border border-white/15 bg-white/[0.02] p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          {journeyId ? "OSM note text (from journey)" : "Example OSM note text"}
        </div>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-white/20 bg-black/70 p-3 text-[12px] text-white/85">
          {loading ? "Loading journey…" : noteText}
        </pre>
        <label className="mt-3 flex items-start gap-2 text-[12px] text-white/80">
          <input
            type="checkbox"
            checked={noPersonalDataConfirmed}
            onChange={(e) => setNoPersonalDataConfirmed(e.target.checked)}
            className="mt-[2px]"
          />
          <span>I confirm this note contains no personal data.</span>
        </label>
        <div className="flex flex-wrap gap-2 text-[11px] mt-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={Boolean(loading || !noPersonalDataConfirmed || (phase === "3" && journeyId && !readyForPublicContribution))}
            className="rounded-full border-2 border-white bg-black px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Copy template
          </button>
          <a
            href={noPersonalDataConfirmed && (!(phase === "3" && journeyId) || readyForPublicContribution) ? osmNotesUrl : "#"}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
              if (!noPersonalDataConfirmed) e.preventDefault();
              if (phase === "3" && journeyId && !readyForPublicContribution) e.preventDefault();
            }}
            className={`inline-flex items-center justify-center rounded-full border-2 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] transition ${
              noPersonalDataConfirmed && (!(phase === "3" && journeyId) || readyForPublicContribution)
                ? "border-white bg-black text-white hover:bg-white/10"
                : "cursor-not-allowed border-white/40 bg-black/50 text-white/50 pointer-events-none"
            }`}
            aria-disabled={!noPersonalDataConfirmed || (phase === "3" && !!journeyId && !readyForPublicContribution) ? true : undefined}
          >
            Open OSM Notes
          </a>
        </div>
      </section>

      {journeyId && (
        <section className="space-y-3 rounded-xl border border-white/15 bg-white/[0.02] p-5 text-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
            Paste OSM note URL back into entry
          </div>
          <p className="text-[11px] text-white/70">
            After submitting your OSM Note, copy the URL from OpenStreetMap and
            paste it here so it is linked to this journey.
          </p>
          <input
            type="url"
            value={osmUrl}
            onChange={(e) => setOsmUrl(e.target.value)}
            placeholder="https://www.openstreetmap.org/note/…"
            className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
          />
          <div className="flex flex-wrap gap-2 text-[11px]">
            <button
              type="button"
              onClick={handleSaveOsmUrl}
              disabled={saving}
            className="inline-flex rounded-full border-2 border-white bg-black px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save OSM URL to journey"}
          </button>
          </div>
          {saveError && (
            <p className="rounded border border-red-500/60 bg-red-500/10 px-3 py-2 text-[11px] text-red-100">
              {saveError}
            </p>
          )}
          {saveMessage && (
            <p className="rounded border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-100">
              {saveMessage}
            </p>
          )}
        </section>
      )}

      {showWheelMap && (
        <section className="space-y-3 rounded-xl border border-white/15 bg-white/[0.02] p-5 text-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
            WheelMap contribution (physical accessibility only)
          </div>
          <p className="text-[12px] text-white/70">
            WheelMap allows you to contribute structured wheelchair accessibility information.
          </p>
          <div className="flex flex-wrap gap-3 text-[12px]">
            {[
              ["fully_accessible", "Fully accessible"],
              ["partially_accessible", "Partially accessible"],
              ["not_accessible", "Not accessible"],
              ["unknown", "Unknown"],
            ].map(([value, label]) => (
              <label key={value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="wheelmap"
                  checked={wheelmapAccessibility === value}
                  onChange={() => setWheelmapAccessibility(value)}
                  className="rounded-full border-white/30"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <label className="mt-3 flex items-start gap-2 text-[12px] text-white/80">
            <input
              type="checkbox"
              checked={wheelmapNoPersonalConfirmed}
              onChange={(e) => setWheelmapNoPersonalConfirmed(e.target.checked)}
              className="mt-[2px]"
            />
            <span>I confirm this submission contains no personal data.</span>
          </label>
          <a
            href="https://wheelmap.org"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full border-2 border-white bg-black px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10"
          >
            Open WheelMap
          </a>
        </section>
      )}
    </div>
    </PhaseGuard>
  );
}

export default function OSMHelperPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl p-6 text-center text-sm text-white/60">Loading…</div>}>
      <OSMHelperContent />
    </Suspense>
  );
}

