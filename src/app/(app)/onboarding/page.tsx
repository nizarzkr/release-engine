import { redirect } from "next/navigation";
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
  // même avec un profil existant. En prod, la garde redirige toujours.
  const previewInDev =
    process.env.NODE_ENV === "development" && preview === "1";

  // Profil déjà créé → pas d'onboarding.
  if (profile && !previewInDev) {
    redirect("/dashboard");
  }

  return <OnboardingWizard initialProfile={previewInDev ? profile : null} />;
}
