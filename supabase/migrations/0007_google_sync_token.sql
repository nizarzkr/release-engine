-- ============================================================
-- Release Engine — Migration 0007 : pull Google Calendar (Bloc B2)
-- Sync incrémental : on mémorise le syncToken Google + l'instant du dernier
-- pull (throttle de l'auto-pull à l'ouverture du calendrier).
-- ============================================================

alter table public.google_calendar_connection
  add column if not exists sync_token text,
  add column if not exists last_pull_at timestamptz;
