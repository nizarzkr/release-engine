import { getProfile } from "@/lib/auth";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string | string[] }>;
}) {
  const profile = await getProfile();
  const { preview } = await searchParams;

  // Prévisualisation locale (dev uniquement) : ?preview=1 laisse voir le wizard
  // même avec un profil existant.
  const previewInDev =
    process.env.NODE_ENV === "development" && preview === "1";

  // NB : pas de redirection serveur ici. L'étape 1 crée le profil, ce qui
  // rafraîchit ce Server Component ; une garde serveur redirigerait alors vers
  // le dashboard en plein milieu du wizard. La redirection des utilisateurs
  // déjà onboardés est gérée côté client (capturée une seule fois au montage).
  const alreadyOnboarded = !!profile && !previewInDev;

  return (
    <OnboardingWizard
      alreadyOnboarded={alreadyOnboarded}
      initialProfile={previewInDev ? profile : null}
    />
  );
}
