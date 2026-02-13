-- Week 6 Access Journey Logging Toolkit – Supabase schema
-- Run this in the Supabase Dashboard → SQL Editor (New query) for your project.
-- Then create a storage bucket named "wizard" in Storage if you use photo uploads.

-- Groups (for Start screen: table/group identity only; workshop is phase-based, not role-based)
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role_key text,
  role_title text,
  role_instructions text,
  created_at timestamptz default now()
);

-- Journeys (main entries from the wizard)
create table if not exists public.journeys (
  id uuid primary key default gen_random_uuid(),
  journey_code text not null,
  created_name text,
  created_group_id uuid references public.groups(id) on delete set null,
  created_session_id text,
  group_id uuid references public.groups(id) on delete set null,
  mode text not null check (mode in ('physical', 'digital')),
  campus_or_system text not null,
  location_text text,
  url text,
  user_focus text,
  user_focus_other text,
  journey_goal text,
  what_happened text not null,
  expected_outcome text,
  barrier_type text not null,
  where_happened text,
  where_happened_other text,
  access_result text not null,
  missing_or_unclear text,
  suggested_improvement text,
  status text not null,
  lat double precision,
  lng double precision,
  created_at timestamptz default now()
);

-- Journey steps (wizard steps 1–6)
create table if not exists public.journey_steps (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  step_index int not null,
  go_to text,
  attempt_to text,
  observe text,
  created_at timestamptz default now()
);

-- Evidence (URLs and photo references; actual files go in storage bucket "evidence")
create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  type text not null,
  storage_path text,
  external_url text,
  caption text,
  created_at timestamptz default now()
);

-- Story board notes (structured template)
create table if not exists public.story_board_notes (
  id uuid primary key default gen_random_uuid(),
  created_name text,
  created_session_id text,
  title text not null,
  note text not null,
  tags text[] default '{}',
  linked_journey_ids uuid[] default '{}',
  claim text,
  supporting_evidence_ids uuid[] default '{}',
  what_is_missing text,
  framing_for_figma text,
  extra_notes text,
  created_at timestamptz default now()
);

-- Workshop phase (single row; lecturer changes via admin)
create table if not exists public.workshop_state (
  id uuid primary key default gen_random_uuid(),
  current_phase text not null default '1' check (current_phase in ('1', '2_categories', '2_story', '3')),
  updated_at timestamptz default now()
);
insert into public.workshop_state (id, current_phase)
select gen_random_uuid(), '1'
where not exists (select 1 from public.workshop_state limit 1);

-- Category / governance suggestions
create table if not exists public.category_suggestions (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid references public.journeys(id) on delete set null,
  field_name text not null,
  suggestion text not null,
  rationale text,
  suggested_name text,
  suggested_session_id text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_at timestamptz,
  created_at timestamptz default now()
);

-- Optional: set group_id from created_group_id so feed filter works (run after insert via trigger or app)
-- The app inserts created_group_id; we add group_id in the wizard insert to match.

-- RLS: allow read/write for anon (no auth). Restrict in production if you add auth later.
alter table public.groups enable row level security;
alter table public.journeys enable row level security;
alter table public.journey_steps enable row level security;
alter table public.evidence enable row level security;
alter table public.story_board_notes enable row level security;
alter table public.category_suggestions enable row level security;
alter table public.workshop_state enable row level security;

create policy "Allow anon read workshop_state"
  on public.workshop_state for select to anon using (true);
create policy "Allow anon update workshop_state"
  on public.workshop_state for update to anon using (true) with check (true);

create policy "Allow anon read groups"
  on public.groups for select to anon using (true);
create policy "Allow anon read journeys"
  on public.journeys for select to anon using (true);
create policy "Allow anon insert journeys"
  on public.journeys for insert to anon with check (true);
create policy "Allow anon read journey_steps"
  on public.journey_steps for select to anon using (true);
create policy "Allow anon insert journey_steps"
  on public.journey_steps for insert to anon with check (true);
create policy "Allow anon read evidence"
  on public.evidence for select to anon using (true);
create policy "Allow anon insert evidence"
  on public.evidence for insert to anon with check (true);
create policy "Allow anon read story_board_notes"
  on public.story_board_notes for select to anon using (true);
create policy "Allow anon insert story_board_notes"
  on public.story_board_notes for insert to anon with check (true);
create policy "Allow anon read category_suggestions"
  on public.category_suggestions for select to anon using (true);
create policy "Allow anon insert category_suggestions"
  on public.category_suggestions for insert to anon with check (true);
create policy "Allow anon update journeys"
  on public.journeys for update to anon using (true) with check (true);
create policy "Allow anon delete journeys"
  on public.journeys for delete to anon using (true);
create policy "Allow anon update story_board_notes"
  on public.story_board_notes for update to anon using (true) with check (true);
create policy "Allow anon delete story_board_notes"
  on public.story_board_notes for delete to anon using (true);
create policy "Allow anon delete category_suggestions"
  on public.category_suggestions for delete to anon using (true);
create policy "Allow anon update category_suggestions"
  on public.category_suggestions for update to anon using (true) with check (true);

-- Migration: category_suggestions approval fields (run on existing DBs)
alter table public.category_suggestions add column if not exists status text default 'pending';
alter table public.category_suggestions add column if not exists approved_at timestamptz;

-- Migration: add structured story board columns if missing (run on existing DBs)
alter table public.story_board_notes add column if not exists claim text;
alter table public.story_board_notes add column if not exists supporting_evidence_ids uuid[] default '{}';
alter table public.story_board_notes add column if not exists what_is_missing text;
alter table public.story_board_notes add column if not exists framing_for_figma text;
alter table public.story_board_notes add column if not exists extra_notes text;

-- Seed groups when table is empty (phase-neutral names; workshop flow is phase-based)
insert into public.groups (name, role_key, role_title)
select v.name, v.role_key, v.role_title
from (values
  ('Group 1', 'group_1', 'Group 1'),
  ('Group 2', 'group_2', 'Group 2'),
  ('Group 3', 'group_3', 'Group 3'),
  ('Group 4', 'group_4', 'Group 4')
) as v(name, role_key, role_title)
where not exists (select 1 from public.groups limit 1);

-- Optional: migrate existing role-named groups to phase-neutral names (run in SQL Editor if you already have data)
-- update public.groups set name = case
--   when role_key = 'physical_logger' or name ilike '%Physical%' then 'Group 1'
--   when role_key = 'digital_logger' or name ilike '%Digital%' then 'Group 2'
--   when role_key = 'category' or name ilike '%Categor%' then 'Group 3'
--   when role_key = 'story' or name ilike '%Story%' then 'Group 4'
--   else name end;
