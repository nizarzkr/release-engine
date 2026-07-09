import Link from "next/link";
import { getUserOrRedirect, getProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";

// Layout de la zone protégée : refuse l'accès sans session, puis pose
// l'app shell (barre du haut + navigation) commun à tous les écrans.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await getUserOrRedirect();
  const profile = await getProfile();

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-semibold tracking-tight">
              Release&nbsp;Engine
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/dashboard" className="hover:text-foreground">
                Dashboard
              </Link>
              <Link href="/releases" className="hover:text-foreground">
                Releases
              </Link>
              <Link href="/calendar" className="hover:text-foreground">
                Calendrier
              </Link>
              <Link href="/profile" className="hover:text-foreground">
                Profil
              </Link>
              <Link href="/settings" className="hover:text-foreground">
                Réglages
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {profile?.artist_name && (
              <span className="text-sm text-muted-foreground">
                {profile.artist_name}
              </span>
            )}
            <form action="/auth/signout" method="post">
              <Button type="submit" variant="ghost" size="sm">
                Déconnexion
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
