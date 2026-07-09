import { z } from "zod";
import { MilestoneSchema } from "./release-template";

export const RELEASE_TYPES = ["SINGLE", "EP"] as const;
export type ReleaseType = (typeof RELEASE_TYPES)[number];

// Plateformes DSP proposées dans le formulaire (liens optionnels).
export const DSP_KEYS = ["spotify", "apple", "youtube", "deezer"] as const;
export type DspKey = (typeof DSP_KEYS)[number];
export const DSP_LABELS: Record<DspKey, string> = {
  spotify: "Spotify",
  apple: "Apple Music",
  youtube: "YouTube",
  deezer: "Deezer",
};

export const ReleaseSchema = z.object({
  title: z
    .string()
    .min(1, { error: "Le titre est requis." })
    .max(200, { error: "Titre trop long." }),
  type: z.enum(RELEASE_TYPES),
  release_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Date de sortie requise." }),
  // Nom du format choisi (libellé libre) + snapshot de ses jalons.
  window_template: z.string().min(1, { error: "Format de release requis." }),
  milestones: z.array(MilestoneSchema).min(1, { error: "Jalons manquants." }),
  bpm: z
    .number()
    .int({ error: "BPM entier attendu." })
    .min(1)
    .max(400)
    .nullable(),
  mood: z.string().max(200).nullable(),
  parent_release_id: z.uuid({ error: "EP parent invalide." }).nullable(),
  dsp_links: z.record(z.string(), z.string()),
});

export type ReleaseInput = z.infer<typeof ReleaseSchema>;

/** Construit l'objet dsp_links depuis le formulaire (ignore les champs vides). */
export function parseDspLinks(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of DSP_KEYS) {
    const raw = formData.get(`dsp_${key}`);
    if (typeof raw === "string" && raw.trim()) {
      out[key] = raw.trim();
    }
  }
  return out;
}

/** Convertit un champ numérique de formulaire en number|null. */
export function parseOptionalInt(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** Normalise un champ texte optionnel : "" → null. */
export function parseOptionalText(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t === "" ? null : t;
}
