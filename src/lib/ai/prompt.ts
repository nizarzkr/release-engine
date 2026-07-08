import type { Tables } from "@/types/database.types";
import { formatOffset, type Timeline } from "@/lib/domain/timeline";
import { formatDateFr } from "@/lib/format";
import type { Brief } from "@/lib/domain/content";

type SourceBlockLite = {
  type: string;
  status: string | null;
  shoot_date: string | null;
};

// Règles de posture image (conditionnent les briefs — PRD §3.1 / §6.3).
const STANCE_RULES: Record<string, string> = {
  FACE: "Posture FACE : le visage à l'écran et le talk face caméra sont autorisés.",
  ANONYME:
    "Posture ANONYME : JAMAIS de visage à l'écran. Aucun plan montrant le visage de l'artiste.",
  HYBRIDE:
    "Posture HYBRIDE : le visage peut apparaître ponctuellement, mais AUCUN brief de type talk face caméra (pas de 'je regarde l'objectif et je parle'). Privilégie mains, matériel, ambiances, performance.",
};

function list(values: string[] | null | undefined, fallback: string): string {
  const v = (values ?? []).filter(Boolean);
  return v.length ? v.join(", ") : fallback;
}

/** Bloc de contexte profil, réutilisé par la génération et la regénération. */
function profileBlock(profile: Tables<"artist_profile">): string {
  return [
    "# PROFIL ARTISTE",
    `Nom : ${profile.artist_name}`,
    `Genres : ${list(profile.genres, "non précisé")}`,
    `Références artistiques : ${list(profile.references_art, "non précisé")}`,
    `Mots-clés DA : ${list(profile.da_keywords, "non précisé")}`,
    `Posture image : ${profile.image_stance ?? "HYBRIDE"}`,
    `Plateformes : ${list(profile.platforms, "TikTok, Instagram")}`,
    `Capacité de production : ${profile.weekly_capacity ?? 3} contenus / semaine`,
    `Contraintes : ${profile.constraints?.trim() || "aucune précisée"}`,
  ].join("\n");
}

/**
 * Construit le couple { system, prompt } pour la génération du plan de contenu.
 * Fonction PURE — aucun accès réseau/DB — donc testable isolément.
 */
export function buildContentPlanPrompt({
  profile,
  release,
  timeline,
  themes,
  sourceBlocks,
}: {
  profile: Tables<"artist_profile">;
  release: Tables<"release">;
  timeline: Timeline;
  themes: string[];
  sourceBlocks: SourceBlockLite[];
}): { system: string; prompt: string } {
  const stanceRule =
    STANCE_RULES[profile.image_stance ?? "HYBRIDE"] ?? STANCE_RULES.HYBRIDE;

  const milestones = timeline.milestones
    .map((m) => `- ${formatOffset(m.offset)} (${formatDateFr(m.date)}) : ${m.label}`)
    .join("\n");

  const shoots =
    sourceBlocks.length > 0
      ? sourceBlocks
          .map(
            (b) =>
              `- ${b.type}${b.status ? ` [${b.status}]` : ""}${
                b.shoot_date ? ` — ${formatDateFr(b.shoot_date)}` : ""
              }`,
          )
          .join("\n")
      : "Aucun tournage planifié pour l'instant.";

  const system = [
    "Tu es un directeur de contenu expert des réseaux sociaux pour artistes musicaux indépendants.",
    "Tu génères un plan de contenu concret et actionnable pour promouvoir une sortie musicale.",
    "",
    "RÈGLES IMPÉRATIVES :",
    `1. ${stanceRule}`,
    `2. Répartis les contenus sur TOUS les piliers fournis, sans en négliger aucun.`,
    "3. Répartis les contenus sur TOUTE la fenêtre de promo (offsets variés) : ne concentre pas tout au même moment.",
    "4. Ancre les temps forts : teasing avant la sortie (J-14, J-7), pic le jour de la sortie (J-Day, offset 0), et entretien de la traîne après la sortie.",
    "5. Adapte le VOLUME à la capacité de production hebdomadaire de l'artiste. Vise entre 20 et 25 contenus au total.",
    "6. Chaque 'hook' doit être scroll-stopping dans les 3 premières secondes (concret, intrigant, jamais générique).",
    "7. Suggère des sons natifs / trends cohérents avec le genre de l'artiste.",
    "8. 'suggested_day_offset' doit rester dans la fenêtre : entre " +
      `${-timeline.preDays} et ${timeline.postDays} (0 = jour de sortie).`,
    "9. Respecte la direction artistique et les contraintes de l'artiste.",
    "10. Écris en français, ton adapté à l'artiste. Reste concret : pas de blabla marketing générique.",
  ].join("\n");

  const prompt = [
    profileBlock(profile),
    "",
    "# SORTIE À PROMOUVOIR",
    `Titre : ${release.title}`,
    `Type : ${release.type ?? "SINGLE"}`,
    `Date de sortie : ${formatDateFr(release.release_date)}`,
    `Mood : ${release.mood?.trim() || "non précisé"}`,
    `BPM : ${release.bpm ?? "non précisé"}`,
    `Fenêtre : ${release.window_template} (${timeline.preDays} j avant / ${timeline.postDays} j après)`,
    "",
    "# PILIERS DE CONTENU (répartir sur tous)",
    themes.map((t) => `- ${t}`).join("\n"),
    "",
    "# JALONS DE LA TIMELINE (pour ancrer les temps forts)",
    milestones,
    "",
    "# TOURNAGES EXISTANTS (à réutiliser si pertinent)",
    shoots,
    "",
    "# TÂCHE",
    "Génère le plan de contenu (20-25 items) au format demandé. Pour chaque item : choisis un pilier, un format, une plateforme parmi celles de l'artiste, un objectif, un brief complet (hook, concept, structure, suggestion son, CTA) et un suggested_day_offset cohérent avec la fenêtre et les temps forts.",
  ].join("\n");

  return { system, prompt };
}

