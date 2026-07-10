"use client";

import { CalendarDays, Disc3 } from "lucide-react";
import {
  cardTitle,
  PIPELINE_LABELS,
  FORMAT_LABELS,
  type PipelineStatus,
  type ContentFormat,
} from "@/lib/domain/content";
import { formatDateFr } from "@/lib/format";
import { ContentDialog } from "@/components/content-dialog";
import type { BoardItem } from "@/components/content-card";
import { cn } from "@/lib/utils";

const STATUS_PILL: Record<PipelineStatus, string> = {
  BACKLOG: "bg-secondary text-muted-foreground ring-1 ring-border",
  A_TOURNER: "bg-[#f6eedc] text-[#9a6d1e]",
  A_MONTER: "bg-[#e9eff7] text-[#345c93]",
  READY: "bg-[#eaf4ee] text-[#1e7a54]",
};

const STATUS_DOT: Record<PipelineStatus, string> = {
  BACKLOG: "#B0AB9F",
  A_TOURNER: "#C08A2E",
  A_MONTER: "#3E6DAE",
  READY: "#1E8A5F",
};

export function BoardList({
  items,
  sourceBlocks,
  showRelease,
}: {
  items: BoardItem[];
  sourceBlocks: { id: string; label: string }[];
  showRelease?: boolean;
}) {
  const cols = showRelease
    ? "grid-cols-[1fr_130px_110px_78px_130px_92px]"
    : "grid-cols-[1fr_110px_78px_130px_92px]";

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
        Aucun contenu ne correspond à ces filtres.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
      <div className="min-w-[720px]">
        {/* En-tête */}
        <div
          className={cn(
            "grid items-center gap-3.5 border-b bg-secondary px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
            cols,
          )}
        >
          <div>Contenu</div>
          {showRelease && <div>Release</div>}
          <div>Plateforme</div>
          <div>Format</div>
          <div>Statut</div>
          <div>Date</div>
        </div>

        {/* Lignes */}
        {items.map((it) => {
          const status = (it.pipeline_status ?? "BACKLOG") as PipelineStatus;
          return (
            <ContentDialog
              key={it.id}
              item={it}
              releaseId={it.release_id}
              sourceBlocks={sourceBlocks}
              triggerRender={
                <div
                  className={cn(
                    "grid w-full cursor-pointer items-center gap-3.5 border-b px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-secondary",
                    cols,
                  )}
                />
              }
              triggerChildren={
                <>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {cardTitle(it)}
                    </div>
                    {it.theme && (
                      <div className="truncate text-xs text-muted-foreground">
                        {it.theme}
                      </div>
                    )}
                  </div>
                  {showRelease && (
                    <div className="min-w-0">
                      {it.releaseTitle && (
                        <span className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-[11.5px] font-medium text-muted-foreground ring-1 ring-border">
                          <Disc3 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{it.releaseTitle}</span>
                        </span>
                      )}
                    </div>
                  )}
                  <div className="truncate text-[13px] text-foreground/80">
                    {it.platform || "—"}
                  </div>
                  <div>
                    {it.format ? (
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-[11.5px] font-medium text-foreground/80 ring-1 ring-border">
                        {FORMAT_LABELS[it.format as ContentFormat] ?? it.format}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                  <div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium",
                        STATUS_PILL[status],
                      )}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: STATUS_DOT[status] }}
                      />
                      {PIPELINE_LABELS[status]}
                    </span>
                  </div>
                  <div className="text-[12.5px] text-muted-foreground">
                    {it.scheduled_date ? (
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDateFr(it.scheduled_date)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </div>
                </>
              }
            />
          );
        })}
      </div>
    </div>
  );
}
