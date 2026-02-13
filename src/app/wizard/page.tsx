'use client';

import { useEffect, useMemo, useState } from "react";
import { Field } from "@/components/ui/Field";
import { PhaseGroupGuard } from "@/components/PhaseGroupGuard";
import { getSupabaseClient } from "@/lib/supabaseClient";

type Mode = "physical" | "digital" | "";
type AccessResult = "granted" | "blocked" | "partial" | "unclear" | "";
type BarrierType = "physical" | "digital" | "information" | "process" | "mixed" | "";
type Status = "observed" | "confirmed" | "needs_verification" | "";
type UserFocus = "wheelchair" | "blind_vi" | "both" | "other" | "";

type Step = {
  goTo: string;
  attemptTo: string;
  observe: string;
};

type EvidenceKind = "file" | "url";

type EvidenceItem = {
  id: string;
  kind: EvidenceKind;
  caption: string;
  url?: string;
  file?: File | null;
};

const MAX_STEPS = 6;
const MIN_STEPS = 2;

function PrivacyBanner() {
  return (
    <div className="mb-4 rounded-lg border border-white/20 bg-white/[0.06] px-3 py-2 text-[11px] text-white/80">
      <span className="font-semibold uppercase tracking-[0.18em]">
        Privacy
      </span>
      <span className="ml-2 text-white/80">
        No faces. No emails or student IDs. No confidential documents.
      </span>
    </div>
  );
}

function StepPill({ active, index, label }: { active: boolean; index: number; label: string }) {
  return (
    <div
      className={`flex flex-1 items-center gap-2 rounded-full border px-2 py-1 text-[10px] ${
        active
          ? "border-white bg-white text-black"
          : "border-white/20 bg-black text-white/60"
      }`}
    >
      <div
        className={`flex h-4 w-4 items-center justify-center rounded-full border text-[9px] ${
          active
            ? "border-black bg-black text-white"
            : "border-white/50 text-white/70"
        }`}
      >
        {index}
      </div>
      <span className="truncate uppercase tracking-[0.18em]">{label}</span>
    </div>
  );
}

