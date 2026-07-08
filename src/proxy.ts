import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// En Next 16, le "middleware" s'appelle Proxy. Il rafraîchit la session
// Supabase à chaque requête et redirige les visiteurs non connectés.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Toutes les routes SAUF :
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation d'images)
     * - favicon.ico
     * - fichiers d'images courants
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
