// Moteur du calendrier mensuel — logique métier PURE (aucune dépendance React/DB).
// Agrège 3 sources d'événements datés (sorties, contenus, checklist) dans une
// grille mois (semaines lundi→dimanche) navigable.

import { addDays } from "./timeline";

export const CALENDAR_EVENT_KINDS = ["RELEASE", "CONTENT", "CHECKLIST"] as const;
export type CalendarEventKind = (typeof CALENDAR_EVENT_KINDS)[number];

export type CalendarEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  kind: CalendarEventKind;
  label: string;
  href: string; // destination au clic
};

export type CalendarDay = {
  date: string; // YYYY-MM-DD
  day: number; // quantième (1-31)
  inMonth: boolean; // appartient au mois affiché
  isToday: boolean;
  events: CalendarEvent[];
};

export type CalendarMonth = {
  year: number;
  month: number; // 1-12
  label: string; // "juillet 2026"
  weekdayLabels: string[]; // Lun … Dim
  weeks: CalendarDay[][]; // lignes de 7 jours (lundi d'abord)
  prev: { year: number; month: number };
  next: { year: number; month: number };
  totalEvents: number;
};

// Libellés courts des jours, lundi d'abord.
const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/** Index du jour de la semaine (lundi=0 … dimanche=6) pour une date UTC. */
function mondayFirstIndex(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // dim=0 … sam=6
  return (jsDay + 6) % 7;
}

/** Nombre de jours dans un mois (année/mois 1-12). */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Mois précédent / suivant (avec passage d'année). */
function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const zero = month - 1 + delta; // index 0-based cumulable
  const y = year + Math.floor(zero / 12);
  const m = ((zero % 12) + 12) % 12;
  return { year: y, month: m + 1 };
}

/** Libellé "juillet 2026" du mois affiché. */
function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

/**
 * Construit la grille du mois demandé et y range les événements par date.
 * `today` (YYYY-MM-DD) sert à marquer le jour courant.
 */
export function buildMonthGrid(
  year: number,
  month: number,
  events: CalendarEvent[],
  today: string,
): CalendarMonth {
  // Regroupe les événements par date (ordre stable : sorties, contenus, checklist).
  const kindRank: Record<CalendarEventKind, number> = {
    RELEASE: 0,
    CONTENT: 1,
    CHECKLIST: 2,
  };
  const byDate = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const bucket = byDate.get(ev.date);
    if (bucket) bucket.push(ev);
    else byDate.set(ev.date, [ev]);
  }
  for (const bucket of byDate.values()) {
    bucket.sort(
      (a, b) => kindRank[a.kind] - kindRank[b.kind] || a.label.localeCompare(b.label),
    );
  }

  const firstOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
  const lead = mondayFirstIndex(firstOfMonth); // cases vides avant le 1er
  const gridStart = addDays(firstOfMonth, -lead);
  const cellCount = Math.ceil((lead + daysInMonth(year, month)) / 7) * 7;

  const weeks: CalendarDay[][] = [];
  let totalEvents = 0;
  for (let i = 0; i < cellCount; i++) {
    const date = addDays(gridStart, i);
    const dayEvents = byDate.get(date) ?? [];
    const inMonth = date.startsWith(firstOfMonth.slice(0, 7));
    if (inMonth) totalEvents += dayEvents.length;
    const cell: CalendarDay = {
      date,
      day: Number(date.slice(8, 10)),
      inMonth,
      isToday: date === today,
      events: dayEvents,
    };
    if (i % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1].push(cell);
  }

  return {
    year,
    month,
    label: monthLabel(year, month),
    weekdayLabels: WEEKDAY_LABELS,
    weeks,
    prev: shiftMonth(year, month, -1),
    next: shiftMonth(year, month, 1),
    totalEvents,
  };
}
