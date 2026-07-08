# Domain — logique métier pure

Ce dossier contient la **logique métier découplée de React et de la DB**.
Fonctions pures, testables isolément, sans dépendance à l'UI ni à Supabase.

Contenu prévu au fil des J-days :

- **`timeline.ts`** (J3) — moteur de fenêtre de sortie : `template (SPRINT|MARATHON|IMPACT)` + `release_date` → dates d'ancrage relatives (J-21, J-14, J-7, J-Day, J+X).
- **`content-plan.ts`** (J7) — schémas Zod (`ContentItemSchema`, `ContentPlanSchema`) et règles de distribution du plan de contenu généré par l'IA.

Règle : rien ici ne doit importer de `next/*`, de composants React, ni de client Supabase.
