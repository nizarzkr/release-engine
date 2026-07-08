import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <span className="mb-6 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
        v0 · en construction
      </span>

      <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
        Release Engine
      </h1>

      <p className="mt-6 max-w-xl text-balance text-lg text-muted-foreground">
        Transforme une date de sortie en un plan de contenu complet — généré par
        IA, suivi dans un pipeline de production, de l&apos;idée à la
        publication.
      </p>

      <div className="mt-10 flex items-center gap-3">
        <Button size="lg" disabled>
          Commencer (bientôt)
        </Button>
        <span className="text-sm text-muted-foreground">J0 — fondations</span>
      </div>
    </main>
  );
}
