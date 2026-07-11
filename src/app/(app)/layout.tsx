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
    // Backdrop « muted » autour d'un contenu cadré : le contenu vit dans un
    // panneau crème bordé et centré (effet « fenêtre d'app »). Les cartes
    // blanches internes gardent leur contraste sur le crème du panneau.
    <div className="flex min-h-full flex-col bg-muted">
      <AppHeader artistName={profile?.artist_name ?? null} />
      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto w-full max-w-4xl rounded-2xl border bg-background shadow-sm">
          <div className="p-5 sm:p-8">
            {/* Bouton d'aide contextuel, en haut à droite du cadre. */}
            <div className="mb-4 flex justify-end">
              <HelpMenu />
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
