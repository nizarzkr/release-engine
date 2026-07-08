import type { PipelineStatus } from "./content";

export type AutoTagTone = "warning" | "info" | "danger";
export type AutoTag = { label: string; tone: AutoTagTone };

export type AutoTagContext = {
  pipeline_status: PipelineStatus;
  source_block_id: string | null;
  scheduled_date: string | null;
  is_published: boolean;
  /** Statut du tournage lié (null si aucun tournage). */
  sourceBlockStatus: string | null;
};

/**
 * Tags contextuels calculés (jamais stockés) → toujours à jour.
 * `today` au format YYYY-MM-DD.
 */
export function computeAutoTags(ctx: AutoTagContext, today: string): AutoTag[] {
  const tags: AutoTag[] = [];

  // À monter mais les rushes ne sont pas dispo → alerte.
  if (
    ctx.pipeline_status === "A_MONTER" &&
    (!ctx.source_block_id || ctx.sourceBlockStatus !== "RUSHES_DISPO")
  ) {
    tags.push({ label: "Rushes manquants", tone: "warning" });
  }

  // Encore à tourner alors que les rushes du tournage lié sont dispo → nudge.
  if (
    ctx.pipeline_status === "A_TOURNER" &&
    ctx.source_block_id &&
    ctx.sourceBlockStatus === "RUSHES_DISPO"
  ) {
    tags.push({ label: "Prêt à monter", tone: "info" });
  }

  // Échéance passée et pas encore publié → en retard.
  if (
    ctx.scheduled_date &&
    ctx.scheduled_date < today &&
    !ctx.is_published
  ) {
    tags.push({ label: "En retard", tone: "danger" });
  }

  return tags;
}
