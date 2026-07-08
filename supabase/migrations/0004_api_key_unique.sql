-- ============================================================
-- Release Engine — Migration 0004 : BYOK
-- Une clé par provider (contrainte unique) + indice d'affichage.
-- ============================================================

-- 4 derniers caractères de la clé (non sensible) pour l'UI.
alter table public.api_key add column if not exists key_hint text;

-- Une seule clé par (user, provider) → permet l'upsert onConflict.
create unique index if not exists api_key_user_provider_uniq
  on public.api_key (user_id, provider);
