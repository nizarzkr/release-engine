import {
  buildTimeline,
  formatOffset,
  type MilestonePhase,
  type WindowTemplate,
} from "@/lib/domain/timeline";
import { formatDateFr } from "@/lib/format";

const DOT: Record<MilestonePhase, string> = {
  PRE: "bg-sky-500",
  DAY: "bg-emerald-500",
  POST: "bg-amber-500",
};

export function TimelineView({
  template,
  releaseDate,
}: {
  template: WindowTemplate;
  releaseDate: string;
}) {
  const timeline = buildTimeline(template, releaseDate);

  return (
    <ol className="relative flex flex-col gap-1 border-l pl-6">
      {timeline.milestones.map((m) => {
        const isDay = m.phase === "DAY";
        return (
          <li key={m.key} className="relative py-2">
            <span
              className={`absolute -left-[1.65rem] top-3 h-3 w-3 rounded-full ring-2 ring-background ${DOT[m.phase]}`}
              aria-hidden
            />
            <div className="flex items-baseline gap-3">
              <span
                className={`w-14 shrink-0 text-xs font-medium ${
                  isDay ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                }`}
              >
                {formatOffset(m.offset)}
              </span>
              <span
                className={`text-sm ${isDay ? "font-semibold" : "font-medium"}`}
              >
                {m.label}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {formatDateFr(m.date)}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
