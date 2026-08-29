// Jalons d'une release : réordonnancement à la souris et passerelle vers les
// cartes de contenu. Logique métier PURE (aucune dépendance React/DB).
import { z } from "zod";
import {
  addDays,
  daysBetween,
  type MilestoneDef,
  type MilestonePhase,
} from "./timeline";

/** Écart par défaut (en jours) quand on dépose un jalon en tête ou en queue. */
const EDGE_GAP = 7;

/**
 * Phase déduite de la position par rapport au jour de sortie.
 * Un jalon posé pile le jour J appartient à la phase DAY, comme la sortie.
 */
export function phaseForOffset(offset: number): MilestonePhase {
  if (offset < 0) return "PRE";
  if (offset > 0) return "POST";
  return "DAY";
}

/**
 * Ordre d'affichage : du plus tôt au plus tard. `sort` étant stable, deux
 * jalons le même jour gardent l'ordre dans lequel ils ont été rangés.
 */
export function sortMilestones(milestones: MilestoneDef[]): MilestoneDef[] {
  return [...milestones].sort((a, b) => a.offset - b.offset);
}

/** Le jalon « Sortie » : ancre de la timeline, non déplaçable. */
export function isAnchor(milestone: MilestoneDef): boolean {
  return milestone.offset === 0 && milestone.phase === "DAY";
}

/** Date réelle d'un jalon (YYYY-MM-DD). */
export function milestoneDate(
  milestone: MilestoneDef,
  releaseDate: string,
): string {
  return addDays(releaseDate, milestone.offset);
}

/** Offset correspondant à une date absolue choisie dans le formulaire. */
export function offsetForDate(releaseDate: string, date: string): number {
  return daysBetween(releaseDate, date);
}

/**
 * Offset attribué à un jalon déposé entre `prev` et `next` : le milieu des
 * deux voisins. Aux extrémités, on prend une semaine de marge. `fallback`
 * sert quand le jalon est seul dans la liste.
 */
function offsetBetween(
  prev: MilestoneDef | undefined,
  next: MilestoneDef | undefined,
  fallback: number,
): number {
  if (!prev && !next) return fallback;
  if (!prev) return next!.offset - EDGE_GAP;
  if (!next) return prev!.offset + EDGE_GAP;
  return Math.round((prev.offset + next.offset) / 2);
}

/**
 * Déplace un jalon de `fromIndex` à `toIndex` dans la liste TRIÉE, et redate
 * le jalon en conséquence : sa position EST sa date. Les index suivent la
 * convention de @hello-pangea/dnd (`toIndex` = index après retrait).
 * Renvoie null si le déplacement est sans effet ou hors limites.
 */
export function reorderMilestones(
  milestones: MilestoneDef[],
  fromIndex: number,
  toIndex: number,
): { milestones: MilestoneDef[]; moved: MilestoneDef } | null {
  const sorted = sortMilestones(milestones);
  const moved = sorted[fromIndex];
  if (!moved || fromIndex === toIndex) return null;
  if (toIndex < 0 || toIndex >= sorted.length) return null;

  const rest = sorted.filter((_, i) => i !== fromIndex);
  const offset = offsetBetween(rest[toIndex - 1], rest[toIndex], moved.offset);
  const updated: MilestoneDef = {
    ...moved,
    offset,
    phase: phaseForOffset(offset),
  };

  rest.splice(toIndex, 0, updated);
  return { milestones: rest, moved: updated };
}

/** Remplace un jalon par sa version éditée, en gardant la liste triée. */
export function replaceMilestone(
  milestones: MilestoneDef[],
  updated: MilestoneDef,
): MilestoneDef[] {
  return sortMilestones(
    milestones.map((m) => (m.key === updated.key ? updated : m)),
  );
}

/**
 * Champs de la carte kanban pilotés par le jalon. Volontairement minimal :
 * le jalon porte le titre et la date, tout le reste (concept, format,
 * plateforme, brief) vit dans la carte et n'est jamais écrasé.
 */
export function milestoneCardFields(
  milestone: MilestoneDef,
  releaseDate: string,
): { theme: string; scheduled_date: string } {
  return {
    theme: milestone.label,
    scheduled_date: milestoneDate(milestone, releaseDate),
  };
}

/**
 * Édition d'un jalon depuis la timeline. Volontairement minimal : un titre et
 * une date. La case `create_card` déclenche la création de la carte kanban
 * (décochée par défaut : on ne pollue le board que sur geste explicite).
 */
export const MilestoneEditSchema = z.object({
  label: z
    .string()
    .min(1, { error: "Le titre du jalon est requis." })
    .max(60, { error: "Titre trop long (60 caractères max)." }),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Date invalide." }),
  create_card: z.boolean(),
});

export type MilestoneEditInput = z.infer<typeof MilestoneEditSchema>;
