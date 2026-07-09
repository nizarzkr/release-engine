"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Boundary d'erreur de la zone protégée : évite l'écran blanc, propose de
// réessayer (re-render du segment) sans recharger toute la page.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <h2 className="text-lg font-medium">Une erreur est survenue</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "Quelque chose s'est mal passé. Réessaie."}
      </p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
