-- ============================================================
-- Release Engine — Migration 0008 : lien jalon ↔ carte de contenu
-- Un jalon de la timeline (snapshot `release.milestones`) peut générer UNE
-- carte kanban. `milestone_key` porte ce lien : il rend la ré-édition d'un
-- jalon idempotente (mise à jour au lieu d'un doublon) et permet d'afficher
-- l'état de production directement sur la timeline.
-- ============================================================

alter table public.content_item
  add column if not exists milestone_key text;

-- Au plus une carte par jalon et par release. Index PARTIEL : les cartes
-- libres (milestone_key null) ne sont pas contraintes entre elles.
create unique index if not exists uq_content_item_milestone
  on public.content_item(release_id, milestone_key)
  where milestone_key is not null;
