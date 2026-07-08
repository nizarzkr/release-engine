import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { ProfileForm } from "@/components/profile-form";

export default async function OnboardingPage() {
  const profile = await getProfile();

  // Profil déjà créé → pas d'onboarding.
  if (profile) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bienvenue 👋</h1>
        <p className="text-muted-foreground">
          Pose ton ADN artistique. Ces infos nourriront la génération de contenu
          par IA (à partir de J7). Tu pourras tout modifier plus tard.
        </p>
      </div>

      <ProfileForm initial={null} submitLabel="Créer mon profil" />
    </div>
  );
}
