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

---

## J5 — Pipeline Kanban ✅ CODE COMPLET (test DnD navigateur côté user)
**Date : 2026-07-08** · commit `314b3a9`

### Décisions
- Board **par release** (`/releases/[id]/board`). Ajout **rapide** + édition **complète** (modale). DnD **optimiste**. Tags auto **calculés**.

### Fait
- `@hello-pangea/dnd@18.0.1` (compatible React 19).
- **`lib/domain/content.ts`** : `PIPELINE_STATUSES`/`CONTENT_FORMATS`/`OBJECTIVE_TAGS` + labels, type `Brief`, `QuickContentSchema` + `ContentSchema`, `cardTitle`.
- **`lib/domain/content-tags.ts`** : `computeAutoTags` (pur) — « Rushes manquants » / « Prêt à monter » / « En retard ». **8 tests OK**.
- **`content-actions.ts`** : `createContent` (quick), `updateContent` (full, assemble le brief), `moveContent` (persiste le DnD), `publishContent` (is_published=true), `deleteContent`.
- **UI** : `board/page.tsx` (server : charge contenus non publiés + tournages, calcule tags auto, compteur publiés) ; `kanban-board.tsx` (Client : DragDropContext 4 colonnes, état optimiste + resync sur nouvelles props, quick-add en Backlog) ; `content-card.tsx` (présentation + type `BoardItem`) ; `content-dialog.tsx` (édition complète + publier/supprimer). Lien « Ouvrir le pipeline » depuis la page release.

### Points techniques
- Board client : `useState(group(items))` + `useEffect([items])` pour resync quand le serveur revalide (create/edit/publish/delete/move).
- QuickAdd : reset via `key` incrémenté, dépendance `[state]` (nouvel objet à chaque submit) — pas `[state.ok]` (sinon pas de reset au 2e ajout).
- Pas d'ordre intra-colonne persistant (tri serveur par scheduled_date puis created_at).

### Vérifs passées
- 8/8 tests `computeAutoTags`. `npm run build` OK (route board présente). Runtime : `/releases/[id]/board` → 307 (proxy), 0 erreur serveur.
- **Reste à tester en navigateur** (demain) : DnD entre colonnes + persistance au reload ; ajout rapide ; édition/brief ; cascade J4 → carte À_MONTER ; publier = archiver.

### Cascade J4 ↔ J5
- Le CTA cascade de la section Tournages s'affichera désormais quand un tournage RUSHES_DISPO a des contenus liés À_TOURNER (relier un contenu à un tournage via la modale d'édition de carte).

---

---

## J6 — Infra IA BYOK ✅ CODE COMPLET (test navigateur côté user)
**Date : 2026-07-08** · commit `f689802`

### Décisions
- **Enregistrement sans test réseau** (validation de format légère). Pas de bouton « Tester ».

