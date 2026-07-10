import { getUserOrRedirect } from "@/lib/auth";
import { HelpDoc } from "./help-doc";

export default async function AidePage() {
  await getUserOrRedirect();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Aide & tutoriels</h1>
        <p className="mt-1 text-muted-foreground">
          Tout ce qu'il faut savoir pour prendre en main Release Engine et
          l'optimiser.
        </p>
      </div>

      <HelpDoc />
    </div>
  );
}
