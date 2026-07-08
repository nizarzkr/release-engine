import { z } from "zod";

// Colonnes du pipeline Kanban.
export const PIPELINE_STATUSES = [
  "BACKLOG",
  "A_TOURNER",
  "A_MONTER",
  "READY",
] as const;
export type PipelineStatus = (typeof PIPELINE_STATUSES)[number];

export const PIPELINE_LABELS: Record<PipelineStatus, string> = {
  BACKLOG: "Backlog / Idées",
  A_TOURNER: "À tourner",
  A_MONTER: "À monter",
  READY: "Ready",
};

export const CONTENT_FORMATS = ["SHORT", "LONG"] as const;
export type ContentFormat = (typeof CONTENT_FORMATS)[number];
export const FORMAT_LABELS: Record<ContentFormat, string> = {
  SHORT: "Short",
  LONG: "Long",
};

export const OBJECTIVE_TAGS = [
  "DECOUVERTE",
  "IMMERSION",
  "EXPERTISE",
  "CONNEXION",
] as const;
export type ObjectiveTag = (typeof OBJECTIVE_TAGS)[number];
export const OBJECTIVE_LABELS: Record<ObjectiveTag, string> = {
  DECOUVERTE: "Découverte",
  IMMERSION: "Immersion",
  EXPERTISE: "Expertise",
  CONNEXION: "Connexion",
};

// Brief IA (stocké en jsonb dans content_item.brief).
export type Brief = {
  hook: string;
  concept: string;
  structure: string;
  sound_suggestion: string;
  cta: string;
};

export const EMPTY_BRIEF: Brief = {
  hook: "",
  concept: "",
  structure: "",
  sound_suggestion: "",
  cta: "",
};

// Ajout rapide (colonne Backlog) : le minimum vital.
export const QuickContentSchema = z.object({
  hook: z
    .string()
    .min(1, { error: "Un intitulé est requis." })
    .max(300),
  theme: z.string().min(1, { error: "Le thème est requis." }).max(120),
  platform: z.string().max(120).nullable(),
  pipeline_status: z.enum(PIPELINE_STATUSES),
});

// Édition complète.
export const ContentSchema = z.object({
  theme: z.string().min(1, { error: "Le thème est requis." }).max(120),
  format: z.enum(CONTENT_FORMATS),
  platform: z.string().max(120).nullable(),
  objective_tag: z.enum(OBJECTIVE_TAGS).nullable(),
  brief: z.object({
    hook: z.string().max(300),
    concept: z.string().max(2000),
    structure: z.string().max(2000),
    sound_suggestion: z.string().max(500),
    cta: z.string().max(300),
  }),
  pipeline_status: z.enum(PIPELINE_STATUSES),
  scheduled_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Date invalide." })
    .nullable(),
  assignee: z.string().max(120).nullable(),
  source_block_id: z.uuid().nullable(),
  tags: z.array(z.string()),
});

export type ContentInput = z.infer<typeof ContentSchema>;

/** Titre affiché sur une carte : le hook, sinon le thème. */
export function cardTitle(item: { brief: unknown; theme: string }): string {
  const brief = (item.brief ?? {}) as Partial<Brief>;
  return brief.hook?.trim() || item.theme;
}
