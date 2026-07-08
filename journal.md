# Journal de bord — Release Engine

> Mémoire du projet. Relire ce fichier au début de chaque session pour retrouver le contexte.
> Cf. `PROGRAMME.md` pour le découpage complet en J-days.

## Rôles
- **Chef de projet** : Nizar (musicien, l'utilisateur). Décide direction et archi, teste chaque étape.
- **Dev** : Claude. Explique les enjeux → fait valider → code en mode plan.

## Décisions structurantes
- Ordre de build : **Kanban avant IA** (l'app doit être utilisable sans clé API).
- **Supabase** : géré par le dev via l'outil connecté (MCP reconnecté au compte de l'utilisateur avec l'org **MUSIC STUFF**).
  - Projet : **RELEASE OS** — ref `tpgaknattgjojmbiubmf`, région **eu-west-1** (Irlande), Postgres 17, `ACTIVE_HEALTHY`.
  - URL : `https://tpgaknattgjojmbiubmf.supabase.co`. Clé utilisée : **publishable** (`sb_publishable_...`), pas la legacy anon.
  - (L'ancien compte `nizarzkr's Org` était bloqué à 2 projets gratuits — abandonné.)
- Stack : Next.js 16 (App Router) + TS + Tailwind v4 + shadcn/ui + Supabase.

## Spécificités techniques repérées (Next.js 16)
- **`middleware.ts` → `proxy.ts`** : le middleware s'appelle désormais Proxy (même rôle). Impacte le refresh de session Supabase en **J2**.
- **Tailwind v4** : config en CSS (`@import "tailwindcss"` dans `globals.css`), plus de `tailwind.config.js`.
- **`cookies()` est async** : les clients Supabase serveur sont `async`.
- Docs de la version embarquées dans `node_modules/next/dist/docs/` — à consulter en cas de doute (breaking changes vs. training data).

## Architecture posée
```
src/
  app/              # routes (App Router) — landing en place
  components/ui/    # shadcn : button, input, label, card, dialog, select, textarea, sonner, badge
  lib/
    supabase/       # server.ts (async, cookies) + client.ts (browser)
    domain/         # LOGIQUE MÉTIER PURE — timeline.ts (J3), content-plan.ts (J7) à venir
    utils.ts        # cn() de shadcn
  types/            # database.types.ts généré en J1
```
Principe : Server Components par défaut (lecture), Client Components pour l'interactif. Logique métier découplée dans `lib/domain`.

---

## J0 — Fondations & archi ✅ COMPLET
**Date : 2026-07-08**

### Fait
- Scaffold Next.js 16 (App Router, TS, Tailwind v4, ESLint, alias `@/*`, `src/`).
  - ⚠️ Dossier de travail = `release os` (avec espace). npm refuse ce nom de package → scaffold fait dans un temp `release-engine`, contenu déplacé, `package.json.name = "release-engine"`.
- shadcn/ui initialisé + 9 composants de base.
- Clients Supabase `server.ts` / `client.ts` écrits.
- Structure de dossiers `lib/domain`, `lib/supabase`, `types` (README documentant leur rôle).
- Landing minimale + métadonnées `Release Engine`, `lang="fr"`.
- `.env.example` (versionné) + `.env.local` (ignoré, placeholders vides). `.gitignore` : exception `!.env.example`.
- **Build OK** (TypeScript clean), **dev server HTTP 200**, landing rendue.
- `git init` + commit initial `5316863`.

### Supabase (fait)
- MCP reconnecté au bon compte (org MUSIC STUFF), projet **RELEASE OS** utilisé (déjà créé par l'utilisateur).
- `.env.local` rempli : URL + clé publishable + `BYOK_ENCRYPTION_KEY` (généré via `openssl rand -base64 32`).
- Connectivité vérifiée : `/auth/v1/health` → 200 avec la clé publishable. Base vide (0 table).

### Vérif utilisateur
- `cd "release os" && npm run dev` → http://localhost:3000 affiche la landing "Release Engine".

---

---

## J1 — Schéma DB + RLS + types ✅ COMPLET
**Date : 2026-07-08** · commit `2f89f5e`

### Fait
- **3 migrations versionnées** dans `supabase/migrations/` (source de vérité) + appliquées sur le projet distant via MCP :
  - `0001_init_schema` : 7 tables PRD + `updated_at` sur chacune + fonction `set_updated_at()` + triggers + index (`user_id` et toutes les FKs).
  - `0002_rls_policies` : RLS + `GRANT ... TO authenticated` + **4 policies par table** (`own_select/insert/update/delete`), pattern `TO authenticated` + `(select auth.uid()) = user_id`, UPDATE avec `USING` + `WITH CHECK`.
  - `0003_harden_rls_auto_enable` : `revoke execute` sur la fonction event-trigger préexistante `rls_auto_enable()` (fermeture surface RPC).
- **Types TS générés** → `src/types/database.types.ts`. Clients Supabase typés `<Database>`.

### Découvertes / notes
- Le projet a un **event-trigger `rls_auto_enable()`** qui active la RLS sur toute nouvelle table automatiquement (rls_enabled=true dès la création). On applique quand même `enable row level security` dans la migration (idempotent + reproductible ailleurs).
- `text + CHECK` conservé (pas d'enums Postgres) comme le PRD.

### Vérifications passées
- `list_tables` : 7 tables, RLS active. `pg_policies` : 4 policies/table.
- **Test d'isolation RLS** (2 users simulés) : user A voit 1 ligne, user B voit 0 ; insertion usurpée par B → bloquée (`violates row-level security policy`). Données de test nettoyées (base à 0 ligne).
- `get_advisors security` : **0 alerte**.
- `npm run build` : OK avec clients typés.

### Rappel régénération des types
Après **toute** future migration : relancer `generate_typescript_types` et remplacer `src/types/database.types.ts`.

---

## Prochaine étape : J2 — Auth (login email + Google OAuth) + Artist Profile
- Auth Supabase avec `@supabase/ssr` ; refresh de session via **`proxy.ts`** (ex-middleware, cf. Next 16).
- Routes protégées, page login, callback OAuth.
- Création de la ligne `artist_profile` côté app (décision J1) + formulaire de profil (DA, posture image, capacité…).
