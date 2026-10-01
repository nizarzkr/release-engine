-- ============================================================
-- Release Engine — Migration 0009 : checklist relative à la sortie
-- Une tâche porte désormais son écart à J-Day (`due_offset`, en jours),
-- comme les jalons. `due_date` reste stockée (calendrier, dashboard, synchro
-- Google la lisent) mais n'est plus que release_date + due_offset : quand la
-- sortie bouge, la checklist suit.
-- ============================================================

alter table public.checklist_item
  add column if not exists due_offset int;

-- Backfill 1 : tâches de la checklist par défaut → leur J d'origine
-- (miroir de DEFAULT_CHECKLIST dans src/lib/domain/checklist.ts). Corrige
-- au passage les checklists restées calées sur une ancienne date de sortie.
update public.checklist_item c
set due_offset = d.offset_days
from (values
  ('Masters finalisés + fichiers prêts', -28),
  ('Pitch playlists éditoriales', -28),
  ('Distribution DSP programmée', -21),
  ('Cover + visuels validés', -21),
  ('Pré-save / smartlink en ligne', -14),
  ('Pitch presse / radios', -14),
  ('Teaser posté sur les réseaux', -7),
  ('Vérifier le lien DSP live', -1),
  ('Post d''annonce + smartlink', 0),
  ('Remercier / reposter les partages', 1),
  ('Bilan chiffres semaine 1', 7),
  ('Relance contenu de traîne', 14),
  ('Bilan de campagne', 21)
) as d(label, offset_days)
where c.label = d.label
  and c.due_date is not null;

-- Backfill 2 : tâches créées à la main → leur écart actuel à la sortie.
update public.checklist_item c
set due_offset = c.due_date - r.release_date
from public.release r
where r.id = c.release_id
  and c.due_offset is null
  and c.due_date is not null;

-- Réaligne les dates des tâches ouvertes sur la sortie. Les tâches cochées
-- gardent leur date (historique de ce qui a été fait) ; leur écart, lui,
-- reste celui du plan → décochées, elles se recalent.
update public.checklist_item c
set due_date = r.release_date + c.due_offset
from public.release r
where r.id = c.release_id
  and c.due_offset is not null
  and not coalesce(c.is_done, false);
