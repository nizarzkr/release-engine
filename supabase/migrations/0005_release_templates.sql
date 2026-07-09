-- ============================================================
-- Release Engine — Migration 0005 : formats de release personnalisables
-- Les templates (Sprint/Marathon/Impact...) deviennent des lignes éditables
-- par utilisateur. Chaque release fige un SNAPSHOT de ses jalons (`milestones`)
-- au moment du choix → éditer/supprimer un format ne casse jamais une release.
-- ============================================================

-- 1) Table des templates ------------------------------------------------------
create table public.release_template (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  milestones jsonb not null default '[]'::jsonb,
  is_builtin boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_release_template_user on public.release_template(user_id);

create trigger trg_release_template_updated
  before update on public.release_template
  for each row execute function public.set_updated_at();

-- RLS : isolation stricte par utilisateur (même pattern que 0002).
alter table public.release_template enable row level security;
grant select, insert, update, delete on public.release_template to authenticated;

create policy "own_select" on public.release_template
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own_insert" on public.release_template
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "own_update" on public.release_template
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "own_delete" on public.release_template
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- 2) release : snapshot de jalons + window_template = NOM du format ------------
alter table public.release
  drop constraint if exists release_window_template_check;

alter table public.release
  add column if not exists milestones jsonb not null default '[]'::jsonb;

-- 3) Backfill des releases existantes -----------------------------------------
-- Jalons des 3 formats historiques (offsets en jours autour de J-Day).
update public.release set
  milestones = case window_template
    when 'SPRINT' then '[
      {"key":"0","label":"Annonce","offset":-21,"phase":"PRE"},
      {"key":"1","label":"Teasing","offset":-14,"phase":"PRE"},
      {"key":"2","label":"Pré-sortie","offset":-7,"phase":"PRE"},
      {"key":"3","label":"Sortie","offset":0,"phase":"DAY"},
      {"key":"4","label":"Traîne","offset":7,"phase":"POST"}
    ]'::jsonb
    when 'IMPACT' then '[
      {"key":"0","label":"Annonce","offset":-56,"phase":"PRE"},
      {"key":"1","label":"Teasing 1","offset":-42,"phase":"PRE"},
      {"key":"2","label":"Teasing 2","offset":-28,"phase":"PRE"},
      {"key":"3","label":"Montée 1","offset":-21,"phase":"PRE"},
      {"key":"4","label":"Montée 2","offset":-14,"phase":"PRE"},
      {"key":"5","label":"Pré-sortie","offset":-7,"phase":"PRE"},
      {"key":"6","label":"Sortie","offset":0,"phase":"DAY"},
      {"key":"7","label":"Traîne 1","offset":7,"phase":"POST"},
      {"key":"8","label":"Traîne 2","offset":14,"phase":"POST"},
      {"key":"9","label":"Traîne 3","offset":21,"phase":"POST"},
      {"key":"10","label":"Bilan","offset":28,"phase":"POST"}
    ]'::jsonb
    else '[
      {"key":"0","label":"Annonce","offset":-35,"phase":"PRE"},
      {"key":"1","label":"Teasing 1","offset":-28,"phase":"PRE"},
      {"key":"2","label":"Teasing 2","offset":-21,"phase":"PRE"},
      {"key":"3","label":"Montée","offset":-14,"phase":"PRE"},
      {"key":"4","label":"Pré-sortie","offset":-7,"phase":"PRE"},
      {"key":"5","label":"Sortie","offset":0,"phase":"DAY"},
      {"key":"6","label":"Traîne 1","offset":7,"phase":"POST"},
      {"key":"7","label":"Traîne 2","offset":14,"phase":"POST"},
      {"key":"8","label":"Bilan","offset":21,"phase":"POST"}
    ]'::jsonb
  end,
  window_template = case window_template
    when 'SPRINT' then 'Sprint'
    when 'IMPACT' then 'Impact'
    when 'MARATHON' then 'Marathon'
    else coalesce(window_template, 'Marathon')
  end
where milestones = '[]'::jsonb;
