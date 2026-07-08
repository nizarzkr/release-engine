import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

/**
 * Client Supabase côté navigateur (Client Components).
 * À réserver à l'interactif (formulaires temps réel, drag & drop du Kanban…).
 * Par défaut, on privilégie la lecture via le client serveur.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
