"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const CredentialsSchema = z.object({
  email: z.email({ error: "Email invalide." }),
  password: z.string().min(8, { error: "Au moins 8 caractères." }),
});

export type AuthState = { error?: string; message?: string };

function parse(formData: FormData) {
  return CredentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "Email ou mot de passe incorrect." };
  }

  redirect("/dashboard");
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(parsed.data);
  if (error) {
    return { error: error.message };
  }

  // "Confirm email" désactivé → session immédiate → on entre dans l'app.
  if (data.session) {
    redirect("/dashboard");
  }

  // "Confirm email" activé → pas de session tant que l'email n'est pas confirmé.
  return {
    message:
      "Compte créé. Vérifie ta boîte mail pour confirmer, puis connecte-toi.",
  };
}
