"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserOrRedirect } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import {
  AI_PROVIDERS,
  validateKeyFormat,
  keyHint,
  type AiProvider,
} from "@/lib/ai/config";

export type KeyState = { ok?: boolean; error?: string };

export async function saveApiKey(
  provider: AiProvider,
  _prev: KeyState,
  formData: FormData,
): Promise<KeyState> {
  const user = await getUserOrRedirect();
  if (!(provider in AI_PROVIDERS)) return { error: "Provider inconnu." };

  const key = (formData.get("api_key") ?? "").toString();
  const check = validateKeyFormat(provider, key);
  if (!check.ok) return { error: check.error };

  const supabase = await createClient();
  const { error } = await supabase.from("api_key").upsert(
    {
      user_id: user.id,
      provider,
      encrypted_key: encryptSecret(key.trim()),
      key_hint: keyHint(key),
    },
    { onConflict: "user_id,provider" },
  );
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteApiKey(provider: AiProvider) {
  await getUserOrRedirect();
  const supabase = await createClient();
  await supabase.from("api_key").delete().eq("provider", provider);
  revalidatePath("/settings");
}