/**
 * Regénération d'UNE idée existante en appliquant un micro-prompt.
 * Garde le pilier (thème) et la date : ne renvoie que le contenu.
 * Fonction PURE — testable isolément.
 */
export function buildRegenPrompt({
  profile,
  release,
  item,
  microPrompt,
}: {
  profile: Tables<"artist_profile">;
  release: Tables<"release">;
  item: Tables<"content_item">;
  microPrompt: string;
}): { system: string; prompt: string } {
  const stanceRule =
    STANCE_RULES[profile.image_stance ?? "HYBRIDE"] ?? STANCE_RULES.HYBRIDE;
  const brief = (item.brief ?? {}) as Partial<Brief>;

  const system = [
    "Tu es un directeur de contenu expert des réseaux sociaux pour artistes musicaux indépendants.",
    "Tu régénères UNE idée de contenu existante en appliquant la variation demandée par l'artiste.",
    "",
    "RÈGLES IMPÉRATIVES :",
    `1. ${stanceRule}`,
    "2. GARDE le même pilier (thème) et le même moment de publication : ne retravaille que le CONTENU (hook, concept, structure, son, CTA, format, plateforme, objectif).",
    "3. Applique fidèlement la demande de variation de l'artiste.",
    "4. Le hook doit rester scroll-stopping dans les 3 premières secondes.",
    "5. Suggère un son natif / trend cohérent avec le genre.",
    "6. Écris en français, reste concret.",
  ].join("\n");

  const prompt = [
    profileBlock(profile),
    "",
    "# SORTIE",
    `Titre : ${release.title} · Mood : ${release.mood?.trim() || "non précisé"}`,
    "",
    "# IDÉE ACTUELLE (à retravailler — garder ce pilier)",
    `Pilier : ${item.theme}`,
    `Format : ${item.format ?? "SHORT"} · Plateforme : ${item.platform ?? "non précisé"} · Objectif : ${item.objective_tag ?? "non précisé"}`,
    `Hook : ${brief.hook ?? ""}`,
    `Concept : ${brief.concept ?? ""}`,
    `Structure : ${brief.structure ?? ""}`,
    `Son : ${brief.sound_suggestion ?? ""}`,
    `CTA : ${brief.cta ?? ""}`,
    "",
    "# DEMANDE DE VARIATION",
    microPrompt,
    "",
    "# TÂCHE",
    "Régénère cette idée en appliquant la variation. Renvoie le nouveau contenu (format, plateforme, objectif, brief complet).",
  ].join("\n");

  return { system, prompt };
}
