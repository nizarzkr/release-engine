# RELEASE ENGINE — Programme de construction

> Découpage en J-days. Chaque jour = un bloc compréhensible avec ses enjeux et ses décisions d'archi.
> Règle de travail : au début de chaque J-day → on relit le plan, j'explique, tu valides, je code en mode plan. À la fin → mise à jour du `journal.md`.

## Décisions validées (chef de projet)
- **Ordre de build** : Kanban avant IA (l'app est utilisable sans clé API). Validé.
- **Supabase** : le dev crée le projet et applique le schéma via l'outil Supabase connecté.
- **Format daily** : explication des enjeux → validation → code en mode plan.

---

## Philosophie du découpage

Je ne suis PAS le découpage Phase 0→4 du PRD tel quel. Je le ré-agence selon **3 principes** :

1. **La DB et la sécurité d'abord, en un bloc solide.** Le schéma SQL + RLS est le socle. Si on se rate là, tout le reste hérite du problème. On le fait proprement, une fois.

2. **On construit le pipeline AVANT l'IA.** L'IA (Content Engine) ne fait que *remplir* des `content_item`. Si le Kanban, les Source Blocks et la création manuelle de contenus fonctionnent, alors l'IA n'est qu'un "générateur en gros" branché sur une structure qui marche déjà. On dérisque : l'app est utilisable même sans clé API.

3. **La logique métier isolée et testable.** Deux morceaux sont du pur calcul (donc testables sans UI) : le **moteur de timeline** (template → dates relatives) et le **schéma de génération IA** (Zod). On les traite comme des fonctions pures, découplées de React.

---

## Vue d'ensemble

| J-day | Bloc | Enjeu principal | Livrable testable |
|-------|------|-----------------|-------------------|
| **J0** | Fondations & décisions d'archi | Setup propre, choix structurants | App qui tourne en local, page vide |
| **J1** | Base de données & RLS | Le socle sécurisé, isolation par user | Tables créées, types TS, RLS vérifiée |
| **J2** | Auth & Artist Profile | Entrer dans l'app, poser l'ADN artiste | Login Google + formulaire profil qui persiste |
| **J3** | Releases + moteur de timeline | La brique centrale + calcul des dates | Créer une release → dates J-21/J-14/... générées |
| **J4** | Source Blocks | Le chaînon production→diffusion + cascade | Créer un tournage, statut RUSHES_DISPO → cascade |
| **J5** | Pipeline Kanban | Suivi visuel, drag & drop, archivage | Board 4 colonnes, création manuelle de contenus, tags |
| **J6** | Infra IA (BYOK) | Clés chiffrées, abstraction multi-provider | Ajouter/tester une clé API, choisir le provider |
| **J7** | Content Engine — génération | Le cœur "magique" : date → 20-25 contenus | Bouton "Générer le plan" qui remplit le board |
| **J8** | Regénération à la carte | Itération fine sur une idée | Micro-prompt sur une carte → nouvelle version |
| **J9** | Checklists | Rituels pré/post sortie | Templates cochables rattachés à la release |
| **J10** | Dashboard & Calendrier | Vue "quoi faire" + anti-collision | Dashboard hebdo + calendrier multi-release |
| **J11** | Polish & déploiement | Finitions, robustesse, mise en ligne | App déployée sur Vercel, parcours complet |

> Estimation : ~11-12 J-days. On peut fusionner (ex. J7+J8) ou étaler selon ton rythme de test.

---

## Détail par J-day

### J0 — Fondations & décisions d'architecture
**But** : poser un projet propre sur lequel on ne reviendra pas.
- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- Structure de dossiers (`app/`, `lib/`, `components/`, `db/`)
- Projet Supabase créé, variables d'env, client Supabase (server + browser)
- **Décisions à valider ensemble** : conventions de nommage, où vit la logique métier, stratégie Server Components vs Client Components.
- **Enjeu** : un mauvais setup se paie tous les jours suivants.

### J1 — Base de données & RLS
**But** : le socle de données sécurisé.
- Écrire les migrations SQL (7 tables du PRD)
- Activer RLS + policies `own_rows` sur chaque table
- Générer les types TypeScript depuis le schéma
- Seed minimal pour tester
- **Enjeu** : la RLS est la ceinture de sécurité. On vérifie qu'un user ne peut PAS voir les données d'un autre. Non négociable dès la V1.

### J2 — Auth & Artist Profile
**But** : entrer dans l'app et poser l'ADN artistique.
- Auth Supabase : email + OAuth Google, middleware de protection des routes
- Formulaire Artist Profile (1:1 user) : genres, références, DA, **posture image**, plateformes, capacité, contraintes
- **Enjeu** : la posture image (FACE/ANONYME/HYBRIDE) conditionnera les briefs IA. On la modélise proprement dès maintenant.

### J3 — Releases + moteur de timeline
**But** : la brique centrale + le premier vrai morceau de logique métier.
- CRUD Release (titre, type, date, BPM, mood, cover, liens DSP, parent EP)
- **Moteur de timeline** : fonction pure `template → {J-21, J-14, J-7, J-Day, J+X}`, testée isolément
- **Enjeu** : ces ancres de dates serviront à distribuer les contenus. C'est du calcul pur → on le sort de l'UI et on le teste.

### J4 — Source Blocks
**But** : modéliser "un tournage nourrit plusieurs contenus".
- CRUD Source Block (type, date, lien rushes, statut)
- **Comportement clé** : passage à `RUSHES_DISPO` → proposition de basculer tous les content_items liés `À_TOURNER → À_MONTER` en un clic
- **Enjeu** : c'est LE différenciateur produit (relie production et diffusion). La cascade doit être fiable.

### J5 — Pipeline Kanban
**But** : le suivi visuel, utilisable même sans IA.
- Board 4 colonnes (BACKLOG / À_TOURNER / À_MONTER / READY) avec `@hello-pangea/dnd`
- Création/édition **manuelle** de content_items (l'IA viendra les générer en masse plus tard)
- Tags colorés auto, action PUBLIÉ = archivage
- **Enjeu** : valider tout le modèle content_item AVANT d'y brancher l'IA. Si ça marche à la main, ça marchera généré.

### J6 — Infra IA (BYOK)
**But** : la plomberie IA sécurisée, sans encore générer.
- Table `api_key`, chiffrement au repos, UI d'ajout/test de clé
- Abstraction multi-provider (Vercel AI SDK : Anthropic / OpenAI / Google)
- **Enjeu** : sécurité des clés + une couche d'abstraction propre pour ne pas coupler l'app à un seul provider.

### J7 — Content Engine — génération
**But** : le cœur "magique" du produit.
- Schéma Zod `ContentPlanSchema`, `generateObject()`
- System prompt : injection profil + release + thèmes + source blocks ; règles (posture image, distribution sur thèmes/fenêtre, capacité, temps forts, hooks scroll-stopping)
- Bouton "Générer le plan" → ~20-25 items distribués sur la timeline, écrits en DB, affichés sur le board
- **Enjeu** : garantir un JSON non-cassable (Zod) et une distribution intelligente sur la fenêtre.

### J8 — Regénération à la carte
**But** : itérer finement.
- Bouton "Regénérer cette idée" + micro-prompt libre ("plus drôle", "je n'ai pas ce synthé"...)
- Retourne UN seul item régénéré, même thème/contexte
- **Enjeu** : UX de raffinage rapide, sans tout relancer.

### J9 — Checklists
**But** : les rituels de sortie.
- Templates pré-sortie (DSP, playlisting, pitch, visuels) et post-sortie
- Rattachées à la release, cochables, dates relatives
- **Enjeu** : simple, mais c'est ce qui garantit "0 étape oubliée" à chaque sortie.

### J10 — Dashboard & Calendrier
**But** : la vue pilotage.
- Dashboard "quoi faire cette semaine" (items à tourner/monter/publier à échéance proche)
- Calendrier multi-release en lecture seule (chevauchements de fenêtres de promo)
- **Enjeu** : anticiper les collisions dès le single 2. Lecture seule en V1 (le drag cross-release = V2).

### J11 — Polish & déploiement
**But** : rendre l'app fiable et en ligne.
- Gestion d'erreurs, états de chargement, responsive
- Déploiement Vercel + variables d'env prod
- Parcours complet de bout en bout (profil → release → tournage → génération → board → publication)
- **Enjeu** : passer de "ça marche sur ma machine" à "c'est un vrai produit".

---

## Ce qu'on ne fait PAS en V1 (rappel PRD)
- ❌ Publication auto sur réseaux
- ❌ Analytics de perf
- ❌ Montage vidéo intégré
- ❌ Collaboration temps réel
- ❌ Calendrier multi-release avancé (drag cross-release) → V2

---

## Métriques de succès (cap à garder)
- Date de sortie → plan complet en < 10 min
- 0 rush non monté à J+21
- Régularité ≥ 1 post/jour sur la fenêtre active
- Réutilisable sur les 5 releases 2027 sans refonte
