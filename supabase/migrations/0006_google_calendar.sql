-- ============================================================
-- Release Engine — Migration 0006 : synchro Google Calendar (Bloc B1, push)
-- Une connexion OAuth par utilisateur (refresh token chiffré) + une table de
-- mapping item local → event Google (idempotence du reconcile).
-- ============================================================

-- 1) Connexion OAuth (1 ligne par utilisateur) -------------------------------
create table public.google_calendar_connection (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token_enc text not null,
  google_calendar_id text,
  google_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger trg_gcal_connection_updated
  before update on public.google_calendar_connection
  for each row execute function public.set_updated_at();

alter table public.google_calendar_connection enable row level security;
grant select, insert, update, delete on public.google_calendar_connection to authenticated;

create policy "own_select" on public.google_calendar_connection
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own_insert" on public.google_calendar_connection
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own_update" on public.google_calendar_connection
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "own_delete" on public.google_calendar_connection
  for delete to authenticated using ((select auth.uid()) = user_id);

-- 2) Mapping item local → event Google ---------------------------------------
create table public.google_calendar_event (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  source_kind text check (source_kind in ('MILESTONE','CONTENT','CHECKLIST')) not null,
  source_id text not null,
  google_event_id text not null,
  content_hash text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, source_kind, source_id)
);

create index idx_gcal_event_user on public.google_calendar_event(user_id);

create trigger trg_gcal_event_updated
  before update on public.google_calendar_event
  for each row execute function public.set_updated_at();

alter table public.google_calendar_event enable row level security;
grant select, insert, update, delete on public.google_calendar_event to authenticated;

create policy "own_select" on public.google_calendar_event
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own_insert" on public.google_calendar_event
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own_update" on public.google_calendar_event
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "own_delete" on public.google_calendar_event
  for delete to authenticated using ((select auth.uid()) = user_id);
