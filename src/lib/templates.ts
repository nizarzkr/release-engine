import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getUserOrRedirect } from "@/lib/auth";
import { DEFAULT_TEMPLATES } from "@/lib/domain/release-template";
import type { Tables } from "@/types/database.types";

export type ReleaseTemplateRow = Tables<"release_template">;

/**
 * Liste les formats de release de l'utilisateur.
 * Sème les 3 formats par défaut au premier accès (utilisateurs existants
 * comme nouveaux) → l'UI a toujours au moins Sprint/Marathon/Impact.
 */
export async function listTemplates(): Promise<ReleaseTemplateRow[]> {
  const user = await getUserOrRedirect();
  const supabase = await createClient();

  const { data } = await supabase
    .from("release_template")
    .select("*")
    .order("created_at", { ascending: true });

  if (data && data.length > 0) return data;

  // Seeding idempotent : n'insère que si l'utilisateur n'a aucun template.
  await supabase.from("release_template").insert(
    DEFAULT_TEMPLATES.map((t) => ({
      user_id: user.id,
      name: t.name,
      description: t.description,
      milestones: t.milestones,
      is_builtin: true,
    })),
  );

  const { data: seeded } = await supabase
    .from("release_template")
    .select("*")
    .order("created_at", { ascending: true });

  return seeded ?? [];
}
