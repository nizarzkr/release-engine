// Moteur de timeline — logique métier PURE (aucune dépendance React/DB).
// template + date de sortie → jalons datés qui ancrent contenus et checklists.

export const WINDOW_TEMPLATES = ["SPRINT", "MARATHON", "IMPACT"] as const;
export type WindowTemplate = (typeof WINDOW_TEMPLATES)[number];

export type MilestonePhase = "PRE" | "DAY" | "POST";

export type MilestoneDef = {
  key: string;
  label: string;
  offset: number; // jours relatifs à J-Day (négatif = avant la sortie)
  phase: MilestonePhase;
};

export type Milestone = MilestoneDef & { date: string }; // date = YYYY-MM-DD

export type Timeline = {
  template: WindowTemplate;
  releaseDate: string;
  startDate: string;
  endDate: string;
  preDays: number;
  postDays: number;
  milestones: Milestone[];
};

// Métadonnées d'affichage par template.
export const TEMPLATE_META: Record<
  WindowTemplate,
  { label: string; weeks: number; description: string }
> = {
  SPRINT: { label: "Sprint", weeks: 4, description: "Fenêtre courte (4 semaines)" },
  MARATHON: {
    label: "Marathon",
    weeks: 8,
    description: "Fenêtre standard (8 semaines)",
  },
  IMPACT: {
    label: "Impact",
    weeks: 12,
    description: "Fenêtre longue (12 semaines)",
  },
};

// Jalons validés (offsets en jours autour de J-Day).
const TEMPLATES: Record<WindowTemplate, MilestoneDef[]> = {
  SPRINT: [
    { key: "announce", label: "Annonce", offset: -21, phase: "PRE" },
    { key: "teaser", label: "Teasing", offset: -14, phase: "PRE" },
    { key: "prerelease", label: "Pré-sortie", offset: -7, phase: "PRE" },
    { key: "release", label: "Sortie", offset: 0, phase: "DAY" },
    { key: "tail", label: "Traîne", offset: 7, phase: "POST" },
  ],
  MARATHON: [
    { key: "announce", label: "Annonce", offset: -35, phase: "PRE" },
    { key: "teaser_1", label: "Teasing 1", offset: -28, phase: "PRE" },
    { key: "teaser_2", label: "Teasing 2", offset: -21, phase: "PRE" },
    { key: "buildup", label: "Montée", offset: -14, phase: "PRE" },
    { key: "prerelease", label: "Pré-sortie", offset: -7, phase: "PRE" },
    { key: "release", label: "Sortie", offset: 0, phase: "DAY" },
    { key: "tail_1", label: "Traîne 1", offset: 7, phase: "POST" },
    { key: "tail_2", label: "Traîne 2", offset: 14, phase: "POST" },
    { key: "review", label: "Bilan", offset: 21, phase: "POST" },
  ],
  IMPACT: [
    { key: "announce", label: "Annonce", offset: -56, phase: "PRE" },
    { key: "teaser_1", label: "Teasing 1", offset: -42, phase: "PRE" },
    { key: "teaser_2", label: "Teasing 2", offset: -28, phase: "PRE" },
    { key: "buildup_1", label: "Montée 1", offset: -21, phase: "PRE" },
    { key: "buildup_2", label: "Montée 2", offset: -14, phase: "PRE" },
    { key: "prerelease", label: "Pré-sortie", offset: -7, phase: "PRE" },
    { key: "release", label: "Sortie", offset: 0, phase: "DAY" },
    { key: "tail_1", label: "Traîne 1", offset: 7, phase: "POST" },
    { key: "tail_2", label: "Traîne 2", offset: 14, phase: "POST" },
    { key: "tail_3", label: "Traîne 3", offset: 21, phase: "POST" },
    { key: "review", label: "Bilan", offset: 28, phase: "POST" },
  ],
};

/**
 * Ajoute (ou retire) des jours à une date YYYY-MM-DD, en UTC pur.
 * On évite tout objet Date local → aucune dérive de fuseau ni de DST.
 */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Construit la timeline d'une release à partir de son template et de sa date.
 * Jalons triés par offset croissant.
 */
export function buildTimeline(
  template: WindowTemplate,
  releaseDate: string,
): Timeline {
  const defs = [...TEMPLATES[template]].sort((a, b) => a.offset - b.offset);
  const milestones: Milestone[] = defs.map((def) => ({
    ...def,
    date: addDays(releaseDate, def.offset),
  }));

  const offsets = defs.map((d) => d.offset);
  const first = Math.min(...offsets);
  const last = Math.max(...offsets);

  return {
    template,
    releaseDate,
    startDate: addDays(releaseDate, first),
    endDate: addDays(releaseDate, last),
    preDays: Math.abs(first),
    postDays: last,
    milestones,
  };
}

/** Formatage court d'un offset : "J-14", "J-Day", "J+7". */
export function formatOffset(offset: number): string {
  if (offset === 0) return "J-Day";
  return offset < 0 ? `J${offset}` : `J+${offset}`;
}
