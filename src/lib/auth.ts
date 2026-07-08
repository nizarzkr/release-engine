import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

/**
 * Retourne l'utilisateur authentifié (check autoritatif via getUser()).
 * Redirige vers /login si absent. À utiliser en tête des Server Components
 * et Server Actions protégés.
 */
export async function getUserOrRedirect() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Profil artiste du user courant (ou null s'il n'existe pas encore).
 */
export async function getProfile(): Promise<Tables<"artist_profile"> | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("artist_profile")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return data;
}
