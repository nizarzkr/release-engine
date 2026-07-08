import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";

/**
 * Rafraîchit la session Supabase à chaque requête et protège les routes.
 * Appelé depuis src/proxy.ts (ex-middleware, renommé "proxy" en Next 16).
 *
 * Règles critiques (doc Supabase) :
 * - ne RIEN exécuter entre createServerClient et getClaims() ;
 * - retourner l'objet supabaseResponse tel quel (sinon désync de session).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Avec le compute "fluid", ne jamais mettre ce client en global :
  // toujours en créer un neuf par requête.
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          if (headers) {
            Object.entries(headers).forEach(([key, value]) =>
              supabaseResponse.headers.set(key, value),
            );
          }
        },
      },
    },
  );

  // IMPORTANT : ne pas insérer de code entre createServerClient et getClaims().
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // Pas d'utilisateur → redirection vers /login (sauf routes publiques).
  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // IMPORTANT : retourner supabaseResponse tel quel (cookies inclus).
  return supabaseResponse;
}
