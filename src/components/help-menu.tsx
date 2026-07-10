"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HelpCircle,
  Rocket,
  Disc3,
  Clapperboard,
  CalendarDays,
  Settings,
  LayoutDashboard,
  LifeBuoy,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

type Help = {
  // Ancre correspondante dans la page /aide (ex. "studio" → /aide#studio).
  section: string;
  icon: LucideIcon;
  title: string;
  intro: string;
  points: ReactNode[];
  tip: ReactNode;
};

const HELP: Record<string, Help> = {
  dashboard: {
    section: "demarrage",
    icon: LayoutDashboard,
    title: "Dashboard",
    intro: "Ta vue d'ensemble : prochaines échéances et contenus à venir.",
    points: [
      "Repère tes contenus des prochains jours",
      "Accède rapidement à tes releases",
      "Garde un œil sur l'avancement de ta checklist",
    ],
    tip: (
      <>
        Programme des <strong>dates</strong> sur tes cartes pour les voir
        remonter ici.
      </>
    ),
  },
  releases: {
    section: "releases",
    icon: Disc3,
    title: "Releases",
    intro: "Chaque release est un projet avec sa date de sortie.",
    points: [
      <>Crée une release : <strong>titre + date + format</strong></>,
      "Onglets : Vue d'ensemble, Timeline, Tournages, Checklist",
      "Coche ta checklist pré et post-sortie",
    ],
    tip: (
      <>
        La <strong>date de sortie</strong> pilote les compte à rebours et le
        calendrier.
      </>
    ),
  },
  studio: {
    section: "studio",
    icon: Clapperboard,
    title: "Studio",
    intro: "Le board global de tout ton contenu, toutes releases confondues.",
    points: [
      "Bascule entre vue Kanban et Liste",
      "Glisse les cartes pour changer d'étape",
      <>Filtre par release / plateforme / format / statut</>,
      <>Supprime plusieurs cartes via « <strong>Sélectionner</strong> »</>,
    ],
    tip: (
      <>
        Filtre par <strong>release</strong> pour te concentrer sur une seule
        sortie à la fois.
      </>
    ),
  },
  calendar: {
    section: "calendrier",
    icon: CalendarDays,
    title: "Calendrier",
    intro: "Vue mensuelle de tes sorties, contenus et échéances.",
    points: [
      "Connecte Google Agenda depuis Réglages",
      "Synchro dans les 2 sens (push + pull)",
      "Repère sorties et deadlines d'un coup d'œil",
    ],
    tip: (
      <>
        Donne une <strong>date programmée</strong> à tes cartes pour les
        afficher ici.
      </>
    ),
  },
  settings: {
    section: "reglages",
    icon: Settings,
    title: "Réglages",
    intro: "Configure ton espace de travail.",
    points: [
      "Profil artiste (utilisé par l'IA)",
      "Formats de release personnalisés",
      "Génération IA : modèle + clé (chiffrée)",
      "Connexion Google Agenda",
    ],
    tip: (
      <>
        Complète bien ton <strong>profil</strong> : l'IA génère du contenu plus
        juste.
      </>
    ),
  },
  aide: {
    section: "demarrage",
    icon: LifeBuoy,
    title: "Centre d'aide",
    intro: "Tous les tutoriels, organisés par thème.",
    points: [
      "Parcours les sections dans le menu de gauche",
      "Reviens ici dès que tu bloques",
    ],
    tip: <>Le « ? » s'adapte toujours à la page où tu te trouves.</>,
  },
  demarrage: {
    section: "demarrage",
    icon: Rocket,
    title: "Bienvenue 👋",
    intro: "Ton assistant pour planifier tes sorties et ton contenu.",
    points: [
      <>Crée une <strong>release</strong> (ton titre + sa date)</>,
      <>Génère ton <strong>plan de contenu</strong> par IA</>,
      <>Suis ta prod dans le <strong>Studio</strong></>,
    ],
    tip: <>Commence avec une seule release pour prendre le pli.</>,
  },
};

function resolve(pathname: string): Help {
  if (pathname.startsWith("/studio")) return HELP.studio;
  if (pathname.startsWith("/releases")) return HELP.releases;
  if (pathname.startsWith("/calendar")) return HELP.calendar;
  if (pathname.startsWith("/settings") || pathname.startsWith("/profile"))
    return HELP.settings;
  if (pathname.startsWith("/dashboard")) return HELP.dashboard;
  if (pathname.startsWith("/aide")) return HELP.aide;
  return HELP.demarrage;
}

// Bouton « ? » du coin haut-gauche : au survol (desktop) il ouvre un aperçu
// contextuel de la page courante, au clic il mène à la section correspondante
// de la page /aide. Sur mobile (pas de survol) le clic redirige directement.
export function HelpMenu() {
  const pathname = usePathname();
  const help = resolve(pathname);
  const Icon = help.icon;
  const href = `/aide#${help.section}`;

  return (
    <div className="group relative">
      <Link
        href={href}
        aria-label="Aide et tutoriels"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-input bg-card text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary group-focus-within:border-primary/50 group-focus-within:text-primary"
      >
        <HelpCircle className="h-[18px] w-[18px]" />
      </Link>

      {/* Aperçu au survol/focus (desktop), aligné à droite (le bouton est en
          haut à droite). Le pt-2 sert de pont pour ne pas perdre le survol
          entre le bouton et la carte. */}
      <div className="absolute right-0 top-full z-50 hidden w-[320px] pt-2 group-hover:block group-focus-within:block">
        <div className="rounded-xl border bg-popover p-4 shadow-lg">
          <p className="flex items-center gap-2 text-sm font-semibold [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-primary">
            <Icon />
            {help.title}
          </p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">{help.intro}</p>

          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Sur cette page
          </p>
          <ul className="mt-1.5 flex flex-col gap-1.5 text-[13px]">
            {help.points.map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span className="leading-snug">{p}</span>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-start gap-2 rounded-lg bg-primary/5 px-3 py-2 text-[12.5px] text-foreground/80 ring-1 ring-primary/15">
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="leading-snug">{help.tip}</span>
          </div>

          <Link
            href={href}
            className="mt-3 inline-flex text-[13px] font-medium text-primary hover:underline"
          >
            → Ouvrir le tutoriel détaillé
          </Link>
        </div>
      </div>
    </div>
  );
}
