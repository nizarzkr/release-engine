import { NextResponse, type NextRequest } from "next/server";
import { getUserOrRedirect } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/crypto";
import { exchangeCode } from "@/lib/google/oauth";
import { syncGoogleBestEffort } from "@/lib/google/sync";

// Callback OAuth Google : vérifie le state, échange le code contre un refresh
// token, le chiffre et le stocke, puis lance une première synchro.
export async function GET(request: NextRequest) {
  const user = await getUserOrRedirect();
  const url = new URL(request.url);
  const origin = url.origin;
  const settings = (status: string) =>
    NextResponse.redirect(`${origin}/settings?google=${status}`);

  if (url.searchParams.get("error")) return settings("denied");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.cookies.get("g_oauth_state")?.value;
  if (!code || !state || !cookieState || state !== cookieState) {
    return settings("error");
  }

  try {
    const { refreshToken, email } = await exchangeCode(
      code,
      `${origin}/auth/google/callback`,
    );

    const supabase = await createClient();
    const { error } = await supabase.from("google_calendar_connection").upsert(
      {
        user_id: user.id,
        refresh_token_enc: encryptSecret(refreshToken),
        google_email: email,
      },
      { onConflict: "user_id" },
    );
    if (error) return settings("error");

    // Première synchro (crée l'agenda dédié + pousse les events).
    await syncGoogleBestEffort();

    const res = settings("connected");
    res.cookies.delete("g_oauth_state");
    return res;
  } catch {
    return settings("error");
  }
}
