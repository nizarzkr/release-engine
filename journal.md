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

## Prochaine étape : J1 — Schéma DB (7 tables) + RLS + types TypeScript
Base vierge prête. On appliquera les migrations via l'outil Supabase (MCP `apply_migration`), on activera RLS sur chaque table avec le pattern `own_rows` (`auth.uid() = user_id`), puis on générera `src/types/database.types.ts`.
