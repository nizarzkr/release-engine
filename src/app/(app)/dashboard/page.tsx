import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const profile = await getProfile();

  // Pas encore de profil → onboarding obligatoire.
  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Bienvenue, {profile.artist_name}
          </h1>
          <p className="text-muted-foreground">
            Ton QG de sorties. Le pipeline de contenu arrive bientôt.
          </p>
        </div>
        <Link href="/releases/new" className={buttonVariants()}>
          Créer une release
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quoi faire cette semaine</CardTitle>
          <CardDescription>
            Le dashboard d&apos;actions se remplira une fois tes premières
            releases et contenus créés (J3+).
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Rien à afficher pour l&apos;instant.
        </CardContent>
      </Card>
    </div>
  );
}
