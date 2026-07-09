import Link from "next/link";
import type { CalendarModel } from "@/lib/domain/calendar";
import { formatDateFr } from "@/lib/format";

export function ReleaseCalendar({ model }: { model: CalendarModel }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          {/* Axe : ticks de mois */}
          <div className="grid grid-cols-[10rem_1fr] items-end">
            <div />
            <div className="relative h-5">
              {model.monthTicks.map((t) => (
                <span
                  key={`${t.label}-${t.leftPct}`}
                  className="absolute -translate-x-1/2 text-[11px] text-muted-foreground"
                  style={{ left: `${t.leftPct}%` }}
                >
                  {t.label}
                </span>
              ))}
            </div>
          </div>

          {/* Lignes : une barre par release */}
          <div className="flex flex-col gap-2 pt-2">
            {model.rows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[10rem_1fr] items-center gap-2"
              >
                <Link
                  href={`/releases/${row.id}`}
                  className="truncate text-sm font-medium hover:underline"
                  title={row.title}
                >
                  {row.title}
                </Link>

                <div className="relative h-8 rounded bg-muted/30">
                  {model.todayPct !== null && (
                    <div
                      className="absolute inset-y-0 z-10 w-px bg-foreground/50"
                      style={{ left: `${model.todayPct}%` }}
                      aria-hidden
                    />
                  )}

                  <Link
                    href={`/releases/${row.id}`}
                    className="absolute inset-y-1 rounded bg-primary/25 transition-colors hover:bg-primary/40"
                    style={{ left: `${row.leftPct}%`, width: `${row.widthPct}%` }}
                    title={`Fenêtre : ${formatDateFr(row.startDate)} → ${formatDateFr(row.endDate)}`}
                  />

                  <span
                    className="absolute top-1/2 z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500 ring-2 ring-background"
                    style={{ left: `${row.markerPct}%` }}
                    title={`Sortie : ${formatDateFr(row.releaseDate)}`}
                    aria-hidden
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-emerald-500" /> jour de sortie
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-primary/25" /> fenêtre de promo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-px bg-foreground/50" /> aujourd&apos;hui
        </span>
      </div>
    </div>
  );
}
