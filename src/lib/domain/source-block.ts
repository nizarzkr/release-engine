import { z } from "zod";

// Un tournage alimente N contenus. Type = nature de la session de captation.
export const SOURCE_BLOCK_TYPES = [
  "LIVE_SESSION",
  "CLIP_SHOOT",
  "STUDIO_DAY",
  "OTHER",
] as const;
export type SourceBlockType = (typeof SOURCE_BLOCK_TYPES)[number];

export const SOURCE_BLOCK_TYPE_LABELS: Record<SourceBlockType, string> = {
  LIVE_SESSION: "Live session",
  CLIP_SHOOT: "Tournage clip",
  STUDIO_DAY: "Journée studio",
  OTHER: "Autre",
};

// Cycle de vie d'un tournage.
export const SOURCE_STATUSES = ["PLANIFIE", "TOURNE", "RUSHES_DISPO"] as const;
export type SourceStatus = (typeof SOURCE_STATUSES)[number];

export const SOURCE_STATUS_LABELS: Record<SourceStatus, string> = {
  PLANIFIE: "Planifié",
  TOURNE: "Tourné",
  RUSHES_DISPO: "Rushes dispo",
};

export const SourceBlockSchema = z.object({
  type: z.enum(SOURCE_BLOCK_TYPES),
  shoot_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Date invalide." })
    .nullable(),
  asset_link: z.string().max(2000).nullable(),
  status: z.enum(SOURCE_STATUSES),
});

export type SourceBlockInput = z.infer<typeof SourceBlockSchema>;
