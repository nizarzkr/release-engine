-- ============================================================
-- Release Engine — Migration 0002 : RLS + policies
-- Isolation stricte par utilisateur sur les 7 tables.
-- Pattern (doc Supabase) : TO authenticated + (select auth.uid()) = user_id.
-- UPDATE avec USING + WITH CHECK. Aucune policy anon.
-- ============================================================

do $$
declare
  t text;
  tables text[] := array[
    'artist_profile','release','source_block','content_item',
    'checklist_item','content_theme','api_key'
  ];
begin
  foreach t in array tables loop
    -- RLS explicite (idempotent : le projet l'active déjà via event trigger,
    -- mais on le rend reproductible sur n'importe quel environnement).
    execute format('alter table public.%I enable row level security', t);

    -- Accès table-level réservé au rôle authenticated (jamais anon).
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);

    execute format(
      $f$create policy "own_select" on public.%I
        for select to authenticated
        using ((select auth.uid()) = user_id)$f$, t);

    execute format(
      $f$create policy "own_insert" on public.%I
        for insert to authenticated
        with check ((select auth.uid()) = user_id)$f$, t);

    execute format(
      $f$create policy "own_update" on public.%I
        for update to authenticated
        using ((select auth.uid()) = user_id)
        with check ((select auth.uid()) = user_id)$f$, t);

    execute format(
      $f$create policy "own_delete" on public.%I
        for delete to authenticated
        using ((select auth.uid()) = user_id)$f$, t);
  end loop;
end $$;
