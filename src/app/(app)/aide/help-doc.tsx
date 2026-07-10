"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Rocket,
  Disc3,
  Clapperboard,
  Sparkles,
  CalendarDays,
  Settings,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV: { id: string; label: string; icon: ReactNode }[] = [
  { id: "demarrage", label: "Démarrage", icon: <Rocket /> },
  { id: "releases", label: "Releases", icon: <Disc3 /> },
  { id: "studio", label: "Studio", icon: <Clapperboard /> },
  { id: "ia", label: "Génération IA", icon: <Sparkles /> },
  { id: "calendrier", label: "Calendrier & Google Agenda", icon: <CalendarDays /> },
  { id: "reglages", label: "Réglages", icon: <Settings /> },
  { id: "astuces", label: "Astuces & optimisation", icon: <Lightbulb /> },
];

export function HelpDoc() {
  const [active, setActive] = useState(NAV[0].id);
  const refs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // Zone d'activation : sous le header, dans le tiers haut de l'écran.
      { rootMargin: "-96px 0px -60% 0px", threshold: 0 },
    );
    for (const el of Object.values(refs.current)) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const go = (id: string) =>
    refs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });

  const register = (id: string) => (el: HTMLElement | null) => {
    refs.current[id] = el;
  };

  return (
    <div className="grid gap-8 md:grid-cols-[230px_1fr]">
      <nav className="flex gap-1.5 overflow-x-auto md:sticky md:top-6 md:flex-col md:self-start md:overflow-visible">
        {NAV.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => go(s.id)}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-sm font-medium transition-colors [&_svg]:h-4 [&_svg]:w-4",
              active === s.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-card hover:text-foreground",
            )}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </nav>

      <div className="flex flex-col gap-12">
        <Section id="demarrage" register={register} icon={<Rocket />} title="Démarrage">
          <P>
            Release Engine t'aide à <strong>planifier tes sorties musicales</strong>{" "}
            et tout le contenu qui va autour (teasers, clips, posts…), au même
            endroit.
          </P>
          <P>
            Le principe : une <strong>release</strong> = un projet (un single, un
            EP, un clip) avec sa date de sortie. Autour d'elle, tu génères ton
            plan de contenu, tu suis ta checklist et tu synchronises ton
            calendrier.
          </P>
          <Steps
            items={[
              <>Complète ton <strong>profil artiste</strong> dans Réglages (l'IA s'en sert).</>,
              <>Crée ta <strong>première release</strong> avec sa date de sortie.</>,
              <>Génère ton <strong>plan de contenu</strong> par IA.</>,
              <>Suis ta production dans le <strong>Studio</strong> et coche ta checklist.</>,
            ]}
          />
          <Tip>
            Commence avec une seule release pour prendre le pli, puis
            duplique ta méthode sur les suivantes.
          </Tip>
        </Section>

        <Section id="releases" register={register} icon={<Disc3 />} title="Releases">
          <P>
            La page <strong>Releases</strong> liste tous tes projets avec un
            compte à rebours (J-XX) et une barre d'avancement basée sur ta
            checklist.
          </P>
          <Bullets
            items={[
              <><strong>Créer</strong> : bouton « Nouvelle release » → titre, date de sortie et format.</>,
              <><strong>Formats</strong> : single, EP, clip… personnalisables dans Réglages.</>,
              <><strong>Onglets</strong> de la release : Vue d'ensemble, Timeline, Tournages, Checklist.</>,
              <><strong>Checklist</strong> : tâches pré et post-sortie, cochées au fil de l'eau, avec jauge d'avancement.</>,
              <><strong>Tournages</strong> : regroupe le contenu tourné le même jour pour t'organiser.</>,
            ]}
          />
          <Tip>
            La date de sortie pilote les compte à rebours et le calendrier :
            garde-la à jour.
          </Tip>
        </Section>

        <Section id="studio" register={register} icon={<Clapperboard />} title="Studio">
          <P>
            Le <strong>Studio</strong> est le board global de{" "}
            <strong>tout ton contenu</strong>, toutes releases confondues. C'est
            ton poste de pilotage de production.
          </P>
          <Bullets
            items={[
              <><strong>Deux vues</strong> : Kanban (colonnes Backlog → À tourner → À monter → Prêt) et Liste.</>,
              <><strong>Drag & drop</strong> : déplace une carte pour changer son étape.</>,
              <><strong>Filtres</strong> : release, plateforme, format, statut. <strong>Tri</strong> : date, titre, statut.</>,
              <><strong>Suppression groupée</strong> : « Sélectionner » → coche des cartes (ou une colonne entière) → « Supprimer ».</>,
            ]}
          />
          <Tip>
            Filtre par release pour te concentrer sur une seule sortie à la fois,
            et fais le ménage régulièrement avec la suppression groupée.
          </Tip>
        </Section>

        <Section id="ia" register={register} icon={<Sparkles />} title="Génération IA">
          <P>
            L'IA te fait gagner un temps fou : elle génère un{" "}
            <strong>plan de contenu complet</strong> à partir d'une release, et
            peut retravailler une carte à la demande.
          </P>
          <Bullets
            items={[
              <><strong>Générer un plan</strong> : depuis une release, l'IA propose des idées de contenu structurées.</>,
              <><strong>Regénérer une carte</strong> : un micro-prompt (« plus court », « plus drôle », « sans ce synthé ») affine le contenu.</>,
              <><strong>Bien écrire</strong> : sois précis sur la plateforme, le ton et l'objectif visé.</>,
              <><strong>Configuration</strong> : modèle et clé dans Réglages → Génération IA (chiffrée au repos).</>,
            ]}
          />
          <Tip>
            La regénération garde le même pilier et la même date : elle ne
            retravaille que le contenu.
          </Tip>
        </Section>

        <Section
          id="calendrier"
          register={register}
          icon={<CalendarDays />}
          title="Calendrier & Google Agenda"
        >
          <P>
            Le <strong>Calendrier</strong> affiche en vue mensuelle tes sorties,
            tes contenus programmés et les échéances de checklist.
          </P>
          <Bullets
            items={[
              <><strong>Connexion</strong> : Réglages → Google Agenda pour lier ton compte.</>,
              <><strong>Synchro 2 sens</strong> : push (tes contenus datés partent vers l'Agenda) et pull (les événements de l'Agenda remontent dans l'app).</>,
            ]}
          />
          <Tip>
            Mets une <strong>date programmée</strong> sur tes cartes pour les voir
            apparaître dans le calendrier et dans ton Google Agenda.
          </Tip>
        </Section>

        <Section id="reglages" register={register} icon={<Settings />} title="Réglages">
          <P>
            Tout se configure depuis <strong>Réglages</strong>, via le menu
            latéral :
          </P>
          <Bullets
            items={[
              <><strong>Profil artiste</strong> : ton nom et tes infos, utilisés par l'IA.</>,
              <><strong>Formats de release</strong> : personnalise tes types de sortie.</>,
              <><strong>Génération IA</strong> : modèle et clé API (chiffrée au repos).</>,
              <><strong>Google Agenda</strong> : connexion et synchronisation.</>,
            ]}
          />
        </Section>

        <Section id="astuces" register={register} icon={<Lightbulb />} title="Astuces & optimisation">
          <P>Quelques réflexes pour tirer le meilleur de l'outil :</P>
          <Bullets
            items={[
              <><strong>Workflow conseillé</strong> : profil → release → génère le plan → affine → programme les dates → synchronise.</>,
              <><strong>Une release à la fois</strong> : filtre le Studio pour éviter de te disperser.</>,
              <><strong>Regroupe tes tournages</strong> : planifie plusieurs contenus sur une même journée de shooting.</>,
              <><strong>Vise 100 % de checklist</strong> avant chaque sortie : c'est ta to-do de lancement.</>,
              <><strong>Garde un Studio propre</strong> avec la suppression groupée.</>,
            ]}
          />
          <Tip>
            Bloqué ? Le petit « ? » en haut à gauche est toujours là pour un
            rappel rapide.
          </Tip>
        </Section>
      </div>
    </div>
  );
}

function Section({
  id,
  title,
  icon,
  register,
  children,
}: {
  id: string;
  title: string;
  icon: ReactNode;
  register: (id: string) => (el: HTMLElement | null) => void;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      ref={register(id)}
      className="scroll-mt-24 border-t pt-8 first:border-t-0 first:pt-0"
    >
      <h2 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight [&_svg]:h-5 [&_svg]:w-5 [&_svg]:text-primary">
        {icon}
        {title}
      </h2>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p className="text-[15px] leading-relaxed text-foreground/85">{children}</p>;
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-2.5">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-3 text-[15px] text-foreground/85">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-semibold text-primary-foreground">
            {i + 1}
          </span>
          <span className="leading-relaxed">{it}</span>
        </li>
      ))}
    </ol>
  );
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2.5 text-[15px] text-foreground/85">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span className="leading-relaxed">{it}</span>
        </li>
      ))}
    </ul>
  );
}

function Tip({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-primary/5 px-4 py-3 text-[14px] text-foreground/85 ring-1 ring-primary/15">
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}
