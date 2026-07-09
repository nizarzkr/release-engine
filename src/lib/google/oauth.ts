import "server-only";

// OAuth 2.0 Google — échange de code + refresh de token, en fetch brut.
// Aucune dépendance : endpoints REST officiels.

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo";

// Scope calendar (lecture/écriture, nécessaire pour créer l'agenda dédié et
// pousser les events) + email pour afficher le compte connecté.
export const GOOGLE_SCOPE =
  "openid email https://www.googleapis.com/auth/calendar";

export function googleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
}

function credentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET manquants dans .env.local.",
    );
  }
  return { clientId, clientSecret };
}

/** URL de consentement Google (access_type=offline + prompt=consent → refresh token). */
export function buildAuthUrl(redirectUri: string, state: string): string {
  const { clientId } = credentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPE,
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state,
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

/** Échange le code d'autorisation contre un refresh token (+ email du compte). */
export async function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<{ refreshToken: string; accessToken: string; email: string | null }> {
  const { clientId, clientSecret } = credentials();
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Échange de code Google échoué (${res.status}).`);
  }
  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
  };
  if (!data.refresh_token) {
    // Sans refresh token on ne peut pas synchroniser en continu.
    throw new Error(
      "Google n'a pas renvoyé de refresh token. Révoque l'accès dans ton compte Google puis reconnecte.",
    );
  }
  const email = await fetchEmail(data.access_token);
  return {
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
    email,
  };
}

/** Nouveau access token à partir du refresh token stocké. */
export async function getAccessToken(refreshToken: string): Promise<string> {
  const { clientId, clientSecret } = credentials();
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Refresh du token Google échoué (${res.status}).`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function fetchEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { email?: string };
    return data.email ?? null;
  } catch {
    return null;
  }
}
