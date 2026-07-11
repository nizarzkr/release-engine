import { z } from "zod";

// Posture image — conditionne les briefs IA (ex. HYBRIDE = pas de talk face caméra).
export const IMAGE_STANCES = ["FACE", "ANONYME", "HYBRIDE"] as const;
export type ImageStance = (typeof IMAGE_STANCES)[number];

// Plateformes proposées à la sélection dans le profil (liste cliquable).
// L'artiste peut en cocher plusieurs ; d'éventuelles valeurs personnalisées
// déjà enregistrées restent affichées et sélectionnées.
export const CONTENT_PLATFORMS = [
  "TikTok",
  "Instagram",
  "YouTube",
  "YouTube Shorts",
  "Spotify",
  "Apple Music",
  "Deezer",
  "SoundCloud",
  "Snapchat",
  "X (Twitter)",
  "Facebook",
  "Twitch",
] as const;

export const IMAGE_STANCE_LABELS: Record<ImageStance, string> = {
  FACE: "Face caméra (visage assumé)",
  ANONYME: "Anonyme (jamais de visage)",
  HYBRIDE: "Hybride (visage occasionnel, pas de talk face cam)",
};

// Schéma de validation du profil artiste (PRD §3.1).
export const ProfileSchema = z.object({
  artist_name: z
    .string()
    .min(1, { error: "Le nom d'artiste est requis." })
    .max(120, { error: "Nom trop long." }),
  genres: z.array(z.string()),
  references_art: z.array(z.string()),
  da_keywords: z.array(z.string()),
  image_stance: z.enum(IMAGE_STANCES),
  platforms: z.array(z.string()),
  weekly_capacity: z
    .number()
    .int({ error: "Nombre entier attendu." })
    .min(0)
    .max(50, { error: "Capacité irréaliste." }),
  constraints: z.string().max(2000).nullable(),
});

export type ProfileInput = z.infer<typeof ProfileSchema>;

/**
 * Transforme un champ texte "a, b, c" en tableau nettoyé.
 * Fonction pure — testable sans UI ni DB.
 */
export function parseList(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Inverse de parseList, pour pré-remplir le formulaire. */
export function listToString(items: string[] | null | undefined): string {
  return (items ?? []).join(", ");
}
