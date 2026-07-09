"use client";

// Boundary de dernier recours : remplace le root layout si le rendu global
// échoue. Doit fournir ses propres <html>/<body> (styles inline minimaux).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>
            Une erreur est survenue
          </h2>
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
            {error.message || "Recharge la page ou réessaie."}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              borderRadius: "0.375rem",
              border: "1px solid #d1d5db",
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
