import Link from "next/link";
import type {
  CalendarMonth,
  CalendarEvent,
  CalendarEventKind,
} from "@/lib/domain/calendar-month";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Styles par type d'événement (pastille + fond du lien).
const KIND_STYLE: Record<
  CalendarEventKind,
  { dot: string; pill: string; legend: string }
> = {
  RELEASE: {
    dot: "bg-emerald-500",
    pill: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25",
    legend: "Sortie",
  },
  CONTENT: {
    dot: "bg-sky-500",
    pill: "bg-sky-500/15 text-sky-700 dark:text-sky-300 hover:bg-sky-500/25",
    legend: "Contenu",
  },
  CHECKLIST: {
    dot: "bg-amber-500",
    pill: "bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25",
    legend: "Checklist",
  },
};

const MAX_VISIBLE = 3;

export function ReleaseCalendar({
  model,
  today,
}: {
  model: CalendarMonth;
  today: string;
}) {
  const todayMonth = { y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) };
  const isCurrentMonth =
    model.year === todayMonth.y && model.month === todayMonth.m;

  return (
    <div className="flex flex-col gap-3">
      {/* Barre de navigation mois */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-medium capitalize">{model.label}</h2>
        <div className="flex items-center gap-2">
          <Link
            href={`/calendar?y=${model.prev.year}&m=${model.prev.month}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
            aria-label="Mois précédent"
          >
            ←
          </Link>
          {!isCurrentMonth && (
            <Link
              href={`/calendar?y=${todayMonth.y}&m=${todayMonth.m}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Aujourd&apos;hui
            </Link>
          )}
          <Link
            href={`/calendar?y=${model.next.year}&m=${model.next.month}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
            aria-label="Mois suivant"
          >
            →
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* En-tête jours de la semaine */}
          <div className="grid grid-cols-7 border-b text-xs font-medium text-muted-foreground">
            {model.weekdayLabels.map((d) => (
              <div key={d} className="px-2 py-1.5">
                {d}
              </div>
            ))}
          </div>

          {/* Grille des semaines */}
          <div className="grid grid-cols-7">
            {model.weeks.flat().map((cell) => (
              <div
                key={cell.date}
                className={cn(
                  "min-h-24 border-b border-r p-1 [&:nth-child(7n)]:border-r-0",
                  !cell.inMonth && "bg-muted/30",
                )}
              >
                <div
                  className={cn(
                    "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    cell.inMonth
                      ? "text-foreground"
                      : "text-muted-foreground/50",
                    cell.isToday && "bg-primary font-semibold text-primary-foreground",
                  )}
                >
                  {cell.day}
                </div>

                <div className="flex flex-col gap-0.5">
                  {cell.events.slice(0, MAX_VISIBLE).map((ev) => (
                    <EventPill key={ev.id} event={ev} />
                  ))}
                  {cell.events.length > MAX_VISIBLE && (
                    <span className="px-1 text-[11px] text-muted-foreground">
                      +{cell.events.length - MAX_VISIBLE} autres
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {(Object.keys(KIND_STYLE) as CalendarEventKind[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-full", KIND_STYLE[k].dot)} />
            {KIND_STYLE[k].legend}
          </span>
        ))}
        {model.totalEvents === 0 && (
          <span>Aucun événement ce mois-ci.</span>
        )}
      </div>
    </div>
  );
}

function EventPill({ event }: { event: CalendarEvent }) {
  const style = KIND_STYLE[event.kind];
  return (
    <Link
      href={event.href}
      title={event.label}
      className={cn(
        "block truncate rounded px-1 py-0.5 text-[11px] leading-tight transition-colors",
        style.pill,
      )}
    >
      {event.label}
    </Link>
  );
}
