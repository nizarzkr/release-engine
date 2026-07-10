import {
  UserRound,
  LayoutTemplate,
  Sparkles,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";
import { getUserOrRedirect, getProfile } from "@/lib/auth";
import { listKeyStatuses } from "@/lib/ai/keys";
import { AI_PROVIDER_ORDER } from "@/lib/ai/config";
import { listTemplates } from "@/lib/templates";
import { getConnectionStatus } from "@/lib/google/connection";
import { ApiKeyForm } from "@/components/api-key-form";
import { TemplateManager } from "@/components/template-manager";
import { GoogleCalendarCard } from "@/components/google-calendar-card";
import { ProfileForm } from "@/components/profile-form";
import { Card, CardContent } from "@/components/ui/card";
import { SettingsNav } from "./settings-nav";

const GOOGLE_FLASH: Record<string, { tone: "ok" | "error"; message: string }> = {
  connected: { tone: "ok", message: "Google Agenda connecté et synchronisé." },
  denied: { tone: "error", message: "Connexion Google refusée." },
  error: { tone: "error", message: "Échec de la connexion Google. Réessaie." },
  notconfigured: {
    tone: "error",
    message: "Identifiants OAuth Google absents côté serveur.",
  },
};

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string | string[] }>;
}) {
  await getUserOrRedirect();
  const [profile, statuses, templates, googleStatus] = await Promise.all([
    getProfile(),
    listKeyStatuses(),
    listTemplates(),
    getConnectionStatus(),
  ]);
  const byProvider = new Map(statuses.map((s) => [s.provider, s]));

  const { google } = await searchParams;
  const googleKey = Array.isArray(google) ? google[0] : google;
  const googleFlash = googleKey ? GOOGLE_FLASH[googleKey] : undefined;

  const sections = [
    { key: "profil", label: "Profil artiste", icon: <UserRound /> },
    { key: "formats", label: "Formats de release", icon: <LayoutTemplate /> },
    { key: "ia", label: "Génération IA", icon: <Sparkles /> },
    { key: "agenda", label: "Google Agenda", icon: <CalendarDays /> },
  ];

  const panels = {
    profil: (
      <SectionCard
        title="Profil artiste"
        description="L'ADN qui nourrit la génération de contenu par l'IA."
      >
        <ProfileForm initial={profile} submitLabel="Enregistrer le profil" />
      </SectionCard>
    ),
    formats: (
      <SectionCard
        title="Formats de release"
        description="Les fenêtres de promo (Sprint, Marathon, Impact…) et leurs jalons. Chaque release fige le format choisi au moment de sa création."
      >
        <TemplateManager templates={templates} />
      </SectionCard>
    ),
    ia: (
      <SectionCard
        title="Génération IA"
        description="Ajoute au moins une clé (Claude recommandé) pour activer la génération de plan de contenu."
      >
        <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-foreground/80">
          <ShieldCheck className="mt-px h-4 w-4 shrink-0 text-primary" />
          <span>
            Tes clés sont <strong>chiffrées au repos</strong> et ne quittent
            jamais le serveur (BYOK).
          </span>
        </div>
        <div className="flex flex-col gap-3">
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
        </div>
      </SectionCard>
    ),
    agenda: (
      <SectionCard
        title="Google Agenda"
        description="Pousse ton planning vers un agenda Google dédié, mis à jour automatiquement."
      >
        <GoogleCalendarCard status={googleStatus} flash={googleFlash} />
      </SectionCard>
    ),
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Réglages</h1>
        <p className="mt-1 text-muted-foreground">
          Ton profil, tes clés IA, tes formats de release et la synchro
          calendrier.
        </p>
      </div>

      <SettingsNav sections={sections} panels={panels} />
    </div>
  );
}
