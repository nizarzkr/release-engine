import {
  buildTimeline,
  daysBetween,
  type WindowTemplate,
} from "./timeline";

export type CalendarReleaseInput = {
  id: string;
  title: string;
  type: string | null;
  window_template: string | null;
  release_date: string;
};

export type CalendarRow = {
  id: string;
  title: string;
  type: string | null;
  startDate: string;
  endDate: string;
  releaseDate: string;
  leftPct: number;
  widthPct: number;
  markerPct: number; // position du jour de sortie sur l'axe global
};

export type CalendarModel = {
  minDate: string;
  maxDate: string;
  totalDays: number;
  todayPct: number | null;
  rows: CalendarRow[];
  monthTicks: { label: string; leftPct: number }[];
};

const clamp = (n: number) => Math.max(0, Math.min(100, n));

function monthLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/**
 * Construit le modèle du calendrier Gantt multi-release (fonction PURE).
 * Chaque release devient une barre positionnée sur l'étendue globale.
 */
export function buildCalendarModel(
  releases: CalendarReleaseInput[],
  today: string,
): CalendarModel {
  if (releases.length === 0) {
    return {
      minDate: today,
      maxDate: today,
      totalDays: 0,
      todayPct: null,
      rows: [],
      monthTicks: [],
    };
  }

  const timelines = releases.map((r) => ({
    release: r,
    tl: buildTimeline(
      (r.window_template ?? "MARATHON") as WindowTemplate,
      r.release_date,
    ),
  }));

  let minDate = timelines[0].tl.startDate;
  let maxDate = timelines[0].tl.endDate;
  for (const { tl } of timelines) {
    if (tl.startDate < minDate) minDate = tl.startDate;
    if (tl.endDate > maxDate) maxDate = tl.endDate;
  }

  const totalDays = Math.max(1, daysBetween(minDate, maxDate));

  const rows: CalendarRow[] = timelines
    .map(({ release, tl }) => {
      const left = (daysBetween(minDate, tl.startDate) / totalDays) * 100;
      const width = (daysBetween(tl.startDate, tl.endDate) / totalDays) * 100;
      const marker = (daysBetween(minDate, tl.releaseDate) / totalDays) * 100;
      return {
        id: release.id,
        title: release.title,
        type: release.type,
        startDate: tl.startDate,
        endDate: tl.endDate,
        releaseDate: tl.releaseDate,
        leftPct: clamp(left),
        widthPct: clamp(width),
        markerPct: clamp(marker),
      };
    })
    .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));

  const todayPct =
    today >= minDate && today <= maxDate
      ? clamp((daysBetween(minDate, today) / totalDays) * 100)
      : null;

  // Ticks de mois : premiers jours de mois dans [minDate, maxDate].
  const monthTicks: { label: string; leftPct: number }[] = [];
  const [my, mm] = minDate.split("-").map(Number);
  let cursor = `${my}-${String(mm).padStart(2, "0")}-01`;
  if (cursor < minDate) {
    // avancer au mois suivant si le 1er du mois de min est avant min
    cursor = nextMonthFirst(cursor);
  }
  let guard = 0;
  while (cursor <= maxDate && guard < 240) {
    monthTicks.push({
      label: monthLabel(cursor),
      leftPct: clamp((daysBetween(minDate, cursor) / totalDays) * 100),
    });
    cursor = nextMonthFirst(cursor);
    guard++;
  }

  return { minDate, maxDate, totalDays, todayPct, rows, monthTicks };
}

function nextMonthFirst(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}