### Fait
- Deps : `ai@7`, `@ai-sdk/{anthropic,openai,google}@4`, `server-only`.
- **Migration 0004** : `api_key.key_hint` + `unique(user_id, provider)` (→ upsert onConflict). Types régénérés.
- **`lib/crypto.ts`** (server-only) : AES-256-GCM (`iv||authTag||ciphertext` en base64). **4 tests OK** (round-trip, IV aléatoire, falsification rejetée par l'authTag).
- **`lib/ai/config.ts`** (client-safe) : `AI_PROVIDERS` (labels, modèle défaut, préfixe clé, console URL), `validateKeyFormat`, `keyHint`.
- **`lib/ai/providers.ts`** (server-only) : `getModel(provider, apiKey, modelId?)` → `LanguageModel` (Vercel AI SDK). Utilisé en J7.
- **`lib/ai/keys.ts`** (server-only) : `getDecryptedKey` (J7), `listKeyStatuses` (UI — jamais `encrypted_key`).
- **Settings** : `saveApiKey` (upsert chiffré + key_hint), `deleteApiKey` ; page `/settings` + `api-key-form.tsx` (1 carte/provider, champ password, statut ••••hint) ; lien nav « Réglages ».

### Points sécurité
- Clés **chiffrées au repos**, déchiffrées uniquement côté serveur au besoin. `encrypted_key` jamais renvoyé au client (UI ne lit que `provider`/`key_hint`/`updated_at`).
- Modules secrets marqués `import "server-only"`.
- Modèles Claude à utiliser en J7 : `claude-opus-4-8` (défaut), `claude-sonnet-5`, `claude-haiku-4-5`.

### Vérifs passées
- 4/4 tests crypto. `npm run build` OK (route `/settings`). Contrainte unique `(user_id, provider)` confirmée en DB.
- Advisors : **0 alerte sur nos tables**. 1 WARN non lié = « Leaked Password Protection Disabled » (réglage Auth dashboard, HaveIBeenPwned — optionnel à activer par l'utilisateur).

### À tester côté user (navigateur)
- `/settings` : coller une clé (ex. Claude `sk-ant-…`) → « Configurée · ••••xxxx » ; re-coller remplace ; supprimer enlève. Vérifier en DB que `encrypted_key` ≠ la clé en clair.

---

---

## J7 — Content Engine (génération IA) ✅ CODE COMPLET (génération réelle = test user, clé requise)
**Date : 2026-07-08** · commit `11b198c`

### Décisions
- **4 piliers génériques** : Performance / Univers visuel / Coulisses / Storytelling (`DEFAULT_THEMES`).
- **Auto-provider** : Claude > GPT > Gemini (défaut `claude-opus-4-8`). Cartes générées en **Backlog**.

### Fait
- **`lib/domain/content-plan.ts`** : `DEFAULT_THEMES`, `ContentItemSchema` (theme=string libre, format/objective enums, brief 5 champs, `suggested_day_offset`), `ContentPlanSchema`.
- **`lib/ai/prompt.ts`** (PUR) : `buildContentPlanPrompt` — system encode les règles PRD §6.3 (posture image FACE/ANONYME/HYBRIDE, distribution piliers+fenêtre, capacité, temps forts, hook<3s, sons natifs, 20-25 items, bornes offset) ; prompt injecte le contexte §6.2. **9 tests OK**.
- **`generate-actions.ts`** : `generateContentPlan` — provider auto, `generateObject({model:getModel(...), schema})`, map → insert `content_item` (BACKLOG, `scheduled_date = addDays(release_date, clamp(offset))`), messages d'erreur clairs (sans clé / clé invalide).
- **`generate-plan-button.tsx`** : bouton « ✨ Générer le plan », état pending, succès (`N via <provider>`) / erreur.
- **board page** : bouton en-tête + **CTA état vide** + `export const maxDuration = 300` ; sinon lien « Configure une clé IA ».

### Outils de test réutilisables
- Loader Node `@/` + relatifs sans extension : `scratchpad/alias-hooks.mjs` + `alias-register.mjs` → `node --import .../alias-register.mjs test.ts`. (Sert pour tester tout module aliasé, dont J8.)

### Vérifs passées
- 9/9 tests prompt. `npm run build` OK (route board, maxDuration).

### À tester côté user (navigateur, nécessite une clé dans /settings)
- `/releases/[id]/board` → « Générer le plan » → ~20-25 cartes en Backlog (hook/thème/plateforme/brief), `scheduled_date` dans la fenêtre. Vérifier la répartition sur les 4 piliers + la fenêtre.
- Robustesse : sans clé → CTA « Configure une clé » ; clé invalide → message d'erreur (pas de crash).
- ⚠️ Déploiement (J11) : `maxDuration=300` posé, mais Vercel Hobby plafonne ; prévoir un plan adéquat ou un modèle plus rapide si timeout.

---

---

## J8 — Regénération à la carte ✅ CODE COMPLET (regen réelle = test user, clé requise)
**Date : 2026-07-08** · commit `ff7971c`

### Décision
- **Raffiner en place** : thème + `scheduled_date` conservés ; seuls `brief`/`format`/`platform`/`objective_tag` changent.

### Fait
- **`content-plan.ts`** : `RegeneratedItemSchema` (contenu seul, sans theme ni offset).
- **`prompt.ts`** : `profileBlock` factorisé (partagé gen/regen) + `buildRegenPrompt` (garde le pilier, applique la variation, respecte posture image). **6 tests OK**.
- **`generate-actions.ts`** : `pickProvider()` factorisé (utilisé par gen ET regen) + `regenerateContentItem` (update brief/format/platform/objective ; theme & date intacts).
- **`content-dialog.tsx`** : bloc « ✨ Regénérer par IA » (micro-prompt + bouton) en tête de la modale ; ferme sur succès → la carte se rafraîchit.

### Vérifs passées
- 6/6 tests prompt regen. `npm run build` OK.

### À tester côté user (clé requise)
- Ouvrir une carte → micro-prompt « version plus courte » → Regénérer → nouveau brief, **même thème + même date**. Vérifier en DB que `theme`/`scheduled_date` inchangés.

---

## MEGA TEST prévu par le chef de projet avant de continuer
L'utilisateur veut tester J2→J8 en conditions réelles (navigateur + clé Claude). Prérequis : « Confirm email » désactivé (ou confirmer via lien), une clé dans /settings.

---

## J9 — Checklists pré/post-sortie ✅ CODE COMPLET (sans dépendance IA)
**Date : 2026-07-08** · commit `875ddad`

### Décisions
- **Template générique adopté** (13 tâches). **Bouton explicite** « Ajouter la checklist type » (pas d'auto-insertion). Section sur la page détail release (sous Tournages).

### Fait
- **`lib/domain/checklist.ts`** : `CHECKLIST_PHASES` (PRE/POST), `DEFAULT_CHECKLIST` (13 tâches avec offsets), `checklistRowsForRelease` (pure, dates via `addDays`). **6 tests OK**.
- **`checklist-actions.ts`** : `seedChecklist` (applique le template), `addChecklistItem`, `toggleChecklistItem`, `deleteChecklistItem`.
- **`checklist-section.tsx`** (Server) : état vide + bouton seed ; groupes PRE/POST ; cochage **sans JS client** (boutons dans des forms à action liée) ; progression X/Y ; ajout/suppression de tâche. Intégrée dans la page détail release.

### Vérifs passées
- 6/6 tests `checklistRowsForRelease` (J-28 → 2027-01-03, J-Day → date sortie, J+21 → +21j ; 9 PRE / 4 POST). `npm run build` OK.
- Module **testable pleinement sans clé IA** (juste besoin d'être connecté).

### À tester côté user
- Release → section Checklist → « Ajouter la checklist type » → 13 tâches datées ; cocher/décocher ; ajouter/supprimer.

---

---

## J10 — Dashboard & Calendrier multi-release ✅ CODE COMPLET (sans dépendance IA)
**Date : 2026-07-09** · commit `70df573`

### Décisions
- Dashboard : **horizon 14 jours glissants + retards**. Calendrier : **timeline horizontale / Gantt** (lecture seule).

### Fait
- **`timeline.ts`** : `daysBetween` (UTC). **`calendar.ts`** : `buildCalendarModel` (PUR) → barres (`leftPct/widthPct`), `markerPct` (jour de sortie), `todayPct`, ticks de mois. **12 tests OK** (dont chevauchement).
- **`dashboard/page.tsx`** (réécrit) : « quoi faire » cross-release — `content_item` (non publiés, `scheduled_date <= J+14`) + `checklist_item` (non faits, `due_date <= J+14`), split **En retard** / **À venir**, liens vers board/release, état vide.
- **`calendar/page.tsx`** + **`release-calendar.tsx`** : Gantt de toutes les releases, chevauchements visibles, marqueur sortie + ligne « aujourd'hui », `overflow-x-auto`. Lien nav **Calendrier**.

### Vérifs passées
- 12/12 tests (`daysBetween` + `buildCalendarModel`). `npm run build` OK (routes `/calendar`, `/dashboard`). Modules **sans dépendance IA**.

### À tester côté user
- Dashboard : items ≤ 14 j + retards, triés, liens OK. Calendrier : barres de fenêtres, chevauchement visible dès 2 releases, ligne aujourd'hui.

---

---

## J11 — Retours mega test : calendrier réel + formats personnalisables 🔬 CODE COMPLET (test navigateur côté user)
**Date : 2026-07-09** · pas encore commité

Suite au mega test, 2 retours utilisateur. Découpage en 3 blocs : **A** (calendrier in-app) + **C** (templates) faits cette session ; **B** (synchro Google Calendar 2 sens, OAuth) planifié — dépend d'une config Google Cloud côté user, app en localhost pour l'instant.

### Bloc A — Vrai calendrier mensuel (remplace le Gantt) ✅
- **`lib/domain/calendar-month.ts`** (PUR) : `buildMonthGrid(year, month, events, today)` → grille semaines lundi→dimanche, nav mois±1 (passage d'année), events rangés par date, `totalEvents` ne compte que le mois. **20 tests OK**.
- **`calendar/page.tsx`** réécrit : agrège 3 sources → events (🟢 sorties, 🔵 contenus non publiés `scheduled_date`, 🟠 checklist non faits `due_date`), mêmes filtres que le dashboard. `?y=&m=` pour naviguer.
- **`release-calendar.tsx`** réécrit en grille (pastilles couleur cliquables → board/release, +N débordement, aujourd'hui entouré, `overflow-x-auto`). **Ancien `lib/domain/calendar.ts` (Gantt) supprimé.**

### Bloc C — Formats de release personnalisables ✅
- **Migration `0005_release_templates`** (appliquée) : table `release_template(user_id, name, description, milestones jsonb, is_builtin)` + trigger updated_at + RLS 4 policies (0 alerte advisor). `release` : drop CHECK `window_template`, **ajout `milestones jsonb`** (snapshot). Backfill des releases existantes (jalons + `window_template` → nom lisible). Types régénérés.
- **Modèle SNAPSHOT** : chaque release fige les jalons du format choisi à la création → éditer/supprimer un format ne casse jamais une release existante (pas de FK, pas de reflow surprise). `window_template` = **nom** du format (libellé libre).
- **`timeline.ts`** : cœur `buildTimelineFromMilestones(milestones, date, label?)` ; `buildTimeline(template, date)` conservé (17 tests) ; export `DEFAULT_TEMPLATES` (3 formats semés).
- **`release-template.ts`** : `MilestoneSchema`/`ReleaseTemplateSchema` (Zod), `templateSummary`, `coerceMilestones` (lecture défensive du JSON DB). **20 tests OK** (avec timeline).
- **`lib/templates.ts`** : `listTemplates()` (server-only) avec **seeding paresseux** des 3 défauts au 1er accès (users existants + nouveaux).
- **`settings/template-actions.ts`** : create/update/delete/duplicate (jalons via tableaux parallèles `m_label/m_offset/m_phase`).
- **UI** : `template-manager.tsx` (liste + dialog éditeur de jalons dynamique) dans `/settings` ; `release-form.tsx` charge les templates (select `template_id`, résolu → snapshot côté action) ; `timeline-view` prend `milestones` ; list/détail affichent le nom du format ; `generate-actions` utilise les jalons snapshot.

### Vérifs passées
- `npm run build` OK (14 routes, TS clean). 20/20 tests calendrier + 20/20 tests templates/timeline. Advisors sécurité : 0 alerte sur les nouvelles tables.

### À tester côté user (navigateur)
- Calendrier : grille mois, nav, 3 types d'events cliquables (validé ✅).
- Réglages → Formats : 3 défauts semés ; créer/éditer/dupliquer/supprimer un format ; créer une release avec un format perso → timeline = jalons du format ; éditer le format ensuite ne doit PAS changer la release déjà créée (snapshot).

---

## Prochaine étape : Bloc B (Google Calendar 2 sens) puis J-polish & déploiement (V1)
- Gestion d'erreurs / états de chargement / responsive ; parcours complet de bout en bout.
- Déploiement Vercel + variables d'env prod (⚠️ `maxDuration` génération IA vs plan Vercel).
- Envisager : activer « Confirm email » Auth, activer Leaked Password Protection (advisor J6).
