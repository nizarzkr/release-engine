"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserOrRedirect } from "@/lib/auth";
import { ProfileSchema, parseList } from "@/lib/domain/profile";

export type ProfileState = { error?: string };

export async function saveProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await getUserOrRedirect();

  const parsed = ProfileSchema.safeParse({
    artist_name: (formData.get("artist_name") ?? "").toString().trim(),
    genres: parseList(formData.get("genres")),
    references_art: parseList(formData.get("references_art")),
    da_keywords: parseList(formData.get("da_keywords")),
    image_stance: formData.get("image_stance"),
    platforms: parseList(formData.get("platforms")),
    weekly_capacity: Number(formData.get("weekly_capacity") ?? 3),
    constraints: formData.get("constraints")?.toString().trim() || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const supabase = await createClient();
  // user_id posé côté serveur (jamais depuis le client) ; la RLS with check
  // le garantit aussi. onConflict user_id → création OU mise à jour (1:1).
  const { error } = await supabase
    .from("artist_profile")
    .upsert({ user_id: user.id, ...parsed.data }, { onConflict: "user_id" });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  redirect("/dashboard");
}
