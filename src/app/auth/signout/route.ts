import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Déconnexion : invalide la session puis renvoie vers /login.
 * Déclenché par un formulaire POST (bouton dans l'app shell).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
