/**
 * Generates the Week 6 Workshop Excel template with one tab per phase
 * and a Bug reporting sheet. Run: node scripts/generate-workshop-excel.cjs
 * Output: public/week6-workshop-template.xlsx
 */

const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

const OUT_DIR = path.join(__dirname, "..", "public");
const OUT_FILE = path.join(OUT_DIR, "week6-workshop-template.xlsx");

function aoa(sheetName, ...blocks) {
  const rows = [];
  blocks.forEach((block, i) => {
    if (i > 0) rows.push([]);
    if (block.title) {
      rows.push([block.title]);
      rows.push([]);
    }
    rows.push(block.headers);
    (block.rows || []).forEach((r) => rows.push(r));
    rows.push([]);
  });
  return XLSX.utils.aoa_to_sheet(rows);
}

const wb = XLSX.utils.book_new();

// --- Phase 0: Claims + Link suggestions ---
const phase0ClaimsHeaders = [
  "id",
  "created_at",
  "created_name",
  "created_group_id",
  "created_session_id",
  "source_url",
  "source_label",
  "user_focus",
  "claim_text",
];
const phase0LinksHeaders = [
  "id",
  "created_session_id",
  "created_name",
  "created_group_id",
  "url",
  "label",
  "created_at",
];
const wsPhase0 = aoa(
  "Phase 0",
  { title: "Claims (claimed access statements – what information you are logging for each claim)", headers: phase0ClaimsHeaders, rows: [] },
  { title: "Link suggestions (suggested URLs / other links)", headers: phase0LinksHeaders, rows: [] }
);
XLSX.utils.book_append_sheet(wb, wsPhase0, "Phase 0");

// --- Phase 1: Journeys + Steps + Evidence ---
const phase1JourneyHeaders = [
  "id",
  "journey_code",
  "created_name",
  "created_group_id",
  "created_session_id",
  "group_id",
  "mode",
  "campus_or_system",
  "location_text",
  "url",
  "user_focus",
  "user_focus_other",
  "journey_goal",
  "claimed_access_statement",
  "claimed_statement_id",
  "what_happened",
  "expected_outcome",
  "barrier_type",
  "where_happened",
  "where_happened_other",
  "access_result",
  "missing_or_unclear",
  "suggested_improvement",
  "status",
  "issue_scope",
  "lat",
  "lng",
  "created_at",
];
const phase1StepHeaders = [
  "id",
  "journey_id",
  "step_index",
  "go_to",
  "attempt_to",
  "observe",
  "created_at",
];
const phase1EvidenceHeaders = [
  "id",
  "journey_id",
  "step_index",
  "type",
  "storage_path",
  "external_url",
  "caption",
  "created_at",
];
const wsPhase1 = aoa(
  "Phase 1",
  { title: "Journey logging (entries from the wizard)", headers: phase1JourneyHeaders, rows: [] },
  { title: "Journey steps (per-step: go to, attempt to, observe)", headers: phase1StepHeaders, rows: [] },
  { title: "Evidence (photos, URLs – per step or journey-level)", headers: phase1EvidenceHeaders, rows: [] }
);
XLSX.utils.book_append_sheet(wb, wsPhase1, "Phase 1");

// --- Phase 2: Category + Storyboard ---
const phase2CategoryHeaders = [
  "id",
  "journey_id",
  "field_name",
  "suggestion",
  "rationale",
  "observed_pattern",
  "suggested_name",
  "suggested_session_id",
  "created_at",
];
const phase2StoryboardHeaders = [
  "id",
  "created_name",
  "created_session_id",
  "title",
  "note",
  "tags",
  "linked_journey_ids",
  "claim",
  "supporting_evidence_ids",
  "what_is_missing",
  "framing_for_figma",
  "extra_notes",
  "claim_type",
  "public_strategy",
  "created_at",
];
const wsPhase2 = aoa(
  "Phase 2",
  { title: "Category (governance suggestions – what you are reviewing/suggesting)", headers: phase2CategoryHeaders, rows: [] },
  { title: "Storyboard (story board notes – what you are capturing)", headers: phase2StoryboardHeaders, rows: [] }
);
XLSX.utils.book_append_sheet(wb, wsPhase2, "Phase 2");

// --- Phase 3: Links & templates (no submission – reference only) ---
const phase3Rows = [
  ["Phase 3 – OSM & Wheelchair"],
  [],
  ["No data submission in the app for this phase. Use the links and templates below for reference."],
  [],
  ["OSM (OpenStreetMap) Notes"],
  ["Purpose", "Report access issues without editing the map"],
  ["Link / tool", "Use the in-app OSM Helper or open openstreetmap.org and add a Note"],
  ["Template (paste when creating an OSM Note):", "Location: [place]\nIssue: [what happened]\nExpected: [expected outcome]\nLogged by: Week 6 Access Journey"],
  [],
  ["Wheelchair / WheelMap"],
  ["Purpose", "Classify accessibility of places"],
  ["Link / tool", "Use the in-app WheelMap helper or wheelmap.org"],
  [],
  ["Public contribution strategy options (for story board):", "OSM single-location note | OSM recurring pattern note | WheelMap classification | Informational only | Not ready"],
];
const wsPhase3 = XLSX.utils.aoa_to_sheet(phase3Rows);
XLSX.utils.book_append_sheet(wb, wsPhase3, "Phase 3");

// --- Bug reporting (for developers) ---
const bugHeaders = [
  "Date",
  "Reporter",
  "Page / Feature",
  "Description",
  "Severity (Critical / High / Medium / Low)",
  "Steps to reproduce",
  "Expected vs actual",
  "Browser / device",
];
const wsBug = aoa("Bug reporting", {
  title: "Bug reporting (for developers)",
  headers: bugHeaders,
  rows: [],
});
XLSX.utils.book_append_sheet(wb, wsBug, "Bug reporting");

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
XLSX.writeFile(wb, OUT_FILE);
console.log("Written:", OUT_FILE);
