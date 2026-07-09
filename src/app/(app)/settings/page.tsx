import { getUserOrRedirect } from "@/lib/auth";
import { listKeyStatuses } from "@/lib/ai/keys";
import { AI_PROVIDER_ORDER } from "@/lib/ai/config";
import { listTemplates } from "@/lib/templates";
import { getConnectionStatus } from "@/lib/google/connection";
import { ApiKeyForm } from "@/components/api-key-form";
import { TemplateManager } from "@/components/template-manager";
import { GoogleCalendarCard } from "@/components/google-calendar-card";

const GOOGLE_FLASH: Record<string, { tone: "ok" | "error"; message: string }> = {
  connected: { tone: "ok", message: "Google Agenda connecté et synchronisé." },
  denied: { tone: "error", message: "Connexion Google refusée." },
  error: { tone: "error", message: "Échec de la connexion Google. Réessaie." },
  notconfigured: {
    tone: "error",
    message: "Identifiants OAuth Google absents côté serveur.",
  },
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string | string[] }>;
}) {
  await getUserOrRedirect();
  const [statuses, templates, googleStatus] = await Promise.all([
    listKeyStatuses(),
    listTemplates(),
    getConnectionStatus(),
  ]);
  const byProvider = new Map(statuses.map((s) => [s.provider, s]));

  const { google } = await searchParams;
  const googleKey = Array.isArray(google) ? google[0] : google;
  const googleFlash = googleKey ? GOOGLE_FLASH[googleKey] : undefined;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Réglages</h1>
        <p className="text-muted-foreground">
          Clés API pour la génération de contenu (BYOK). Tes clés sont{" "}
          <strong>chiffrées au repos</strong> et ne quittent jamais le serveur.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Providers IA</h2>
        {AI_PROVIDER_ORDER.map((provider) => {
          const status = byProvider.get(provider);
          return (
            <ApiKeyForm
              key={provider}
              provider={provider}
              configured={!!status}
              hint={status?.key_hint ?? null}
            />
          );
        })}
        <p className="text-xs text-muted-foreground">
          Ajoute au moins une clé (Claude recommandé) pour activer la génération
          de plan de contenu.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-medium">Formats de release</h2>
          <p className="text-sm text-muted-foreground">
            Les fenêtres de promo (Sprint, Marathon, Impact…) et leurs jalons.
            Chaque release fige le format choisi au moment de sa création.
          </p>
        </div>
        <TemplateManager templates={templates} />
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-medium">Synchronisation calendrier</h2>
          <p className="text-sm text-muted-foreground">
            Pousse ton planning vers Google Agenda (agenda dédié, mise à jour
            automatique).
          </p>
        </div>
        <GoogleCalendarCard status={googleStatus} flash={googleFlash} />
      </section>
    </div>
  );
}
