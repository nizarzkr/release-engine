// Export d'une release (checklist, timeline de contenu) — logique métier PURE.
// Construit un modèle neutre, que les rendus PDF / CSV / Excel se contentent
// de mettre en forme : un seul endroit décide de ce qui est exporté.
import { formatDateFr } from "@/lib/format";
import {
  CHECKLIST_PHASE_LABELS,
  type ChecklistPhase,
} from "./checklist";
import {
  FORMAT_LABELS,
  OBJECTIVE_LABELS,
  PIPELINE_LABELS,
  type Brief,
  type ContentFormat,
  type ObjectiveTag,
  type PipelineStatus,
} from "./content";
import { MILESTONE_PHASE_LABELS } from "./release-template";
import { sortMilestones } from "./milestone";
import { addDays, formatOffset } from "./timeline";
import type { MilestoneDef } from "./timeline";

export const EXPORT_SCOPES = ["all", "checklist", "timeline"] as const;
export type ExportScope = (typeof EXPORT_SCOPES)[number];

export const EXPORT_FORMATS = ["pdf", "csv", "xlsx"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

/** Formats proposés par périmètre : le document unique se décline en Excel
 *  (plusieurs onglets), les exports partiels en CSV (un seul tableau). */
export const FORMATS_BY_SCOPE: Record<ExportScope, ExportFormat[]> = {
  all: ["pdf", "xlsx"],
  checklist: ["pdf", "csv"],
  timeline: ["pdf", "csv"],
};

export const SCOPE_TITLES: Record<ExportScope, string> = {
  all: "Plan de sortie",
  checklist: "Checklist",
  timeline: "Timeline de contenu",
};

export type ExportTask = {
  label: string;
  phase: string;
  date: string; // formatée, "" si non datée
  done: boolean;
};

export type ExportMilestone = {
  label: string;
  phase: string;
  offset: string; // "J-14"
  date: string;
};

export type ExportContent = {
  date: string;
  sortKey: string; // YYYY-MM-DD, "9999" si non daté (en fin de liste)
  theme: string;
  milestone: string;
  platform: string;
  format: string;
  objective: string;
  status: string;
  archived: boolean;
  source: string;
  tags: string;
  hook: string;
  concept: string;
  structure: string;
  sound: string;
  cta: string;
};

export type ReleaseExport = {
  release: { title: string; type: string; date: string; template: string };
  generatedOn: string;
  checklist: ExportTask[];
  milestones: ExportMilestone[];
  contents: ExportContent[];
};

type TaskRow = {
  label: string;
  phase: string | null;
  due_date: string | null;
  is_done: boolean | null;
};

type ContentRow = {
  theme: string;
  milestone_key: string | null;
  platform: string | null;
  format: string | null;
  objective_tag: string | null;
  pipeline_status: string | null;
  is_published: boolean | null;
  source_block_id: string | null;
  tags: string[] | null;
  scheduled_date: string | null;
  brief: unknown;
};

const label = <K extends string>(map: Record<K, string>, key: string | null) =>
  key ? (map[key as K] ?? key) : "";

export function buildReleaseExport(input: {
  release: {
    title: string;
    type: string | null;
    release_date: string;
    window_template: string | null;
  };
  milestones: MilestoneDef[];
  tasks: TaskRow[];
  contents: ContentRow[];
  sourceBlockLabels: Map<string, string>;
  today: string;
}): ReleaseExport {
  const { release } = input;
  const milestoneLabels = new Map(input.milestones.map((m) => [m.key, m.label]));

  const checklist = [...input.tasks]
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
    .map((t) => ({
      label: t.label,
      phase: label(CHECKLIST_PHASE_LABELS, t.phase as ChecklistPhase | null),
      date: t.due_date ? formatDateFr(t.due_date) : "",
      done: Boolean(t.is_done),
    }));

  const milestones = sortMilestones(input.milestones).map((m) => ({
    label: m.label,
    phase: MILESTONE_PHASE_LABELS[m.phase] ?? m.phase,
    offset: formatOffset(m.offset),
    date: formatDateFr(addDays(release.release_date, m.offset)),
  }));

  const contents = input.contents
    .map((c) => {
      const brief = (c.brief ?? {}) as Partial<Brief>;
      return {
        date: c.scheduled_date ? formatDateFr(c.scheduled_date) : "",
        sortKey: c.scheduled_date ?? "9999",
        theme: c.theme,
        milestone: c.milestone_key
          ? (milestoneLabels.get(c.milestone_key) ?? "")
          : "",
        platform: c.platform ?? "",
        format: label(FORMAT_LABELS, c.format as ContentFormat | null),
        objective: label(OBJECTIVE_LABELS, c.objective_tag as ObjectiveTag | null),
        status: label(
          PIPELINE_LABELS,
          (c.pipeline_status ?? "BACKLOG") as PipelineStatus,
        ),
        archived: Boolean(c.is_published),
        source: c.source_block_id
          ? (input.sourceBlockLabels.get(c.source_block_id) ?? "")
          : "",
        tags: (c.tags ?? []).join(", "),
        hook: brief.hook?.trim() ?? "",
        concept: brief.concept?.trim() ?? "",
        structure: brief.structure?.trim() ?? "",
        sound: brief.sound_suggestion?.trim() ?? "",
        cta: brief.cta?.trim() ?? "",
      };
    })
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  return {
    release: {
      title: release.title,
      type: release.type === "EP" ? "EP" : "Single",
      date: formatDateFr(release.release_date),
      template: release.window_template ?? "",
    },
    generatedOn: formatDateFr(input.today),
    checklist,
    milestones,
    contents,
  };
}

// --- Tableaux (CSV / Excel) -------------------------------------------------

export type Table = { name: string; header: string[]; rows: string[][] };

export function checklistTable(data: ReleaseExport): Table {
  return {
    name: "Checklist",
    header: ["Tâche", "Phase", "Échéance", "Fait"],
    rows: data.checklist.map((t) => [
      t.label,
      t.phase,
      t.date,
      t.done ? "Oui" : "Non",
    ]),
  };
}

export function milestonesTable(data: ReleaseExport): Table {
  return {
    name: "Jalons",
    header: ["Jalon", "Phase", "Repère", "Date"],
    rows: data.milestones.map((m) => [m.label, m.phase, m.offset, m.date]),
  };
}

const CONTENT_HEADER = [
  "Date",
  "Thème",
  "Jalon",
  "Plateforme",
  "Format",
  "Objectif",
  "Statut",
  "Archivé",
  "Tournage",
  "Tags",
  "Accroche",
  "Concept",
  "Structure",
  "Son suggéré",
  "CTA",
];

function contentCells(c: ExportContent): string[] {
  return [
    c.date,
    c.theme,
    c.milestone,
    c.platform,
    c.format,
    c.objective,
    c.status,
    c.archived ? "Oui" : "Non",
    c.source,
    c.tags,
    c.hook,
    c.concept,
    c.structure,
    c.sound,
    c.cta,
  ];
}

export function contentsTable(data: ReleaseExport): Table {
  return {
    name: "Contenus",
    header: CONTENT_HEADER,
    rows: data.contents.map(contentCells),
  };
}

/**
 * Timeline à plat pour le CSV : jalons et contenus mêlés dans l'ordre
 * chronologique, une colonne « Type » pour les distinguer. Les jalons
 * passent avant les contenus du même jour.
 */
export function timelineTable(
  data: ReleaseExport,
  milestoneDefs: MilestoneDef[],
  releaseDate: string,
): Table {
  const milestoneRows = sortMilestones(milestoneDefs).map((m, i) => ({
    key: `${addDays(releaseDate, m.offset)}-0`,
    cells: [
      "Jalon",
      data.milestones[i].date,
      `${m.label} (${data.milestones[i].offset})`,
      ...Array(CONTENT_HEADER.length - 2).fill(""),
    ],
  }));
  const contentRows = data.contents.map((c) => ({
    key: `${c.sortKey}-1`,
    cells: ["Contenu", ...contentCells(c)],
  }));
  return {
    name: "Timeline",
    header: ["Type", ...CONTENT_HEADER],
    rows: [...milestoneRows, ...contentRows]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((r) => r.cells),
  };
}

/**
 * CSV lisible par Excel en français : séparateur `;`, BOM UTF-8 pour les
 * accents, champs échappés (guillemets, retours à la ligne des briefs).
 */
export function toCsv(table: Table): string {
  const escape = (v: string) =>
    /[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const lines = [table.header, ...table.rows].map((r) => r.map(escape).join(";"));
  return "﻿" + lines.join("\r\n");
}

/** Nom de fichier : « plan-de-sortie-mon-single-2027-04-23.pdf ». */
export function exportFileName(
  scope: ExportScope,
  releaseTitle: string,
  releaseDate: string,
  format: ExportFormat,
): string {
  const slug = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  return `${slug(SCOPE_TITLES[scope])}-${slug(releaseTitle) || "release"}-${releaseDate}.${format}`;
}
