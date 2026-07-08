import "server-only";
import { createClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/crypto";
import type { AiProvider } from "./config";

/**
 * Clé API déchiffrée du user courant pour un provider (ou null).
 * RÉSERVÉ AU SERVEUR — utilisé en J7 pour la génération. La clé en clair
 * ne quitte jamais le serveur.
 */
export async function getDecryptedKey(
  provider: AiProvider,
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("api_key")
    .select("encrypted_key")
    .eq("provider", provider)
    .maybeSingle(); // RLS filtre déjà par user_id

  if (!data?.encrypted_key) return null;
  return decryptSecret(data.encrypted_key);
}

export type KeyStatus = {
  provider: AiProvider;
  key_hint: string | null;
  updated_at: string | null;
};

/** Statuts pour l'UI — jamais l'encrypted_key. */
export async function listKeyStatuses(): Promise<KeyStatus[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("api_key")
    .select("provider, key_hint, updated_at");

  return (data ?? []).map((r) => ({
    provider: r.provider as AiProvider,
    key_hint: r.key_hint,
    updated_at: r.updated_at,
  }));
}
