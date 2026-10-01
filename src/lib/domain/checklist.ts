import { addDays, daysBetween } from "./timeline";

export const CHECKLIST_PHASES = ["PRE", "POST"] as const;
export type ChecklistPhase = (typeof CHECKLIST_PHASES)[number];

export const CHECKLIST_PHASE_LABELS: Record<ChecklistPhase, string> = {
  PRE: "Pré-sortie",
  POST: "Post-sortie",
};

type ChecklistTemplateItem = {
  label: string;
  phase: ChecklistPhase;
  offset: number; // jours relatifs à la sortie (négatif = avant)
};

// Checklist type générique (validée). Éditable ici.
export const DEFAULT_CHECKLIST: ChecklistTemplateItem[] = [
  { label: "Masters finalisés + fichiers prêts", phase: "PRE", offset: -28 },
  { label: "Pitch playlists éditoriales", phase: "PRE", offset: -28 },
  { label: "Distribution DSP programmée", phase: "PRE", offset: -21 },
  { label: "Cover + visuels validés", phase: "PRE", offset: -21 },
  { label: "Pré-save / smartlink en ligne", phase: "PRE", offset: -14 },
  { label: "Pitch presse / radios", phase: "PRE", offset: -14 },
  { label: "Teaser posté sur les réseaux", phase: "PRE", offset: -7 },
  { label: "Vérifier le lien DSP live", phase: "PRE", offset: -1 },
  { label: "Post d'annonce + smartlink", phase: "PRE", offset: 0 },
  { label: "Remercier / reposter les partages", phase: "POST", offset: 1 },
  { label: "Bilan chiffres semaine 1", phase: "POST", offset: 7 },
  { label: "Relance contenu de traîne", phase: "POST", offset: 14 },
  { label: "Bilan de campagne", phase: "POST", offset: 21 },
];

export type ChecklistRow = {
  label: string;
  phase: ChecklistPhase;
  due_offset: number;
  due_date: string;
};

/**
 * Applique le template à une date de sortie → tâches datées.
 * Fonction PURE — testable isolément.
 */
export function checklistRowsForRelease(releaseDate: string): ChecklistRow[] {
  return DEFAULT_CHECKLIST.map((t) => ({
    label: t.label,
    phase: t.phase,
    due_offset: t.offset,
    due_date: addDays(releaseDate, t.offset),
  }));
}

/**
 * Une tâche se cale sur la sortie : sa vraie donnée est `due_offset` (jours
 * relatifs à J-Day), `due_date` n'en est que la traduction. Saisir une date
 * revient donc à fixer un écart.
 */
export function offsetForDueDate(releaseDate: string, dueDate: string): number {
  return daysBetween(releaseDate, dueDate);
}

type PlannedTask = {
  id: string;
  due_offset: number | null;
  due_date: string | null;
  is_done: boolean | null;
};

/**
 * Tâches ouvertes dont la date ne correspond plus à `releaseDate + offset`
 * (sortie déplacée, tâche décochée…) → nouvelle date à écrire. Idempotent :
 * une checklist déjà calée renvoie []. Les tâches cochées gardent leur date
 * (historique) et les tâches sans date restent sans date.
 * Fonction PURE — renvoie uniquement les tâches à mettre à jour.
 */
export function realignChecklist(
  tasks: PlannedTask[],
  releaseDate: string,
): { id: string; due_date: string }[] {
  return tasks.flatMap((t) => {
    if (t.is_done || t.due_offset === null) return [];
    const due_date = addDays(releaseDate, t.due_offset);
    return due_date === t.due_date ? [] : [{ id: t.id, due_date }];
  });
}
