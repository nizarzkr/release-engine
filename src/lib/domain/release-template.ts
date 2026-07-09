// Formats de release personnalisables — logique métier PURE.
// Un template = un nom + une liste de jalons (label, offset J±, phase).
import { z } from "zod";
import type { MilestoneDef, MilestonePhase } from "./timeline";

export { DEFAULT_TEMPLATES } from "./timeline";

export const MILESTONE_PHASES = ["PRE", "DAY", "POST"] as const;

export const MILESTONE_PHASE_LABELS: Record<MilestonePhase, string> = {
  PRE: "Avant sortie",
  DAY: "Jour J",
  POST: "Après sortie",
};

// Un jalon saisi par l'utilisateur.
export const MilestoneSchema = z.object({
  key: z.string(),
  label: z
    .string()
    .min(1, { error: "Libellé de jalon requis." })
    .max(60, { error: "Libellé trop long." }),
  offset: z
    .number()
    .int({ error: "Offset entier attendu." })
    .min(-365, { error: "Offset trop bas." })
    .max(365, { error: "Offset trop haut." }),
  phase: z.enum(MILESTONE_PHASES),
});

export const ReleaseTemplateSchema = z.object({
  name: z
    .string()
    .min(1, { error: "Le nom du format est requis." })
    .max(80, { error: "Nom trop long." }),
  description: z.string().max(300).nullable(),
  milestones: z
    .array(MilestoneSchema)
    .min(1, { error: "Ajoute au moins un jalon." })
    .max(40, { error: "Trop de jalons (40 max)." }),
});

export type ReleaseTemplateInput = z.infer<typeof ReleaseTemplateSchema>;

/**
 * Résumé d'affichage d'un template : nb de jalons + fenêtre pré/post en jours.
 * Fonction pure — tolère un JSON `milestones` non typé venu de la DB.
 */
export function templateSummary(milestonesJson: unknown): {
  count: number;
  preDays: number;
  postDays: number;
  weeks: number;
} {
  const milestones = coerceMilestones(milestonesJson);
  if (milestones.length === 0) {
    return { count: 0, preDays: 0, postDays: 0, weeks: 0 };
  }
  const offsets = milestones.map((m) => m.offset);
  const first = Math.min(...offsets);
  const last = Math.max(...offsets);
  return {
    count: milestones.length,
    preDays: Math.abs(Math.min(0, first)),
    postDays: Math.max(0, last),
    weeks: Math.max(1, Math.round((last - first) / 7)),
  };
}

/**
 * Convertit un JSON DB (`Json`) en jalons typés, en ignorant les entrées
 * malformées. Sécurise toute lecture de `release.milestones` / template.
 */
export function coerceMilestones(json: unknown): MilestoneDef[] {
  if (!Array.isArray(json)) return [];
  const out: MilestoneDef[] = [];
  for (const raw of json) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const offset = Number(r.offset);
    const phase = r.phase;
    if (
      typeof r.label !== "string" ||
      !Number.isFinite(offset) ||
      (phase !== "PRE" && phase !== "DAY" && phase !== "POST")
    ) {
      continue;
    }
    out.push({
      key: typeof r.key === "string" ? r.key : String(out.length),
      label: r.label,
      offset: Math.trunc(offset),
      phase,
    });
  }
  return out;
}
