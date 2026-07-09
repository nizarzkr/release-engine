import { getUserOrRedirect } from "@/lib/auth";
import { listKeyStatuses } from "@/lib/ai/keys";
import { AI_PROVIDER_ORDER } from "@/lib/ai/config";
import { listTemplates } from "@/lib/templates";
import { ApiKeyForm } from "@/components/api-key-form";
import { TemplateManager } from "@/components/template-manager";

export default async function SettingsPage() {
  await getUserOrRedirect();
  const [statuses, templates] = await Promise.all([
    listKeyStatuses(),
    listTemplates(),
  ]);
  const byProvider = new Map(statuses.map((s) => [s.provider, s]));

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
    </div>
  );
}
