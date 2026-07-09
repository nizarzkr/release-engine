// Fallback de chargement de la zone protégée (affiché pendant la navigation
// serveur). Squelette neutre, sans dépendance.
export default function AppLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Chargement">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted/60" />
        ))}
      </div>
    </div>
  );
}
