# Week 6 Access Journey Logging Toolkit — Holistic Report

## 1. What we did (overview)

We built a **classroom toolkit** for logging and analysing physical and digital access journeys. There is **no login or account system**. Students identify once with a **display name** and **group**; that identity is stored in the browser and used only for **attribution** on entries and suggestions. All data lives in **Supabase** (tables + optional photo storage).

---

## 2. Design decisions and logic

### 2.1 No auth (magic link / Join / Profile removed)

- **What:** Removed Supabase auth, middleware, and auth callback. Join and Profile pages redirect to Start.
- **Why:** Keeps the session **in-class friendly**: no email, no passwords, no account management. Identity is “name + group for this session” only.
- **How:** Identity lives in **localStorage** as `week6-identity` (displayName, groupId, groupName, sessionId) and optionally `week6-session-id`. No server-side user record.

### 2.2 Single entry point: Start screen

- **What:** One screen at `/start`: display name (2–30 chars) + group dropdown from Supabase `groups` table. On “Continue”, identity is saved to localStorage and the user is sent to Home.
- **Why:** Ensures every student has a name and group before doing anything. The group list is the single source of truth (tutor can edit in Supabase).
- **Logic:** Session ID is generated once (or reused from localStorage) so multiple submissions in the same “session” can be tied together for attribution.

### 2.3 Group-based roles on Home

- **What:** Home reads `week6-identity` and fetches the group’s config from Supabase (`role_key`, `role_title`, `role_instructions`). It shows “You are: [group name] — [role title]”, a **role-specific checklist**, and a **primary CTA** (e.g. wizard, category, story-board).
- **Why:** Different groups have different tasks (physical logger, digital logger, category reviewer, story/narrative). The home page acts as a simple “narrative director” so each student knows what to do first.
- **Role mapping:**
  - `physical_logger` → checklist + “Start new physical entry” → `/wizard`
  - `digital_logger` → checklist + “Start new digital entry” → `/wizard`
  - `category` → checklist + “Review & suggest categories” → `/category`
  - `story` → checklist + “Open Story Board” → `/story-board`
  - Default (no role or unknown) → generic checklist + “Start new entry” → `/wizard`

### 2.4 Journey attribution (no `created_by` user ID)

- **What:** Journeys are stored with **created_name**, **created_group_id**, **created_session_id** (and **group_id** for feed filtering). Story board notes use **created_name** and **created_session_id**; category suggestions use **suggested_name** and **suggested_session_id**.
- **Why:** There are no user accounts, so we never store a `user_id`. Attribution is by “who said they did it” (name + group + session), which is enough for in-class reflection and governance.

### 2.5 Wizard and evidence

- **What:** 7-step wizard creates one **journey** row plus **journey_steps** and **evidence** rows. Photos are uploaded to the Supabase storage bucket **wizard**; metadata (e.g. storage path, URLs, captions) goes into the **evidence** table.
- **Why:** Keeps a single, structured flow: steps, outcome, evidence, and guidance URLs. Storage bucket name “wizard” matches the flow; the app was updated to use this bucket (instead of “evidence”) so it matches what you created in Supabase.

### 2.6 Supabase schema and RLS

- **What:** `supabase/schema.sql` defines tables: **groups**, **journeys**, **journey_steps**, **evidence**, **story_board_notes**, **category_suggestions**. RLS is enabled with **anon** read/insert policies so the app works without auth.
- **Why:** One script to run in the SQL Editor gives a consistent schema; permissive anon access is intentional for the class-only, no-login design. You can tighten RLS later if you add auth.

### 2.7 Feed, map, story board, category, export

- **What:** Feed shows journeys from Supabase (or a seed example if the API fails, e.g. 404). Map, story board, category, and CSV/Story Pack export all use the same Supabase client and tables. Join/Profile redirect to Start.
- **Why:** Single data source; students see a live, shared view and can filter by group/mode/barrier/result. Story and category roles have dedicated entry points from Home.

---

## 3. How students should engage (checklist for you)

Use this flow to verify behaviour end-to-end.

### 3.1 Before class (you / tutor)

