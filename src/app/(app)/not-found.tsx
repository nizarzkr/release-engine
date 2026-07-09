import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function AppNotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <h2 className="text-lg font-medium">Page introuvable</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Cette ressource n&apos;existe pas ou a été supprimée.
      </p>
      <Link href="/dashboard" className={buttonVariants()}>
        Retour au dashboard
      </Link>
    </div>
  );
}
