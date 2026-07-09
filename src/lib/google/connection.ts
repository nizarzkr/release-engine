import "server-only";
import { createClient } from "@/lib/supabase/server";
import { googleConfigured } from "./oauth";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type GoogleConnectionStatus = {
  configured: boolean; // identifiants OAuth présents côté serveur
  connected: boolean; // l'utilisateur a lié son compte Google
  email: string | null;
  calendarId: string | null;
};

/** Ligne de connexion de l'utilisateur courant (RLS), ou null. */
export async function getConnectionRow(
  supabase: SupabaseClient<Database>,
): Promise<Database["public"]["Tables"]["google_calendar_connection"]["Row"] | null> {
  const { data } = await supabase
    .from("google_calendar_connection")
    .select("*")
    .maybeSingle();
  return data ?? null;
}

/** État pour l'UI Réglages. */
export async function getConnectionStatus(): Promise<GoogleConnectionStatus> {
  const supabase = await createClient();
  const row = await getConnectionRow(supabase);
  return {
    configured: googleConfigured(),
    connected: !!row,
    email: row?.google_email ?? null,
    calendarId: row?.google_calendar_id ?? null,
  };
}
