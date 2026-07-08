import { getProfile } from "@/lib/auth";
import { ProfileForm } from "@/components/profile-form";

export default async function ProfilePage() {
  const profile = await getProfile();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Profil artiste
        </h1>
        <p className="text-muted-foreground">
          L&apos;ADN qui nourrit la génération de contenu.
        </p>
      </div>

      <ProfileForm
        initial={profile}
        submitLabel="Enregistrer les modifications"
      />
    </div>
  );
}
