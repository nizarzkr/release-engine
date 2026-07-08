-- ============================================================
-- Release Engine — Migration 0003 : durcissement
-- La fonction event-trigger public.rls_auto_enable() (SECURITY DEFINER,
-- préexistante sur le projet) est appelable via /rest/v1/rpc par anon/
-- authenticated. Un event trigger s'exécute indépendamment des GRANTs, donc
-- révoquer EXECUTE ne casse rien mais ferme la surface d'attaque RPC.
-- Réf : lint 0028 / 0029 (anon/authenticated_security_definer_function_executable).
-- ============================================================

revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.rls_auto_enable() from authenticated;
