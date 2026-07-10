import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type {
  CalendarMonth,
  CalendarEvent,
  CalendarEventKind,
} from "@/lib/domain/calendar-month";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Styles par type d'événement (pastille + fond du lien), thème crème.
const KIND_STYLE: Record<
  CalendarEventKind,
  { dot: string; pill: string; legend: string }
> = {
  RELEASE: {
    dot: "bg-[#1E8A5F]",
    pill: "bg-[#eaf4ee] text-[#1e7a54] hover:bg-[#dcece3]",
    legend: "Sortie",
  },
  CONTENT: {
    dot: "bg-[#3E6DAE]",
    pill: "bg-[#e9eff7] text-[#345c93] hover:bg-[#dde7f3]",
    legend: "Contenu",
  },
  CHECKLIST: {
    dot: "bg-[#C08A2E]",
    pill: "bg-[#f6eedc] text-[#9a6d1e] hover:bg-[#efe4cd]",
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
    <div className="flex flex-col gap-4">
      {/* Barre de navigation mois */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold capitalize tracking-tight">
          {model.label}
        </h2>
        <div className="flex items-center gap-2">
          <Link
            href={`/calendar?y=${model.prev.year}&m=${model.prev.month}`}
            className={buttonVariants({ variant: "outline", size: "icon-sm" })}
            aria-label="Mois précédent"
          >
            <ChevronLeft className="h-4 w-4" />
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
            className={buttonVariants({ variant: "outline", size: "icon-sm" })}
            aria-label="Mois suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* En-tête jours de la semaine */}
            <div className="grid grid-cols-7 border-b bg-secondary text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {model.weekdayLabels.map((d) => (
                <div key={d} className="px-2 py-2">
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
                    "min-h-24 border-b border-r p-1.5 [&:nth-child(7n)]:border-r-0",
                    !cell.inMonth && "bg-secondary/60",
                  )}
                >
                  <div
                    className={cn(
                      "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs tabular-nums",
                      cell.inMonth
                        ? "text-foreground"
                        : "text-muted-foreground/50",
                      cell.isToday &&
                        "bg-primary font-semibold text-primary-foreground",
                    )}
                  >
                    {cell.day}
                  </div>

                  <div className="flex flex-col gap-1">
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
      </Card>

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {(Object.keys(KIND_STYLE) as CalendarEventKind[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-full", KIND_STYLE[k].dot)} />
            {KIND_STYLE[k].legend}
          </span>
        ))}
        {model.totalEvents === 0 && <span>Aucun événement ce mois-ci.</span>}
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
        "block truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-tight transition-colors",
        style.pill,
      )}
    >
      {event.label}
    </Link>
  );
}