1. **Supabase:** Run `supabase/schema.sql` in the project’s SQL Editor (if not already done).
2. **Supabase:** Create storage bucket **wizard** and set policies so anon can upload (and optionally read) if you use photo uploads.
3. **Supabase:** Ensure **groups** has the right rows (name, role_key, role_title). Seed in schema adds four example groups; edit in Table Editor as needed.
4. **App:** Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`) in `.env.local`.

### 3.2 Student flow (in order)

| Step | Action | What to check |
|------|--------|----------------|
| 1 | Open app (e.g. `/` or `/start`). | If no identity, they should land on or be guided to **Start** (name + group). |
| 2 | **Start:** Enter display name (2–30 chars), choose **Group** from dropdown, click **Continue**. | Redirect to **Home**. No login, no email. |
| 3 | **Home:** See “You are: [Group name] — [Role title]”, role-specific checklist, and primary button. | Role matches group’s `role_key` in Supabase (e.g. physical_logger → “Start new physical entry”). |
| 4 | Click primary CTA (e.g. **Start new entry**). | **Loggers** go to **Wizard**; **Category** to **Category**; **Story** to **Story Board**. |
| 5 | **Wizard (if applicable):** Complete 7 steps (mode, location/URL, focus, goal, what happened, steps, outcome, evidence, status). Add at least one evidence item (photo upload and/or URL). Submit. | One new row in **journeys** (with created_name, created_group_id, created_session_id, group_id); rows in **journey_steps** and **evidence**. Photos in bucket **wizard**. |
| 6 | **Feed:** Open Live Feed. | Sees own and others’ journeys; can filter by group, mode, barrier, result. No “Live Supabase connection not available” if schema and env are correct. |
| 7 | **Journey detail:** From feed, open a journey. | Tabs: Summary, Steps, Evidence, OSM. Evidence shows captions and URLs (and storage refs for uploads). |
| 8 | **Story Board (if story role):** Add a note (title, body, tags, optional linked journey IDs). Save. | Row in **story_board_notes** with created_name, created_session_id. |
| 9 | **Category (if category role):** Submit a suggestion (field name, suggestion, optional rationale, optional journey link). | Row in **category_suggestions** with suggested_name, suggested_session_id. |
| 10 | **Switch group:** On Home, use “Switch group” (or equivalent). | Identity cleared; redirect to **Start** to pick name + group again. |

### 3.3 Quick sanity checks

- **No auth:** Join and Profile should redirect to `/start`; no magic link or sign-in.
- **Attribution:** In Supabase, **journeys** has `created_name`, `created_group_id`, `created_session_id`, `group_id`; **story_board_notes** has `created_name`, `created_session_id`; **category_suggestions** has `suggested_name`, `suggested_session_id`.
- **Roles:** Changing group on Start and re-entering should change Home’s checklist and primary CTA to match the new group’s role.
- **Photo uploads:** Wizard evidence step uploads to bucket **wizard**; evidence table has `storage_path` for those items.

---

## 4. File / route summary (for reference)

| Route / area | Purpose |
|--------------|--------|
| `/start` | Name + group; writes `week6-identity` and `week6-session-id` to localStorage; redirects to `/`. |
| `/` (Home) | Reads identity; loads group config; shows role title, checklist, primary CTA; “Switch group” clears identity → `/start`. |
| `/wizard` | 7-step new journey; inserts journeys + journey_steps + evidence; uploads photos to bucket **wizard**. |
| `/feed` | Live list of journeys; filters; link to journey detail. |
| `/journeys/[id]` | Journey detail: summary, steps, evidence, OSM tab. |
| `/story-board` | List + create story notes (created_name, created_session_id). |
| `/category` | List + submit category suggestions (suggested_name, suggested_session_id). |
| `/map` | Map view of journeys (lat/lng). |
| `/osm-helper` | OSM note helper. |
| `/export` | Links to CSV and Story Pack export. |
| `/join`, `/profile` | Redirect to `/start`. |

---

## 5. Summary

- **Identity:** Name + group on Start, stored in localStorage; no server-side auth.
- **Roles:** From Supabase **groups** (role_key, role_title); Home shows role-specific checklist and primary action.
- **Attribution:** created_name, created_group_id, created_session_id (and group_id for journeys); same idea for story notes and category suggestions.
- **Data:** All in Supabase; schema in `supabase/schema.sql`; photo uploads in bucket **wizard**.
- **Students:** Start → Home → role-based action (wizard / category / story-board) → Feed / detail / map / export as needed; “Switch group” to re-identify.

Use **Section 3** as the student engagement checklist to verify everything in your environment.
