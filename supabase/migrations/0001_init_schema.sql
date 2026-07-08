-- ============================================================
-- Release Engine — Migration 0001 : schéma initial
-- 7 tables (PRD §5) + updated_at + index + triggers.
-- RLS et policies : voir migration 0002.
-- ============================================================

-- Fonction trigger générique : maintient updated_at à jour.
-- SECURITY INVOKER (défaut) + search_path figé (bonne pratique sécurité).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- ARTIST PROFILE (1:1 avec user)
-- ------------------------------------------------------------
create table public.artist_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  artist_name text not null,
  genres text[] default '{}',
  references_art text[] default '{}',
  da_keywords text[] default '{}',
  image_stance text check (image_stance in ('FACE','ANONYME','HYBRIDE')) default 'HYBRIDE',
  platforms text[] default '{}',
  weekly_capacity int default 3,
  constraints text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------
-- RELEASE
-- ------------------------------------------------------------
create table public.release (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  type text check (type in ('SINGLE','EP')) default 'SINGLE',
  release_date date not null,
  bpm int,
  mood text,
  cover_url text,
  dsp_links jsonb default '{}',
  parent_release_id uuid references public.release(id) on delete set null,
  window_template text check (window_template in ('SPRINT','MARATHON','IMPACT')) default 'MARATHON',
  status text default 'PLANNED',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------
-- SOURCE BLOCK (chaînon production → diffusion)
-- ------------------------------------------------------------
create table public.source_block (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  release_id uuid references public.release(id) on delete cascade not null,
  type text check (type in ('LIVE_SESSION','CLIP_SHOOT','STUDIO_DAY','OTHER')) not null,
  shoot_date date,
  asset_link text,
  status text check (status in ('PLANIFIE','TOURNE','RUSHES_DISPO')) default 'PLANIFIE',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------
-- CONTENT ITEM
-- ------------------------------------------------------------
create table public.content_item (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  release_id uuid references public.release(id) on delete cascade not null,
  source_block_id uuid references public.source_block(id) on delete set null,
  theme text not null,
  format text check (format in ('SHORT','LONG')) default 'SHORT',
  platform text,
  objective_tag text check (objective_tag in ('DECOUVERTE','IMMERSION','EXPERTISE','CONNEXION')),
  brief jsonb default '{}',        -- {hook, concept, structure, sound_suggestion, cta}
  pipeline_status text check (pipeline_status in ('BACKLOG','A_TOURNER','A_MONTER','READY')) default 'BACKLOG',
  tags text[] default '{}',
  is_published boolean default false,   -- archivage
  scheduled_date date,
  assignee text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------
-- CHECKLIST ITEM
-- ------------------------------------------------------------
create table public.checklist_item (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  release_id uuid references public.release(id) on delete cascade not null,
  label text not null,
  phase text check (phase in ('PRE','POST')) default 'PRE',
  due_date date,
  is_done boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------
-- CONTENT THEME (config réutilisable)
-- ------------------------------------------------------------
create table public.content_theme (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------
-- API KEYS (BYOK, chiffrées au repos — utilisé à partir de J6)
-- ------------------------------------------------------------
create table public.api_key (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text check (provider in ('ANTHROPIC','OPENAI','GOOGLE')) not null,
  encrypted_key text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------
-- INDEX (perf RLS + filtres fréquents par user / release)
-- ------------------------------------------------------------
create index idx_release_user            on public.release(user_id);
create index idx_release_parent          on public.release(parent_release_id);
create index idx_source_block_user       on public.source_block(user_id);
create index idx_source_block_release    on public.source_block(release_id);
create index idx_content_item_user       on public.content_item(user_id);
create index idx_content_item_release    on public.content_item(release_id);
create index idx_content_item_source     on public.content_item(source_block_id);
create index idx_checklist_item_user     on public.checklist_item(user_id);
create index idx_checklist_item_release  on public.checklist_item(release_id);
create index idx_content_theme_user      on public.content_theme(user_id);
create index idx_api_key_user            on public.api_key(user_id);
-- artist_profile.user_id est déjà indexé (contrainte unique).

-- ------------------------------------------------------------
-- TRIGGERS updated_at
-- ------------------------------------------------------------
create trigger trg_artist_profile_updated before update on public.artist_profile
  for each row execute function public.set_updated_at();
create trigger trg_release_updated before update on public.release
  for each row execute function public.set_updated_at();
create trigger trg_source_block_updated before update on public.source_block
  for each row execute function public.set_updated_at();
create trigger trg_content_item_updated before update on public.content_item
  for each row execute function public.set_updated_at();
create trigger trg_checklist_item_updated before update on public.checklist_item
  for each row execute function public.set_updated_at();
create trigger trg_content_theme_updated before update on public.content_theme
  for each row execute function public.set_updated_at();
create trigger trg_api_key_updated before update on public.api_key
  for each row execute function public.set_updated_at();
