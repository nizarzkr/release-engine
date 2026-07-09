# Déploiement — Release Engine (V1)

Cible : **Vercel** (Next.js) + Supabase (déjà hébergé). Chemin : GitHub → Vercel.

## Prérequis
- Repo GitHub (privé recommandé).
- Compte Vercel (connecté à ton GitHub).
- Les secrets de `.env.local` sous la main.

## 1. Pousser le code sur GitHub
```bash
gh repo create release-engine --private --source=. --push
```
(`.env.local` est gitignored → les secrets ne partent pas.)

## 2. Importer dans Vercel
- Vercel → **Add New… → Project** → importe le repo.
- Framework détecté : **Next.js** (aucun réglage build à changer).
- **Environment Variables** (Production + Preview) :

| Variable | Source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` |
| `BYOK_ENCRYPTION_KEY` | `.env.local` (⚠️ **exactement la même** — sinon clés IA illisibles) |
| `GOOGLE_CLIENT_ID` | `.env.local` |
| `GOOGLE_CLIENT_SECRET` | `.env.local` |

- **Deploy**. Note l'URL prod (ex. `https://release-engine.vercel.app`).

## 3. Supabase — autoriser le domaine prod
Dashboard Supabase → **Authentication → URL Configuration** :
- **Site URL** = `https://TON-DOMAINE.vercel.app`
- **Redirect URLs** : ajoute `https://TON-DOMAINE.vercel.app/**`

## 4. Google Cloud — redirect URI prod
Console → **Identifiants → ton client OAuth** → **URI de redirection autorisés**, ajoute (garde localhost) :
```
https://TON-DOMAINE.vercel.app/auth/google/callback
```
> App toujours en mode *testing* : `nizarmgmt@gmail.com` doit rester utilisateur test. Pour un usage public : passer l'écran de consentement en *Production* (vérification Google).

## 5. ⚠️ Génération IA & timeout
La route `board` pose `maxDuration = 300`. **Vercel Hobby plafonne les fonctions** (~60 s) → la génération d'un plan complet peut être coupée.
Options : plan **Pro** (300 s), OU modèle plus rapide (`claude-haiku-4-5`) pour la génération, OU réduire le nombre d'items.

## 6. Vérif post-déploiement
- Créer un compte (⚠️ « Confirm email » Supabase : activé ? sinon le signup connecte direct).
- Onboarding → release → génération IA → board → checklist → calendrier.
- Connecter Google Agenda depuis le domaine prod → agenda peuplé.
- Mobile : header (menu ☰), calendrier (scroll), board (colonnes empilées).

## Redéploiement
Chaque `git push` sur la branche par défaut redéploie automatiquement.
