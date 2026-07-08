import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Client Supabase côté serveur (Server Components, Route Handlers, Server Actions).
 * `cookies()` est asynchrone en Next 16 → cette fonction est async.
 * À utiliser pour toute lecture/écriture de données authentifiée : la session
 * est portée par les cookies, et la RLS (activée en J1) filtre par user.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Appelé depuis un Server Component (cookies en lecture seule).
            // Sans effet si le rafraîchissement de session est géré dans proxy.ts (J2).
          }
        },
      },
    },
  );
}
