import { getUserOrRedirect, getProfile } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";

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
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
