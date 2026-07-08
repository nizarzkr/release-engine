import { addDays } from "./timeline";

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
    due_date: addDays(releaseDate, t.offset),
  }));
}
