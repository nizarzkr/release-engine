import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { getUserOrRedirect } from "@/lib/auth";
import { buildAuthUrl, googleConfigured } from "@/lib/google/oauth";

// Démarre le flux OAuth Google : pose un state anti-CSRF puis redirige vers
// l'écran de consentement.
export async function GET(request: NextRequest) {
  await getUserOrRedirect();

  const origin = new URL(request.url).origin;
  if (!googleConfigured()) {
    return NextResponse.redirect(`${origin}/settings?google=notconfigured`);
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = `${origin}/auth/google/callback`;
  const res = NextResponse.redirect(buildAuthUrl(redirectUri, state));
  res.cookies.set("g_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 min
  });
  return res;
}
