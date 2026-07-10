import { getUserOrRedirect, getProfile } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { HelpMenu } from "@/components/help-menu";

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
      <AppHeader artistName={profile?.artist_name ?? null} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        {/* Bouton d'aide contextuel, en haut à droite de la page (sous le nom
            d'artiste et la déconnexion), sur sa propre ligne pour ne jamais
            chevaucher les actions de page. */}
        <div className="mb-4 flex justify-end">
          <HelpMenu />
        </div>
        {children}
      </main>
    </div>
  );
}
