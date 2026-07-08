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

---

## J2 — Auth (email+password) + Artist Profile ✅ CODE COMPLET (test flow complet côté user)
**Date : 2026-07-08** · commit `2cc9aec`

### Décisions
- Auth **email + mot de passe** pour démarrer ; **Google OAuth plus tard** (nécessite config Google Cloud côté user).
- Zod v4 installé (`z.email()`, `{ error }`).

### Fait
- **Session/proxy** (Next 16) : `src/proxy.ts` + `src/lib/supabase/proxy.ts` (`updateSession`, `getClaims()`, matcher). Redirige les non-connectés vers `/login`.
- **Login** : `src/app/login/page.tsx` (Client, `useActionState`, bascule connexion/inscription) + `actions.ts` (`login`/`signup`). Routes `auth/callback` (exchangeCodeForSession) et `auth/signout`.
- **Zone protégée** `src/app/(app)/` : `layout.tsx` (garde `getUserOrRedirect` + app shell nav + déconnexion), `lib/auth.ts` (`getUserOrRedirect`, `getProfile`). `dashboard` (gate → onboarding si pas de profil). Racine `/` → redirect `/dashboard`.
- **Artist Profile** : `lib/domain/profile.ts` (Zod `ProfileSchema` + `parseList`/`listToString`), `components/profile-form.tsx` (select natif pour posture image), pages `onboarding` (création) + `profile` (édition), action `saveProfile` (upsert `user_id` posé serveur).

### Vérifs passées
- `npm run build` OK (8 routes + "ƒ Proxy (Middleware)").
- Protection routes : `/dashboard` et `/` → **307 → /login** ; `/login` → 200 avec formulaire. ✅

### ⚠️ À finir de tester (nécessite action user)
- **"Confirm email" est ACTIVÉ** sur le projet Supabase (probe API : signup → user sans session + `confirmation_sent_at`).
  → Pour le flow "signup = login immédiat" en dev : **désactiver** Authentication → Sign In/Providers → Email → *Confirm email*. Sinon, confirmer via le lien reçu par email (la route `auth/callback` gère l'échange de code).
- Ensuite : créer un compte dans le navigateur → onboarding → remplir profil → dashboard affiche le nom d'artiste → déconnexion.

---

---

## J3 — Releases + moteur de timeline ✅ CODE COMPLET (test navigateur côté user)
**Date : 2026-07-08** · commit `353cc61`

### Décisions
- Jalons par template validés (SPRINT pre21/post7 ; MARATHON pre35/post21 ; IMPACT pre56/post28).
- **Cover retirée** du formulaire (colonne `cover_url` conservée mais non exposée).
- Timeline **calculée à la volée** (jamais stockée) → recalcul auto si la date change.

### Fait
- **`lib/domain/timeline.ts`** (moteur PUR) : `buildTimeline`, `addDays` UTC-safe, `formatOffset`, tables `TEMPLATES`/`TEMPLATE_META`. **17 tests unitaires passent** (dates exactes, passage d'année, DST, nb de jalons).
- **`lib/domain/release.ts`** : `ReleaseSchema` (Zod v4) + `parseDspLinks`/`parseOptionalInt`/`parseOptionalText`.
- **`releases/actions.ts`** : `createRelease`/`updateRelease`/`deleteRelease` (user_id posé serveur, RLS).
- **UI** : `release-form.tsx` (partagé création/édition), `timeline-view.tsx` (visualisation jalons colorés par phase), pages `releases` (liste), `new`, `[id]` (détail + timeline + EP↔singles), `[id]/edit`. Nav "Releases" + CTA dashboard. `lib/format.ts` (formatDateFr UTC).

### Piège rencontré / résolu
- Le `Button` shadcn de cette version utilise **Base UI** (pas Radix) → **pas de `asChild`**. Solution : styler les `Link` avec `buttonVariants({variant,size})`. (À réutiliser pour tout lien-bouton.)

### Vérifs passées
- Moteur : 17/17 tests unitaires (via `node` TS natif).
- `npm run build` OK (12 routes).

### À tester côté user (navigateur, serveur dev déjà lancé)
- `/releases` → créer une release MARATHON → détail affiche la timeline correcte ; éditer la date → timeline recalculée ; créer un single rattaché à un EP → visible sous l'EP ; supprimer.

---

---

## J4 — Source Blocks + cascade rushes ✅ CODE COMPLET (test navigateur côté user)
**Date : 2026-07-08** · commit `a7838b5`

### Décisions
- Cascade en **bouton "un clic"** (pas auto). Gestion **dans la page détail release** (section Tournages). Modales **Base UI Dialog**.

### Fait
- **`lib/domain/source-block.ts`** : types (LIVE_SESSION/CLIP_SHOOT/STUDIO_DAY/OTHER), statuts (PLANIFIE/TOURNE/RUSHES_DISPO), labels, `SourceBlockSchema`.
- **`releases/[id]/source-actions.ts`** : `createSourceBlock`/`updateSourceBlock`/`setSourceBlockStatus`/`deleteSourceBlock` + **`promoteRushesToEdit`** (cascade). Actions **sans redirect** → `{ok,error}` + `revalidatePath`.
- **`source-block-dialog.tsx`** (Client) : modale create/edit, contrôlée (`open`/`onOpenChange`), ferme sur `ok`, form remonté (key `openCount`) à chaque ouverture pour reset `useActionState`.
- **`source-blocks-section.tsx`** (Server async) : liste des tournages + badges statut + compteurs de contenus liés + boutons de statut (segmentés) + **CTA cascade** conditionnel (RUSHES_DISPO && À_TOURNER>0). Intégrée dans `releases/[id]/page.tsx`.

### Vérifs passées
- `npm run build` OK.
- **Cascade testée en DB** (scénario 4 contenus) : seuls les contenus **liés** en A_TOURNER basculent en A_MONTER ; le contenu non lié reste A_TOURNER. ✅ Données de test nettoyées.

### Note
- La cascade `promoteRushesToEdit` retourne `void` (compat action de formulaire). En J5, on pourra la wrapper côté client pour un toast "N contenus basculés".
- En J4 le CTA cascade ne s'affiche pas dans l'UI (0 contenu lié) — normal, il s'activera dès J5.

---

## Prochaine étape : J5 — Pipeline Kanban (⭐ rend l'app utilisable sans IA)
- Board 4 colonnes (BACKLOG / À_TOURNER / À_MONTER / READY), `@hello-pangea/dnd`.
- Création/édition **manuelle** de content_items (l'IA les générera en masse en J7).
- Tags colorés auto, action PUBLIÉ = archivage (is_published), lien vers source_block.
- C'est le jour où la cascade J4 s'illumine pour de vrai.
