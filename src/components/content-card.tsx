import type { Tables } from "@/types/database.types";
import type { AutoTag, AutoTagTone } from "@/lib/domain/content-tags";
import { cardTitle, FORMAT_LABELS, type ContentFormat } from "@/lib/domain/content";
import { formatDateFr } from "@/lib/format";
import { ContentDialog } from "@/components/content-dialog";

export type BoardItem = Tables<"content_item"> & {
  autoTags: AutoTag[];
  sourceBlockLabel: string | null;
};

const TONE_CLASS: Record<AutoTagTone, string> = {
  warning:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  info: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  danger: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
};

export function ContentCard({
  item,
  releaseId,
  sourceBlocks,
  dragging,
}: {
  item: BoardItem;
  releaseId: string;
  sourceBlocks: { id: string; label: string }[];
  dragging?: boolean;
}) {
  const manualTags = item.tags ?? [];

  return (
    <div
      className={`rounded-lg border bg-card p-3 shadow-sm ${
        dragging ? "ring-2 ring-ring" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{cardTitle(item)}</p>
        <ContentDialog
          item={item}
          releaseId={releaseId}
          sourceBlocks={sourceBlocks}
        />
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span>{item.theme}</span>
        {item.platform && <span>· {item.platform}</span>}
        {item.format && (
          <span>· {FORMAT_LABELS[item.format as ContentFormat] ?? item.format}</span>
        )}
      </div>

      {(item.scheduled_date || item.sourceBlockLabel) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {item.scheduled_date && (
            <span>📅 {formatDateFr(item.scheduled_date)}</span>
          )}
          {item.sourceBlockLabel && <span>🎬 {item.sourceBlockLabel}</span>}
        </div>
      )}

      {(item.autoTags.length > 0 || manualTags.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.autoTags.map((t) => (
            <TagChip key={t.label} tone={t.tone}>
              {t.label}
            </TagChip>
          ))}
          {manualTags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function TagChip({
  tone,
  children,
}: {
  tone: AutoTagTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}
