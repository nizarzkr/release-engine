"use client";

import { useCallback, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Disc3,
  Sparkles,
  Clapperboard,
  CalendarDays,
  ArrowLeft,
  ArrowRight,
  Rocket,
} from "lucide-react";
import { ProfileForm } from "@/components/profile-form";
import { buttonVariants } from "@/components/ui/button";
import type { Tables } from "@/types/database.types";
import { cn } from "@/lib/utils";

const STEPS = ["Profil artiste", "Comment ça marche", "Ta première release"];

export function OnboardingWizard({
  initialProfile = null,
}: {
  // Renseigné seulement en prévisualisation (dev) pour pré-remplir le formulaire
  // et éviter d'écraser un profil existant. En vrai onboarding : null.
  initialProfile?: Tables<"artist_profile"> | null;
}) {
  const [step, setStep] = useState(0);
  const goProfileDone = useCallback(() => setStep(1), []);

  return (
    <div className="flex flex-col gap-6">
      <StepIndicator step={step} />

      {step === 0 && (
        <div className="flex flex-col gap-4">
          <Head
            icon={<Disc3 />}
            title="Pose ton ADN artistique"
            subtitle="Ces infos nourrissent la génération de contenu par IA. Tu pourras tout modifier plus tard dans Réglages."
          />
          {/* redirectTo={null} → on reste sur l'onboarding et on passe à l'étape
              suivante via onSaved au lieu de filer au dashboard. */}
          <ProfileForm
            initial={initialProfile}
            submitLabel="Continuer"
            redirectTo={null}
            onSaved={goProfileDone}
          />
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-5">
          <Head
            icon={<Rocket />}
            title="Comment marche Release Engine"
            subtitle="Le principe en 4 idées — pas besoin de tout retenir, le « ? » en haut à droite te réexplique tout, page par page."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Explain icon={<Disc3 />} title="Les releases">
              Une release = un projet (single, EP, clip) avec sa date de sortie.
              Tout s'organise autour d'elle.
            </Explain>
            <Explain icon={<Sparkles />} title="La génération IA">
              L'IA te propose un plan de contenu complet, que tu peux affiner
              carte par carte.
            </Explain>
            <Explain icon={<Clapperboard />} title="Le Studio">
              Le board global de tout ton contenu : tu suis ta production en
              Kanban ou en liste.
            </Explain>
            <Explain icon={<CalendarDays />} title="Le calendrier">
              Synchronise Google Agenda pour voir sorties et échéances au même
              endroit.
            </Explain>
          </div>
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className={buttonVariants({ size: "lg" })}
            >
              Suivant
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-5">
          <Head
            icon={<Rocket />}
            title="Prêt·e ? Crée ta première release"
            subtitle="C'est le point de départ : donne-lui un titre et une date de sortie, et l'app génère sa timeline et son plan de contenu."
          />
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-sm text-foreground/85">
              On te guide pas à pas dans la création. Tu pourras ensuite générer
              ton plan de contenu par IA en un clic.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href="/releases/new"
                className={buttonVariants({ size: "lg" })}
              >
                <Disc3 className="h-4 w-4" />
                Créer ma première release
              </Link>
              <Link
                href="/dashboard"
                className={buttonVariants({ variant: "ghost", size: "lg" })}
              >
                Plus tard, aller au dashboard
              </Link>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
        </div>
      )}
    </div>
  );
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold transition-colors",
              i < step
                ? "bg-primary text-primary-foreground"
                : i === step
                  ? "bg-primary text-primary-foreground ring-4 ring-primary/15"
                  : "bg-secondary text-muted-foreground",
            )}
          >
            {i + 1}
          </span>
          <span
            className={cn(
              "hidden text-[13px] font-medium sm:inline",
              i === step ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {label}
          </span>
          {i < STEPS.length - 1 && (
            <span className="mx-1 h-px w-6 bg-border sm:w-8" />
          )}
        </div>
      ))}
    </div>
  );
}

function Head({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight [&_svg]:h-6 [&_svg]:w-6 [&_svg]:text-primary">
        {icon}
        {title}
      </h1>
      <p className="mt-1.5 max-w-2xl text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function Explain({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="flex items-center gap-2 text-sm font-semibold [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-primary">
        {icon}
        {title}
      </p>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
        {children}
      </p>
    </div>
  );
}