export default function WizardPage() {
  const [stepIndex, setStepIndex] = useState(1);

  // Step 1 – Context
  const [mode, setMode] = useState<Mode>("");
  const [group, setGroup] = useState("");
  const [campusSystem, setCampusSystem] = useState("");
  const [campusOther, setCampusOther] = useState("");
  const [userFocus, setUserFocus] = useState<UserFocus>("");
  const [userFocusOther, setUserFocusOther] = useState("");
  const [journeyGoal, setJourneyGoal] = useState("");

  // Step 2 – Where
  const [locationText, setLocationText] = useState("");
  const [url, setUrl] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");

  // Step 3 – Steps
  const [steps, setSteps] = useState<Step[]>([
    { goTo: "", attemptTo: "", observe: "" },
    { goTo: "", attemptTo: "", observe: "" },
  ]);

  // Step 4 – Outcome
  const [linkedClaimId, setLinkedClaimId] = useState<string | null>(null);
  const [loggedClaims, setLoggedClaims] = useState<{ id: string; source_label: string | null; source_url: string; claim_text: string }[]>([]);
  const [claimedAccessStatement, setClaimedAccessStatement] = useState("");
  const [whatHappened, setWhatHappened] = useState("");
  const [expectedOutcome, setExpectedOutcome] = useState("");
  const [accessResult, setAccessResult] = useState<AccessResult>("");

  // Step 5 – Classification
  const [barrierType, setBarrierType] = useState<BarrierType>("");
  const [whereHappened, setWhereHappened] = useState("");
  const [whereOther, setWhereOther] = useState("");
  const [status, setStatus] = useState<Status>("");

  // Step 6 – Interpretation + action
  const [missingUnclear, setMissingUnclear] = useState("");
  const [suggestedImprovement, setSuggestedImprovement] = useState("");

  // Step 7 – Evidence
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [guidanceUrls, setGuidanceUrls] = useState<string[]>([""]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase
          .from("claimed_access_statements")
          .select("id, source_label, source_url, claim_text")
          .order("created_at", { ascending: false })
          .limit(30);
        if (!cancelled && data) setLoggedClaims(data as { id: string; source_label: string | null; source_url: string; claim_text: string }[]);
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPrivacyGate, setShowPrivacyGate] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [privacyChecks, setPrivacyChecks] = useState({
    noFaces: false,
    noIds: false,
    noConfidential: false,
  });

  const currentLabel = useMemo(() => {
    switch (stepIndex) {
      case 1:
        return "Context";
      case 2:
        return "Where";
      case 3:
        return "Steps";
      case 4:
        return "Outcome";
      case 5:
        return "Classification";
      case 6:
        return "Interpretation + Action";
      case 7:
        return "Evidence";
      default:
        return "";
    }
  }, [stepIndex]);

  const validateStep = (index: number) => {
    const newErrors: Record<string, string> = {};

    if (index === 1) {
      if (!mode) newErrors.mode = "Choose Physical or Digital.";
      if (!group) newErrors.group = "Pick your group.";
      if (!campusSystem) newErrors.campus = "Select a campus/system (or Other).";
      if (campusSystem === "other" && !campusOther.trim()) {
        newErrors.campusOther = "Describe the campus/system if you pick Other.";
      }
      if (!userFocus) newErrors.userFocus = "Select a user focus.";
      if (userFocus === "other" && !userFocusOther.trim()) {
        newErrors.userFocusOther = "Describe the focus if you pick Other.";
      }
      if (journeyGoal.trim().length < 10) {
        newErrors.journeyGoal = "Write at least 10 characters for the goal.";
      }
    }

    if (index === 2) {
      if (mode === "physical") {
        if (locationText.trim().length < 5) {
          newErrors.locationText = "Describe the location so someone else could find it.";
        }
      } else if (mode === "digital") {
        if (!url.startsWith("http")) {
          newErrors.url = "Use the exact page URL where the barrier occurs.";
        }
      }
    }

    if (index === 3) {
      if (steps.length < MIN_STEPS) {
        newErrors.steps = "Add at least 2 steps.";
      }
      steps.forEach((s, idx) => {
        if (s.goTo.trim().length < 5) {
          newErrors[`step_${idx}_goTo`] = "Write at least 5 characters.";
        }
        if (s.attemptTo.trim().length < 5) {
          newErrors[`step_${idx}_attempt`] = "Write at least 5 characters.";
        }
        if (s.observe.trim().length < 5) {
          newErrors[`step_${idx}_observe`] = "Write what you observed.";
        }
      });
    }

    if (index === 4) {
      if (claimedAccessStatement.trim().length < 10) {
        newErrors.claimedAccessStatement = "What is claimed about access here? (min 10 characters).";
      }
      if (whatHappened.trim().length < 20) {
        newErrors.whatHappened = "Write at least 20 characters for what happened (factual).";
      }
      if (expectedOutcome.trim().length < 10) {
        newErrors.expectedOutcome = "Write what should have happened (min 10 characters).";
      }
      if (!accessResult) {
        newErrors.accessResult = "Select the access result.";
      }
    }

    if (index === 5) {
      if (!barrierType) newErrors.barrierType = "Pick the dominant barrier.";
      if (!whereHappened) newErrors.whereHappened = "Select where this happened in the journey.";
      if (whereHappened === "other" && !whereOther.trim()) {
        newErrors.whereOther = "Describe the stage if you pick Other.";
      }
      if (!status) newErrors.status = "Select the current status of this observation.";
    }

    if (index === 6) {
      if (missingUnclear.trim().length < 10) {
        newErrors.missingUnclear =
          "Write at least 10 characters about what was missing or unclear.";
      }
      if (suggestedImprovement.trim().length < 10) {
        newErrors.suggestedImprovement =
          "Write at least 10 characters describing a practical improvement.";
      }
    }

    if (index === 7) {
      if (evidenceItems.length < 1) {
        newErrors.evidence = "Add at least one evidence item (photo or URL).";
      }
      const guidanceCount = guidanceUrls.filter((g) => g.trim().length > 0).length;
      if (guidanceCount < 1) {
        newErrors.guidance = "Add at least one guidance/policy URL (required).";
      }
      evidenceItems.forEach((item, idx) => {
        if (item.caption.trim().length < 5) {
          newErrors[`evidence_${idx}_caption`] = "Caption must be at least 5 characters.";
        }
        if (item.kind !== "file" && (!item.url || !item.url.startsWith("http"))) {
          newErrors[`evidence_${idx}_url`] =
            "Enter a valid URL starting with http for this evidence item.";
        }
        if (item.kind === "file" && !item.file) {
          newErrors[`evidence_${idx}_file`] =
            "Attach an image file for this evidence item.";
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /** Returns list of missing requirements for submission (hard enforcement). No partial submit. */
  function getCompletionMissing(): string[] {
    const missing: string[] = [];
    if (steps.length < MIN_STEPS) missing.push("Minimum 2 steps");
    if (claimedAccessStatement.trim().length < 10) missing.push("Claimed access statement (min 10 characters)");
    if (whatHappened.trim().length < 20) missing.push("What happened (at least 20 characters)");
    if (expectedOutcome.trim().length < 10) missing.push("Expected outcome (at least 10 characters)");
    if (!barrierType) missing.push("Barrier type selected");
    if (!whereHappened) missing.push("Where it happened selected");
    if (!status) missing.push("Status selected");
    if (mode === "digital") {
      if (!url.startsWith("http")) missing.push("URL for digital mode");
    }
    if (evidenceItems.length < 1) missing.push("At least one evidence item (photo or URL)");
    const guidanceCount = guidanceUrls.filter((g) => g.trim().length > 0).length;
    if (guidanceCount < 1) missing.push("At least one guidance URL");
    return missing;
  }

  /** Quality status for review: complete | needs_clarity | missing_guidance | steps_vague */
  function getQualityStatus(): "complete" | "needs_clarity" | "missing_guidance" | "steps_vague" {
    const missing = getCompletionMissing();
    if (missing.length > 0) {
      if (missing.some((m) => m.toLowerCase().includes("guidance"))) return "missing_guidance";
      if (missing.some((m) => m.toLowerCase().includes("step"))) return "steps_vague";
      return "needs_clarity";
    }
    const stepLengthsOk = steps.every(
      (s) =>
        s.goTo.trim().length >= 5 &&
        s.attemptTo.trim().length >= 5 &&
        s.observe.trim().length >= 5,
    );
    if (!stepLengthsOk) return "needs_clarity";
    return "complete";
  }

  const goNext = () => {
    if (!validateStep(stepIndex)) return;
    setStepIndex((prev) => Math.min(7, prev + 1));
  };

  const goBack = () => {
    setErrors({});
    setStepIndex((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitted(false);
    if (!validateStep(7)) return;
    const missing = getCompletionMissing();
    if (missing.length > 0) {
      setErrors((prev) => ({ ...prev, _completionSummary: "see below" }));
      return;
    }

    try {
      setSaving(true);
      const supabase = getSupabaseClient();

      const rawIdentity =
        typeof window !== "undefined"
          ? window.localStorage.getItem("week6-identity")
          : null;
      if (!rawIdentity) {
        setSubmitError(
          "Set your name and group first on the Start screen before logging an entry.",
        );
        return;
      }
      let identity: {
        displayName: string;
        groupId: string;
        groupName: string;
        sessionId: string;
      };
      try {
        identity = JSON.parse(rawIdentity);
      } catch {
        setSubmitError(
          "Your local identity is invalid. Please revisit the Start screen and enter your details again.",
        );
        return;
      }

      // Generate a simple journey code; in production you might move this to an Edge function.
      const groupFragment =
        (group || "G").replace(/[^0-9A-Za-z]/g, "").slice(-2) || "G";
      const timestampFragment = Date.now().toString().slice(-4);
      const journey_code = `UAL-W6-${groupFragment}-${timestampFragment}`;

      const campusOrSystem =
        campusSystem === "other" && campusOther.trim()
          ? campusOther.trim()
          : campusSystem;

      const {
        data: journeyData,
        error: journeyError,
      } = await supabase
        .from("journeys")
        .insert({
          journey_code,
          created_name: identity.displayName,
          created_group_id: identity.groupId,
          created_session_id: identity.sessionId,
          group_id: identity.groupId,
          mode,
          campus_or_system: campusOrSystem,
          location_text: mode === "physical" ? locationText : null,
          url: mode === "digital" ? url : null,
          lat: mode === "physical" && lat.trim() ? parseFloat(lat) : null,
          lng: mode === "physical" && lng.trim() ? parseFloat(lng) : null,
          user_focus: userFocus || "other",
          user_focus_other: userFocus === "other" ? userFocusOther || null : null,
          journey_goal: journeyGoal,
          claimed_access_statement: claimedAccessStatement.trim(),
          claimed_statement_id: linkedClaimId || null,
          what_happened: whatHappened,
          expected_outcome: expectedOutcome,
          barrier_type: barrierType,
          where_happened: whereHappened,
          where_happened_other: whereHappened === "other" ? whereOther || null : null,
          access_result: accessResult,
          missing_or_unclear: missingUnclear,
          suggested_improvement: suggestedImprovement,
          status,
        })
        .select("id, journey_code")
        .single();

      if (journeyError) {
        throw journeyError;
      }

      const journeyId = journeyData.id as string;

      // Insert steps (1–6)
      const stepsPayload = steps.map((s, idx) => ({
        journey_id: journeyId,
        step_index: idx + 1,
        go_to: s.goTo,
        attempt_to: s.attemptTo,
        observe: s.observe,
      }));

      if (stepsPayload.length) {
        const { error: stepsError } = await supabase
          .from("journey_steps")
          .insert(stepsPayload);
        if (stepsError) {
          throw stepsError;
        }
      }

      // Insert evidence rows (including guidance URLs as policy_doc)
      const evidenceRows: any[] = [];
      const fileItems: EvidenceItem[] = [];

      evidenceItems.forEach((item) => {
        if (item.kind === "file") {
          fileItems.push(item);
        } else {
          evidenceRows.push({
            journey_id: journeyId,
            type: "url",
            storage_path: null,
            external_url: item.url ?? null,
            caption: item.caption,
          });
        }
      });

      guidanceUrls
        .filter((g) => g.trim().length > 0)
        .forEach((g) =>
          evidenceRows.push({
            journey_id: journeyId,
            type: "policy_doc",
            storage_path: null,
            external_url: g,
            caption: "Guidance / policy URL",
          }),
        );

      const uploadedFileRows: any[] = [];

      if (fileItems.length) {
        for (const item of fileItems) {
          if (!item.file) continue;
          const file = item.file;
          const maxBytes = 10 * 1024 * 1024;
          if (file.size > maxBytes) {
            throw new Error("One of the evidence images is larger than 10MB.");
          }
          const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
          if (!allowedTypes.includes(file.type)) {
            throw new Error(
              "Evidence images must be PNG, JPG/JPEG, or WEBP.",
            );
          }

          const extFromName = file.name.split(".").pop() || "";
          const ext =
            extFromName.toLowerCase() === "jpg"
              ? "jpg"
              : ["jpeg", "png", "webp"].includes(extFromName.toLowerCase())
              ? extFromName.toLowerCase()
              : "png";

          const groupSlug =
            (group || "unknown")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "_")
              .replace(/^_+|_+$/g, "") || "group";
          const folder = `group_${groupSlug}/journey_${journey_code}`;
          const filename = `${journey_code}_${item.id}.${ext}`;
          const path = `${folder}/${filename}`;

          const { error: uploadError } = await supabase.storage
            .from("wizard")
            .upload(path, file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) {
            throw uploadError;
          }

          uploadedFileRows.push({
            journey_id: journeyId,
            type: "photo",
            storage_path: path,
            external_url: null,
            caption: item.caption,
          });
        }
      }

      const allEvidenceRows = [...evidenceRows, ...uploadedFileRows];

      if (allEvidenceRows.length) {
        const { error: evidenceError } = await supabase
          .from("evidence")
          .insert(allEvidenceRows);
        if (evidenceError) {
          throw evidenceError;
        }
      }

      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(
        err?.message ??
          "There was a problem saving this entry. Check Supabase auth, schema, and RLS configuration.",
      );
      setSubmitted(false);
    } finally {
      setSaving(false);
    }
  };

  const addStep = () => {
    if (steps.length >= MAX_STEPS) return;
    setSteps((prev) => [...prev, { goTo: "", attemptTo: "", observe: "" }]);
  };

  const updateStep = (idx: number, field: keyof Step, value: string) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    );
  };

  const removeStep = (idx: number) => {
    if (steps.length <= MIN_STEPS) return;
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  const addEvidence = (kind: EvidenceKind) => {
    setEvidenceItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        kind,
        caption: "",
      },
    ]);
  };

  const handleAddFileEvidence = () => {
    if (!privacyAccepted) {
      setShowPrivacyGate(true);
      return;
    }
    addEvidence("file");
  };

  const updateEvidence = (
    id: string,
    field: keyof EvidenceItem,
    value: string,
  ) => {
    setEvidenceItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const removeEvidence = (id: string) => {
    setEvidenceItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateGuidance = (idx: number, value: string) => {
    setGuidanceUrls((prev) =>
      prev.map((g, i) => (i === idx ? value : g)),
    );
  };

  const addGuidance = () => {
    setGuidanceUrls((prev) => [...prev, ""]);
  };

  return (
    <PhaseGroupGuard route="wizard">
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="rounded-xl border border-white/15 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
              Screen 04 · New entry wizard
            </div>
            <h1 className="mt-2 text-xl font-semibold">
              Log an access journey
            </h1>
            <p className="mt-1 text-sm text-white/70">
              Guided in 7 short steps. Aim for 2–3 minutes to log one complete
              journey: steps, outcome, evidence, and a practical improvement.
            </p>
          </div>
          <div className="hidden text-right text-[11px] text-white/60 sm:block">
            <div className="font-semibold text-white/80">
              Step {stepIndex} of 7
            </div>
            <div>{currentLabel}</div>
          </div>
        </div>

        <div className="mt-4 grid gap-1.5 text-[10px] md:grid-cols-3">
          <StepPill active={stepIndex === 1} index={1} label="Context" />
          <StepPill active={stepIndex === 2} index={2} label="Where" />
          <StepPill active={stepIndex === 3} index={3} label="Steps" />
          <StepPill active={stepIndex === 4} index={4} label="Outcome" />
          <StepPill active={stepIndex === 5} index={5} label="Classification" />
          <StepPill
            active={stepIndex === 6}
            index={6}
            label="Interpretation + Action"
          />
          <StepPill active={stepIndex === 7} index={7} label="Evidence" />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-white/15 bg-white/[0.02] p-5"
      >
        <PrivacyBanner />

        {stepIndex === 1 && (
          <div className="space-y-4">
            <Field
              label="Mode"
              helper="Start by selecting where you are collecting evidence today."
              tooltip="If you are not sure, pick the closest option—clarify later in interpretation."
              required
              error={errors.mode}
            >
              <div className="inline-flex gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setMode("physical")}
                  className={`rounded-full border px-3 py-1 ${
                    mode === "physical"
                      ? "border-white bg-white text-black"
                      : "border-white/30 bg-black text-white/80"
                  }`}
                >
                  Physical
                </button>
                <button
                  type="button"
                  onClick={() => setMode("digital")}
                  className={`rounded-full border px-3 py-1 ${
                    mode === "digital"
                      ? "border-white bg-white text-black"
                      : "border-white/30 bg-black text-white/80"
                  }`}
                >
                  Digital
                </button>
              </div>
            </Field>

            <Field
              label="Group"
              helper="Choose the group you are working with today. This keeps your dataset mergeable."
              required
              error={errors.group}
            >
              <input
                type="text"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                placeholder="e.g., Group 3 — Digital Systems"
                className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
              />
            </Field>

            <Field
              label="Campus / System"
              helper="Pick from presets or describe if Other."
              required
              error={errors.campus || errors.campusOther}
            >
              <div className="space-y-2">
                <select
                  value={campusSystem}
                  onChange={(e) => setCampusSystem(e.target.value)}
                  className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white focus:border-white/60 focus:outline-none"
                >
                  <option value="">Select…</option>
                  <option value="UAL Camberwell Peckham Building">UAL Camberwell Peckham Building</option>
                  <option value="CCI Greencoat Building">CCI Greencoat Building</option>
                  <option value="Moodle">Moodle</option>
                  <option value="Library">Library</option>
                  <option value="IT Services">IT Services</option>
                  <option value="other">Other…</option>
                </select>
                {campusSystem === "other" && (
                  <input
                    type="text"
                    value={campusOther}
                    onChange={(e) => setCampusOther(e.target.value)}
                    placeholder="Describe the campus or system…"
                    className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
                  />
                )}
              </div>
            </Field>

            <Field
              label="User focus"
              helper="Whose access are you focusing on?"
              required
              error={
                errors.userFocus ||
                (userFocus === "other" ? errors.userFocusOther : undefined)
              }
            >
              <div className="flex flex-col gap-2 text-[11px]">
                {[
                  ["wheelchair", "Wheelchair users"],
                  ["blind_vi", "Blind & visually impaired users"],
                  ["both", "Both"],
                  ["other", "Other"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setUserFocus(value as UserFocus)}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left whitespace-normal leading-snug ${
                      userFocus === value
                        ? "border-white bg-white text-black"
                        : "border-white/30 bg-black text-white/80"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {userFocus === "other" && (
                <input
                  type="text"
                  value={userFocusOther}
                  onChange={(e) => setUserFocusOther(e.target.value)}
                  placeholder="Describe the focus…"
                  className="mt-2 w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
                />
              )}
            </Field>

            <Field
              label="Journey goal"
              helper="What were you trying to do? Keep it practical. Min 10 characters."
              required
              error={errors.journeyGoal}
            >
              <textarea
                value={journeyGoal}
                onChange={(e) => setJourneyGoal(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="e.g., Reach a studio on the 2nd floor; submit an assignment on Moodle."
                className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
              />
              <p className="mt-1 text-[10px] text-white/50">{journeyGoal.length}/500</p>
            </Field>
          </div>
        )}

        {stepIndex === 2 && (
          <div className="space-y-4">
            {mode === "physical" ? (
              <>
                <Field
                  label="Location"
                  helper="Describe the spot so someone else could find it."
                  tooltip="Describe so someone else could find it without you."
                  required
                  error={errors.locationText}
                >
                  <textarea
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    rows={3}
                    placeholder="e.g., UAL Camberwell Peckham Building, Main entrance A, lift bank near reception."
                    className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
                  />
                </Field>
              </>
            ) : (
              <Field
                label="URL"
                helper="Use the exact page where the barrier occurs."
                tooltip="Use the exact page where the barrier occurs."
                required
                error={errors.url}
              >
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://"
                  className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
                />
              </Field>
            )}
          </div>
        )}

        {stepIndex === 3 && (
          <div className="space-y-3">
            <p className="text-[11px] text-white/65">
              Minimum 2 steps, maximum 6. Each step has: where you went, what
              you tried to do, and what you observed.
            </p>
            {errors.steps && (
              <p className="rounded border border-red-500/60 bg-red-500/10 px-3 py-1 text-[11px] text-red-100">
                {errors.steps}
              </p>
            )}
            {steps.map((s, idx) => (
              <div
                key={idx}
                className="space-y-2 rounded-lg border border-white/15 bg-black/60 p-3"
              >
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <div className="font-semibold text-white/80">
                    Step {idx + 1}
                  </div>
                  {steps.length > MIN_STEPS && (
                    <button
                      type="button"
                      onClick={() => removeStep(idx)}
                      className="rounded-full border-2 border-white bg-black px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <Field
                  label="Go to…"
                  required
                  error={errors[`step_${idx}_goTo`]}
                >
                  <input
                    type="text"
                    value={s.goTo}
                    onChange={(e) =>
                      updateStep(idx, "goTo", e.target.value)
                    }
                    placeholder="e.g., Main entrance (Entrance A)"
                    className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
                  />
                </Field>
                <Field
                  label="Attempt to…"
                  required
                  error={errors[`step_${idx}_attempt`]}
                >
                  <input
                    type="text"
                    value={s.attemptTo}
                    onChange={(e) =>
                      updateStep(idx, "attemptTo", e.target.value)
                    }
                    placeholder="e.g., Use step-free route to enter"
                    className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
                  />
                </Field>
                <Field
                  label="Observe…"
                  helper="Write what the system/space did. No opinions yet."
                  required
                  error={errors[`step_${idx}_observe`]}
                >
                  <textarea
                    value={s.observe}
                    onChange={(e) =>
                      updateStep(idx, "observe", e.target.value)
                    }
                    rows={2}
                    placeholder="e.g., Ramp route not signposted; lift out of service; no alternative route info."
                    className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
                  />
                </Field>
              </div>
            ))}
            {steps.length < MAX_STEPS && (
              <button
                type="button"
                onClick={addStep}
                className="mt-1 rounded-full border-2 border-white bg-black px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10"
              >
                + Add another step
              </button>
            )}
          </div>
        )}

        {stepIndex === 4 && (
          <div className="space-y-4">
            <Field
              label="Link to a previously logged claim (optional)"
              helper={loggedClaims.length > 0 ? "Choose a claim you logged in Phase 0 to pre-fill the statement below. You can still edit the text." : "No claims logged in Phase 0 yet. Log claims on the home page (Phase 0) first, or enter manually below."}
            >
              {loggedClaims.length > 0 ? (
                <select
                  value={linkedClaimId ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLinkedClaimId(val || null);
                    if (val) {
                      const claim = loggedClaims.find((c) => c.id === val);
                      if (claim) {
                        setClaimedAccessStatement(claim.claim_text);
                        setGuidanceUrls((prev) => [claim.source_url, ...prev.slice(1)]);
                      }
                    } else {
                      setGuidanceUrls((prev) => ["", ...prev.slice(1)]);
                    }
                  }}
                  className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white focus:border-white/60 focus:outline-none"
                >
                  <option value="">No linked claim</option>
                  {loggedClaims.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.source_label || c.source_url} — {c.claim_text.slice(0, 40)}{c.claim_text.length > 40 ? "…" : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="rounded-md border border-white/20 bg-white/5 px-3 py-2 text-[12px] text-white/70">
                  No claims in Phase 0 yet. Go to the home page, switch to Phase 0, and use “Log a Claimed Access Statement” to add claims. Then return here to link one, or type the claim below.
                </p>
              )}
            </Field>
            <Field
              label="What is claimed about access here?"
              helper="What does the institution/system publicly claim about accessibility at this location or service? Example: 'This building is fully accessible.'"
              required
              error={errors.claimedAccessStatement}
            >
              <textarea
                value={claimedAccessStatement}
                onChange={(e) => setClaimedAccessStatement(e.target.value)}
                rows={2}
                maxLength={500}
                className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
                placeholder="e.g., This building is fully accessible."
              />
              <p className="mt-1 text-[10px] text-white/50">
                {claimedAccessStatement.length}/500 · need at least 10
              </p>
            </Field>

            <Field
              label="What happened (factual)"
              helper="Describe what you observed without explaining why. Min 20 characters."
              tooltip="Write what you observed without explaining why. No opinions yet."
              required
              error={errors.whatHappened}
              exampleBody="The lift was out of service. No alternative route signage was visible."
            >
              <textarea
                value={whatHappened}
                onChange={(e) => setWhatHappened(e.target.value)}
                rows={3}
                maxLength={2000}
                className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
                placeholder="e.g., Lift was out of service and the step-free alternative route was not clearly signposted."
              />
              <p className="mt-1 text-[10px] text-white/50">
                {whatHappened.length}/2000 · need at least 20
              </p>
            </Field>

            <Field
              label="Expected outcome"
              helper="What should have happened for access to be fair/usable? Min 10 characters."
              required
              error={errors.expectedOutcome}
              exampleBody="A clearly signposted step-free route with live lift status information."
            >
              <textarea
                value={expectedOutcome}
                onChange={(e) => setExpectedOutcome(e.target.value)}
                rows={2}
                maxLength={1000}
                className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
                placeholder="e.g., A clearly signposted step-free route with live lift status information."
              />
              <p className="mt-1 text-[10px] text-white/50">
                {expectedOutcome.length}/1000 · need at least 10
              </p>
            </Field>

            <Field
              label="Access result"
              helper="How did this journey end for the user?"
              required
              error={errors.accessResult}
            >
              <div className="flex flex-wrap gap-2 text-[11px]">
                {[
                  ["granted", "Granted"],
                  ["blocked", "Blocked"],
                  ["partial", "Partial"],
                  ["unclear", "Unclear"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAccessResult(value as AccessResult)}
                    className={`rounded-full border px-3 py-1 ${
                      accessResult === value
                        ? "border-white bg-white text-black"
                        : "border-white/30 bg-black text-white/80"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}

        {stepIndex === 5 && (
          <div className="space-y-4">
            <Field
              label="Barrier type"
              helper="Choose the dominant barrier. Mixed if it’s inseparable."
              tooltip="Pick the dominant barrier; choose Mixed if inseparable."
              required
              error={errors.barrierType}
            >
              <div className="flex flex-wrap gap-2 text-[11px]">
                {[
                  ["physical", "Physical"],
                  ["digital", "Digital"],
                  ["information", "Information"],
                  ["process", "Process"],
                  ["mixed", "Mixed"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setBarrierType(value as BarrierType)}
                    className={`rounded-full border px-3 py-1 ${
                      barrierType === value
                        ? "border-white bg-white text-black"
                        : "border-white/30 bg-black text-white/80"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>

            <Field
              label="Where it happened"
              helper="Which part of the journey does this barrier sit in?"
              required
              error={errors.whereHappened || errors.whereOther}
            >
              <div className="space-y-2">
                <select
                  value={whereHappened}
                  onChange={(e) => setWhereHappened(e.target.value)}
                  className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white focus:border-white/60 focus:outline-none"
                >
                  <option value="">Select…</option>
                  <option value="arrival">Arrival</option>
                  <option value="entry">Entry</option>
                  <option value="navigation">Navigation</option>
                  <option value="service_access">Service access</option>
                  <option value="submission">Submission</option>
                  <option value="exit">Exit</option>
                  <option value="other">Other…</option>
                </select>
                {whereHappened === "other" && (
                  <input
                    type="text"
                    value={whereOther}
                    onChange={(e) => setWhereOther(e.target.value)}
                    placeholder="Describe where this sits in the journey…"
                    className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
                  />
                )}
              </div>
            </Field>

            <Field
              label="Status"
              helper="Is this observed once, confirmed, or still needs verification?"
              required
              error={errors.status}
            >
              <div className="flex flex-wrap gap-2 text-[11px]">
                {[
                  ["observed", "Observed"],
                  ["confirmed", "Confirmed"],
                  ["needs_verification", "Needs verification"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatus(value as Status)}
                    className={`rounded-full border px-3 py-1 ${
                      status === value
                        ? "border-white bg-white text-black"
                        : "border-white/30 bg-black text-white/80"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}

        {stepIndex === 6 && (
          <div className="space-y-4">
            <Field
              label="Missing / unclear (interpretation)"
              helper="What you couldn’t verify or what the system left ambiguous."
              tooltip="What you couldn’t verify, or what the system left ambiguous."
              required
              error={errors.missingUnclear}
              exampleBody="No public info for lift outages or where to check accessibility disruptions."
            >
              <textarea
                value={missingUnclear}
                onChange={(e) => setMissingUnclear(e.target.value)}
                rows={3}
                maxLength={1000}
                className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
                placeholder="e.g., No public info for lift outages or where to check accessibility disruptions."
              />
              <p className="mt-1 text-[10px] text-white/50">{missingUnclear.length}/1000</p>
            </Field>

            <Field
              label="Suggested improvement (action)"
              helper="A practical fix that could be implemented."
              tooltip="A practical change someone could implement."
              required
              error={errors.suggestedImprovement}
              exampleBody="Publish lift outage status on a single page + QR code at lift; add consistent signage to step-free routes."
            >
              <textarea
                value={suggestedImprovement}
                onChange={(e) => setSuggestedImprovement(e.target.value)}
                rows={3}
                maxLength={1000}
                className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
                placeholder="e.g., Publish lift outage status on a single page + QR code at lift; add consistent signage to step-free routes."
              />
              <p className="mt-1 text-[10px] text-white/50">{suggestedImprovement.length}/1000</p>
            </Field>
          </div>
        )}

        {stepIndex === 7 && (
          <div className="space-y-4">
            {getCompletionMissing().length > 0 && (
              <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">
                  Completion summary
                </p>
                <p className="mt-1 text-sm text-white/90">
                  To submit, you still need:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-0.5 text-sm text-white/80">
                  {getCompletionMissing().map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/60">Record quality:</span>
              {getQualityStatus() === "complete" && (
                <span className="rounded-full bg-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-200">
                  Complete and structured
                </span>
              )}
              {getQualityStatus() === "needs_clarity" && (
                <span className="rounded-full bg-amber-500/30 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-200">
                  Needs more clarity
                </span>
              )}
              {getQualityStatus() === "missing_guidance" && (
                <span className="rounded-full bg-red-500/30 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-200">
                  Missing required guidance
                </span>
              )}
              {getQualityStatus() === "steps_vague" && (
                <span className="rounded-full bg-red-500/30 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-200">
                  Steps too vague
                </span>
              )}
            </div>
            <Field
              label="Evidence (minimum 1 required)"
              helper="Upload photo/screenshot or add an external URL. Caption required."
              required
              error={errors.evidence}
            >
              <div className="mb-2 flex flex-wrap gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleAddFileEvidence}
                  className="rounded-full border-2 border-white bg-black px-3 py-1 text-[11px] font-semibold text-white hover:bg-white/10"
                >
                  + Photo / screenshot
                </button>
                <button
                  type="button"
                  onClick={() => addEvidence("url")}
                  className="rounded-full border-2 border-white bg-black px-3 py-1 text-[11px] font-semibold text-white hover:bg-white/10"
                >
                  + External URL
                </button>
              </div>
              <p className="mb-2 text-[11px] text-white/60">
                Before uploading or linking, check: no faces, no emails/student
                IDs, no confidential documents.
              </p>
              <div className="space-y-3">
                {evidenceItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="space-y-2 rounded-lg border border-white/20 bg-black/60 p-3"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <div className="font-semibold text-white/80">
                        Evidence {idx + 1} ·{" "}
                        {item.kind === "file"
                          ? "Photo / screenshot"
                          : "URL"}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeEvidence(item.id)}
                        className="rounded-full border-2 border-white bg-black px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10"
                      >
                        Remove
                      </button>
                    </div>
                    {item.kind !== "file" && (
                      <div className="space-y-1">
                        <input
                          type="url"
                          value={item.url ?? ""}
                          onChange={(e) =>
                            updateEvidence(item.id, "url", e.target.value)
                          }
                          placeholder="https://"
                          className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
                        />
                        {errors[`evidence_${idx}_url`] && (
                          <p className="text-[11px] text-red-300">
                            {errors[`evidence_${idx}_url`]}
                          </p>
                        )}
                      </div>
                    )}
                    {item.kind === "file" && (
                      <div className="space-y-1">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            setEvidenceItems((prev) =>
                              prev.map((ev) =>
                                ev.id === item.id ? { ...ev, file } : ev,
                              ),
                            );
                            setErrors((prev) => ({
                              ...prev,
                              [`evidence_${idx}_file`]: file
                                ? ""
                                : "Attach an image file for this evidence item.",
                            }));
                          }}
                          className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-xs text-white file:mr-2 file:rounded-md file:border-0 file:bg-white file:px-2 file:py-1 file:text-xs file:font-semibold file:text-black hover:file:bg-neutral-200 focus:border-white/60 focus:outline-none"
                        />
                        {errors[`evidence_${idx}_file`] && (
                          <p className="text-[11px] text-red-300">
                            {errors[`evidence_${idx}_file`]}
                          </p>
                        )}
                        <p className="text-[10px] text-white/50">
                          PNG, JPG, or WEBP, max 10MB.
                        </p>
                      </div>
                    )}
                    <div className="space-y-1">
                      <textarea
                        value={item.caption}
                        onChange={(e) =>
                          updateEvidence(item.id, "caption", e.target.value)
                        }
                        rows={2}
                        placeholder="Short caption (no names or IDs)."
                        className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
                      />
                      {errors[`evidence_${idx}_caption`] && (
                        <p className="text-[11px] text-red-300">
                          {errors[`evidence_${idx}_caption`]}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Field>

            <h3 className="text-sm font-semibold text-white/90">
              Guidance / Policy URLs (Required)
            </h3>
            <p className="text-[11px] text-white/60">
              Link to an official policy, accessibility statement, or system
              guidance relevant to this issue. Pick a link from Phase 0 below or enter a URL manually. Add more with the button.
            </p>
            <Field
              label=""
              required
              error={errors.guidance}
            >
              <div className="space-y-2">
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-[0.12em] text-white/50">
                    Use a link from a Phase 0 claim (optional)
                  </p>
                  {loggedClaims.length > 0 ? (
                    <select
                      value={loggedClaims.find((c) => c.source_url === guidanceUrls[0])?.id ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          const claim = loggedClaims.find((c) => c.id === val);
                          if (claim) updateGuidance(0, claim.source_url);
                        } else {
                          updateGuidance(0, "");
                        }
                      }}
                      className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white focus:border-white/60 focus:outline-none"
                    >
                      <option value="">No link from Phase 0 — I’ll enter a URL below</option>
                      {loggedClaims.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.source_label || c.source_url} — {c.source_url}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="rounded-md border border-white/20 bg-white/5 px-3 py-2 text-[12px] text-white/60">
                      No Phase 0 claims yet. Log claims on the home page (Phase 0) to see links here, or enter a URL in the field below.
                    </p>
                  )}
                </div>
                {guidanceUrls.map((g, idx) => (
                  <div key={idx}>
                    {idx === 0 && (
                      <p className="mb-1 text-[10px] uppercase tracking-[0.12em] text-white/50">
                        {loggedClaims.length > 0 ? "Guidance URL (from dropdown above or enter here)" : "Guidance URL"}
                      </p>
                    )}
                    <input
                      type="url"
                      value={g}
                      onChange={(e) => updateGuidance(idx, e.target.value)}
                      placeholder="e.g., https://www.arts.ac.uk/accessibility"
                      className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addGuidance}
                className="rounded-full border-2 border-white bg-black px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10"
              >
                + Add another guidance URL
              </button>
              </div>
            </Field>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={stepIndex === 1}
            className="inline-flex items-center justify-center rounded-full border-2 border-white bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10 disabled:opacity-40"
          >
            Back
          </button>
          {stepIndex < 7 ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center justify-center rounded-full border-2 border-white bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white/10"
            >
              Next step
            </button>
          ) : (
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-full border-2 border-white bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white/10 disabled:opacity-60"
            >
              {saving ? "Submitting…" : "Submit entry"}
            </button>
          )}
        </div>

        {submitError && (
          <div className="mt-3 rounded border border-red-500/60 bg-red-500/10 px-3 py-2 text-[11px] text-red-100">
            {submitError}
          </div>
        )}

        {submitted && (
          <div className="mt-3 rounded border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-100">
            Entry saved. Steps, outcome, classification, interpretation, and
            evidence have been written to Supabase for this session&apos;s user.
          </div>
        )}

        {showPrivacyGate && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-md space-y-3 rounded-xl border border-white/20 bg-black p-4 text-sm">
              <h2 className="text-base font-semibold">
                Before you upload evidence
              </h2>
              <p className="text-[12px] text-white/70">
                Tick all three boxes to confirm your evidence respects class
                privacy rules.
              </p>
              <label className="flex items-start gap-2 text-[12px] text-white/80">
                <input
                  type="checkbox"
                  className="mt-[2px]"
                  checked={privacyChecks.noFaces}
                  onChange={(e) =>
                    setPrivacyChecks((prev) => ({
                      ...prev,
                      noFaces: e.target.checked,
                    }))
                  }
                />
                <span>No faces are visible.</span>
              </label>
              <label className="flex items-start gap-2 text-[12px] text-white/80">
                <input
                  type="checkbox"
                  className="mt-[2px]"
                  checked={privacyChecks.noIds}
                  onChange={(e) =>
                    setPrivacyChecks((prev) => ({
                      ...prev,
                      noIds: e.target.checked,
                    }))
                  }
                />
                <span>No emails, student IDs, or other direct identifiers.</span>
              </label>
              <label className="flex items-start gap-2 text-[12px] text-white/80">
                <input
                  type="checkbox"
                  className="mt-[2px]"
                  checked={privacyChecks.noConfidential}
                  onChange={(e) =>
                    setPrivacyChecks((prev) => ({
                      ...prev,
                      noConfidential: e.target.checked,
                    }))
                  }
                />
                <span>No confidential documents or sensitive personal data.</span>
              </label>
              <div className="mt-2 flex justify-end gap-2 text-[12px]">
                <button
                  type="button"
                  onClick={() => setShowPrivacyGate(false)}
                  className="rounded-full border-2 border-white bg-black px-3 py-1 text-white hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    !privacyChecks.noFaces ||
                    !privacyChecks.noIds ||
                    !privacyChecks.noConfidential
                  }
                  onClick={() => {
                    setPrivacyAccepted(true);
                    setShowPrivacyGate(false);
                    addEvidence("file");
                  }}
                  className="rounded-full border-2 border-white bg-black px-3 py-1 text-white hover:bg-white/10 disabled:opacity-50"
                >
                  I confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
    </PhaseGroupGuard>
  );
}

