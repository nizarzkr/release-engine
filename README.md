# Release OS — Le pipeline de sortie d'un artiste indépendant

**Un artiste indépendant entre une date de sortie. L'outil en déduit tout le rétroplanning de communication, génère 20 à 25 contenus à produire, et les pousse dans un Kanban qu'il n'a plus qu'à dérouler.**

Le problème n'est pas « quoi poster ». C'est qu'entre J-21 et J+14, un artiste sans équipe doit tenir un calendrier de contenu tout en produisant la musique — et il craque au premier imprévu.

> Produit conçu, spécifié et construit de bout en bout par [@nizarzkr](https://github.com/nizarzkr). Le code a été écrit avec Claude Code ; le découpage produit, le modèle de données et les arbitrages d'architecture sont les miens.

---

## Ce que fait le produit

| Brique | Rôle |
|---|---|
| **Profil artiste** | L'ADN de l'artiste (ton, univers, plateformes), réinjecté dans chaque génération pour que les contenus ne sonnent pas génériques. |
| **Releases + moteur de timeline** | Une date de sortie → des jalons relatifs calculés automatiquement (J-21, J-14, J-7, J0, J+7…). Pure logique métier, testable sans UI. |
| **Source Blocks** | Le chaînon manquant entre production et diffusion : un tournage ou une séance photo passe en `RUSHES_DISPO`, et tous les contenus qui en dépendent se débloquent en cascade. |
| **Pipeline Kanban** | Board 4 colonnes, drag & drop, tags, archivage. Utilisable à la main, sans aucune IA. |
| **Content Engine** | Génère 20-25 contenus datés et cadrés à partir de la release et du profil artiste. Sortie contrainte par un schéma Zod. |
| **Regénération à la carte** | Micro-prompt sur une seule carte pour itérer sur une idée sans tout refaire. |
| **Checklists** | Rituels pré et post-sortie, rattachés à la release. |
| **Dashboard + Calendrier** | Vue « quoi faire cette semaine » et calendrier multi-release avec détection de collisions. |

## Décisions d'architecture notables

Le découpage du build répond à trois principes, documentés jour par jour dans [`PROGRAMME.md`](./PROGRAMME.md) :

1. **La base de données et la sécurité d'abord, en un bloc.** Le schéma SQL + RLS est le socle : se rater là contamine tout le reste. Fait proprement, une fois.

2. **Le pipeline avant l'IA.** L'IA ne fait que *remplir* des `content_item`. Si le Kanban, les Source Blocks et la création manuelle fonctionnent, l'IA n'est plus qu'un générateur en gros branché sur une structure qui marche déjà. Conséquence : **l'app est utilisable sans clé API**, ce qui dérisque entièrement le produit.

3. **La logique métier isolée et testable.** Le moteur de timeline (template → dates relatives) et le schéma de génération sont du pur calcul, découplés de React — donc vérifiables sans monter l'UI.

**BYOK (Bring Your Own Key)** : l'utilisateur fournit sa propre clé API, chiffrée en base, avec une abstraction multi-provider (Anthropic, OpenAI, Google). Le coût variable de l'IA ne pèse donc pas sur le modèle économique — un arbitrage économique autant que technique.

## Stack

Next.js (App Router) + React + TypeScript + Tailwind + shadcn/ui · Supabase (Postgres + Auth + RLS) · Vercel AI SDK (Anthropic / OpenAI / Google) · Zod · `@hello-pangea/dnd` pour le Kanban · Google Calendar (OAuth + sync token) · Vercel.

Le schéma est piloté par des migrations SQL numérotées dans `supabase/migrations/`, avec RLS et isolation par utilisateur.

## Démarrage local

```bash
npm install
cp .env.example .env.local   # puis remplir chaque clé
npm run dev                  # http://localhost:3000
```

Autres scripts : `npm run build`, `npm run start`, `npm run lint`.

`.env.local` n'est jamais committé. Déploiement : voir [`DEPLOY.md`](./DEPLOY.md).

> **Note framework** — ce dépôt utilise une version modifiée de Next.js (voir [`AGENTS.md`](./AGENTS.md)). Les conventions peuvent différer de Next.js standard.

## Documentation du dépôt

| Fichier | Contenu |
|---|---|
| [`PROGRAMME.md`](./PROGRAMME.md) | Découpage du build en J-days, avec l'enjeu et le livrable testable de chacun |
| [`journal.md`](./journal.md) | Journal de construction : décisions prises, session par session |
| [`MEGA_TEST_E2E.md`](./MEGA_TEST_E2E.md) | Parcours de test end-to-end complet |
| [`DEPLOY.md`](./DEPLOY.md) | Procédure de déploiement |
| [`src/lib/domain/README.md`](./src/lib/domain/README.md) | La logique métier pure (timeline, cascade, plan de contenu) |
