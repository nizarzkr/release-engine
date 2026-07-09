# 🎬 Mega Test E2E — Release Engine (J2 → J10)

App de gestion de sorties musicales. Parcours complet : inscription → dashboard cross-release.

**Prérequis**
- Serveur : http://localhost:3000
- Clé API Claude (`sk-ant-…`) requise pour Phases 6, 7, 10 (le reste marche sans).
- À confirmer Phase 1 : réglage Supabase "Confirm email" (ON = mail de confirmation, OFF = login direct).

**Retour attendu par phase** : ✅ OK ou ❌ + ce que tu as vu. Note aussi l'UX (lenteur, libellés confus, erreurs console).

---

## Phase 0 — Landing & protection des routes
- [ ] http://localhost:3000 → redirige vers `/login`
- [ ] `/dashboard` sans compte → redirige vers `/login`

## Phase 1 — Inscription (J2)
- [ ] `/login` → mode Inscription
- [ ] Email `nizarmgmt+test1@gmail.com`, mdp ≥ 6 car.
- [ ] Résultat : onboarding direct (Confirm email OFF) OU "vérifie tes mails" (ON) → **note lequel**

## Phase 2 — Profil artiste (J2)
Nom `NOVA` · Genres `électro, pop` · Réfs `Fred again, Jamie xx` · DA `néon, nuit, minimal`
Posture **Face caméra** · Plateformes `TikTok, Instagram, YouTube` · Capacité `4` · Contraintes `pas de danse, pas de lip-sync`
- [ ] Validation → dashboard affiche "NOVA"
- [ ] `/profile` : capacité → `5`, enregistrer, revenir → persistée

## Phase 3 — Release + timeline (J3)
Titre `Midnight` · SINGLE · date **2026-08-07** · **MARATHON** · BPM `124` · Mood `nocturne`
- [ ] Détail affiche la timeline colorée (J-35 ≈ 3 juil, J-Day = 7 août)
- [ ] Éditer date → **2026-08-14** → timeline décalée d'une semaine

## Phase 4 — EP ↔ singles (J3)
- [ ] Release `Aurora` · EP · **2026-09-25** · IMPACT
- [ ] Release `Aurora - Track 1` · SINGLE · rattachée à l'EP Aurora
- [ ] Le single apparaît sous l'EP

## Phase 5 — Tournages + statuts (J4)
Sur Midnight, section Tournages :
- [ ] Ajouter CLIP_SHOOT `Tournage clip néon` + date
- [ ] Statut PLANIFIÉ → TOURNÉ → RUSHES DISPO

## Phase 6 — Clé IA (J6) 🔑
- [ ] `/settings` : coller clé Claude → "Configurée · ••••xxxx"
- [ ] Re-coller autre valeur → remplace
- [ ] Supprimer → revient à non configurée

## Phase 7 — Génération IA du plan (J7) 🔑
Board de Midnight :
- [ ] ✨ Générer le plan → 20-25 cartes en Backlog
- [ ] Réparties sur 4 piliers, dans la fenêtre
- [ ] Briefs respectent Face caméra + contraintes (pas de danse/lip-sync)
- [ ] Robustesse : sans clé → "Configure une clé IA" (pas de crash)

## Phase 8 — Kanban DnD (J5)
- [ ] Glisser une carte Backlog → À tourner → À monter → Prêt
- [ ] F5 → carte reste dans sa colonne (persistance)
- [ ] Ajout rapide en Backlog
- [ ] Éditer une carte + la relier au tournage "Tournage clip néon"
- [ ] Publier une carte → disparaît + compteur publiés +1

## Phase 9 — Cascade rushes → montage (J4↔J5)
- [ ] Carte reliée au tournage, en "À tourner", tournage RUSHES DISPO
- [ ] CTA cascade visible → clic
- [ ] Cartes liées basculent en "À monter", non liées ne bougent pas

## Phase 10 — Regénération à la carte (J8) 🔑
- [ ] Carte → ✨ Regénérer, prompt `version plus courte, plus punchy`
- [ ] Brief change, thème + date inchangés

## Phase 11 — Checklists (J9)
- [ ] Ajouter la checklist type → 13 tâches datées (9 PRE / 4 POST)
- [ ] Cocher/décocher → progression X/Y à jour
- [ ] Ajouter puis supprimer une tâche perso

## Phase 12 — Dashboard cross-release (J10)
- [ ] `/dashboard` : split En retard / À venir sur 14 j
- [ ] Mélange contenus non publiés + checklist non faits
- [ ] Liens vers board / release fonctionnels

## Phase 13 — Calendrier / Gantt (J10)
- [ ] `/calendar` : 3 releases en barres horizontales
- [ ] Chevauchement visible + marqueur sortie + ligne "aujourd'hui"

## Phase 14 — Déconnexion / reconnexion
- [ ] Déconnexion (nav)
- [ ] `/dashboard` rebloque vers `/login`
- [ ] Reconnexion → profil + 3 releases + cartes + checklist toujours là

---

### Points à surveiller partout
Erreurs console · écrans qui crashent · lenteurs · libellés confus · données qui disparaissent.
