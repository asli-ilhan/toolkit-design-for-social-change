-- =============================================================================
-- RUN THIS IN SUPABASE SQL EDITOR (Dashboard → SQL Editor → New query)
-- Safe to run on existing DBs: uses "if not exists" / "if exists" where needed.
-- Run once. You can re-run; already-applied statements will no-op.
-- =============================================================================

-- 1) Phase 0: Claim logging table (if not already created)
create table if not exists public.claimed_access_statements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  created_name text,
  created_group_id uuid references public.groups(id) on delete set null,
  created_session_id text,
  source_url text not null,
  source_label text,
  user_focus text,
  claim_text text not null
);
alter table public.claimed_access_statements enable row level security;
drop policy if exists "Allow anon read claimed_access_statements" on public.claimed_access_statements;
create policy "Allow anon read claimed_access_statements" on public.claimed_access_statements for select to anon using (true);
drop policy if exists "Allow anon insert claimed_access_statements" on public.claimed_access_statements;
create policy "Allow anon insert claimed_access_statements" on public.claimed_access_statements for insert to anon with check (true);
drop policy if exists "Allow anon delete claimed_access_statements" on public.claimed_access_statements;
create policy "Allow anon delete claimed_access_statements" on public.claimed_access_statements for delete to anon using (true);

-- 2) Journeys: claim + issue scope + link to Phase 0 claim
alter table public.journeys add column if not exists claimed_access_statement text;
alter table public.journeys add column if not exists issue_scope text;
alter table public.journeys add column if not exists claimed_statement_id uuid references public.claimed_access_statements(id) on delete set null;

-- 3) Category suggestions: observed_pattern, then remove lecturer approval columns
alter table public.category_suggestions add column if not exists observed_pattern text;
alter table public.category_suggestions drop column if exists status;
alter table public.category_suggestions drop column if exists approved_at;

-- 4) Story board notes: claim, supporting_evidence_ids, what_is_missing, framing_for_figma, extra_notes, claim_type, public_strategy
alter table public.story_board_notes add column if not exists claim text;
alter table public.story_board_notes add column if not exists supporting_evidence_ids uuid[] default '{}';
alter table public.story_board_notes add column if not exists what_is_missing text;
alter table public.story_board_notes add column if not exists framing_for_figma text;
alter table public.story_board_notes add column if not exists extra_notes text;
alter table public.story_board_notes add column if not exists claim_type text;
alter table public.story_board_notes add column if not exists public_strategy text not null default 'Not ready for public contribution';

-- 5) Evidence: optional step_index (when set, evidence is for that journey step)
alter table public.evidence add column if not exists step_index int;

-- 6) Table RLS: ensure anon can insert into journeys, journey_steps, evidence (fix "new row violates row-level security policy")
drop policy if exists "Allow anon insert journeys" on public.journeys;
create policy "Allow anon insert journeys" on public.journeys for insert to anon with check (true);
drop policy if exists "Allow anon insert journey_steps" on public.journey_steps;
create policy "Allow anon insert journey_steps" on public.journey_steps for insert to anon with check (true);
drop policy if exists "Allow anon insert evidence" on public.evidence;
create policy "Allow anon insert evidence" on public.evidence for insert to anon with check (true);

-- 7) Storage RLS: allow anon to upload and read from the "evidence" bucket (required for step/evidence photos).
--    Ensure the bucket exists in Dashboard → Storage and is set to Public (or these policies apply to private buckets).
drop policy if exists "Allow anon upload evidence" on storage.objects;
create policy "Allow anon upload evidence"
  on storage.objects for insert to anon
  with check (bucket_id = 'evidence');

drop policy if exists "Allow anon read evidence storage" on storage.objects;
create policy "Allow anon read evidence storage"
  on storage.objects for select to anon
  using (bucket_id = 'evidence');
