import { z } from "zod";
import { CONTENT_FORMATS, OBJECTIVE_TAGS } from "./content";

// 4 piliers de contenu génériques (décision produit). Configurables plus tard.
export const DEFAULT_THEMES = [
  "Performance",
  "Univers visuel",
  "Coulisses",
  "Storytelling",
] as const;

// Schéma de sortie IA (PRD §6.1, adapté : theme en string libre parmi les
// piliers injectés — la colonne DB content_item.theme est du texte).
export const ContentItemSchema = z.object({
  theme: z.string().describe("Un des piliers de contenu fournis"),
  format: z.enum(CONTENT_FORMATS),
  platform: z.string().describe("Plateforme cible (parmi celles de l'artiste)"),
  objective_tag: z.enum(OBJECTIVE_TAGS),
  brief: z.object({
    hook: z.string().describe("Accroche scroll-stopping (< 3 secondes)"),
    concept: z.string(),
    structure: z.string(),
    sound_suggestion: z.string().describe("Son natif / trend cohérent"),
    cta: z.string(),
  }),
  suggested_day_offset: z
    .number()
    .describe("Jours relatifs à la sortie (négatif = avant, 0 = J-Day)"),
});

export const ContentPlanSchema = z.object({
  items: z.array(ContentItemSchema),
});

export type GeneratedContentItem = z.infer<typeof ContentItemSchema>;
export type ContentPlan = z.infer<typeof ContentPlanSchema>;

// Regénération d'UNE carte : on ne touche ni au pilier (theme) ni à la date
// (suggested_day_offset) → schéma réduit au contenu.
export const RegeneratedItemSchema = z.object({
  format: z.enum(CONTENT_FORMATS),
  platform: z.string(),
  objective_tag: z.enum(OBJECTIVE_TAGS),
  brief: z.object({
    hook: z.string().describe("Accroche scroll-stopping (< 3 secondes)"),
    concept: z.string(),
    structure: z.string(),
    sound_suggestion: z.string(),
    cta: z.string(),
  }),
});

export type RegeneratedItem = z.infer<typeof RegeneratedItemSchema>;
