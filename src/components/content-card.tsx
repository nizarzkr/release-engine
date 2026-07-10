import { CalendarDays, Clapperboard, Disc3, Check } from "lucide-react";
import type { Tables } from "@/types/database.types";
import type { AutoTag, AutoTagTone } from "@/lib/domain/content-tags";
import { cardTitle, FORMAT_LABELS, type ContentFormat } from "@/lib/domain/content";
import { formatDateFr } from "@/lib/format";
import { ContentDialog } from "@/components/content-dialog";

export type BoardItem = Tables<"content_item"> & {
  autoTags: AutoTag[];
  sourceBlockLabel: string | null;
  // Renseigné uniquement sur le board global (Studio) pour situer la release.
  releaseTitle?: string | null;
};

// Tons doux alignés sur le thème crème (ambre / bleu ardoise / rose).
const TONE_CLASS: Record<AutoTagTone, string> = {
  warning: "bg-[#f6eedc] text-[#9a6d1e]",
  info: "bg-[#e9eff7] text-[#345c93]",
  danger: "bg-[#f7e8e6] text-[#a8433d]",
};

export function ContentCard({
  item,
  sourceBlocks,
  dragging,
  selectable,
  selected,
  onToggleSelect,
}: {
  item: BoardItem;
  sourceBlocks: { id: string; label: string }[];
  dragging?: boolean;
  // Mode sélection groupée (Studio) : la carte devient cliquable pour cocher,
  // et le bouton d'édition laisse place à une case à cocher.
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const manualTags = item.tags ?? [];

  return (
    <div
      onClick={selectable ? onToggleSelect : undefined}
      className={`rounded-xl border bg-card p-3 shadow-sm transition-shadow ${
        dragging ? "ring-2 ring-primary/40 shadow-md" : ""
      } ${selectable ? "cursor-pointer" : ""} ${
        selected ? "ring-2 ring-primary" : ""
      }`}
    >
      {item.releaseTitle && (
        <div className="mb-1.5 inline-flex max-w-full items-center gap-1 truncate rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border">
          <Disc3 className="h-3 w-3 shrink-0" />
          <span className="truncate">{item.releaseTitle}</span>
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{cardTitle(item)}</p>
        {selectable ? (
          <span
            className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 transition-colors ${
              selected
                ? "border-primary bg-primary text-white"
                : "border-input text-transparent"
            }`}
          >
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        ) : (
          <ContentDialog
            item={item}
            releaseId={item.release_id}
            sourceBlocks={sourceBlocks}
          />
        )}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span>{item.theme}</span>
        {item.platform && <span>· {item.platform}</span>}
        {item.format && (
          <span>· {FORMAT_LABELS[item.format as ContentFormat] ?? item.format}</span>
        )}
      </div>

      {(item.scheduled_date || item.sourceBlockLabel) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
          {item.scheduled_date && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {formatDateFr(item.scheduled_date)}
            </span>
          )}
          {item.sourceBlockLabel && (
            <span className="inline-flex items-center gap-1">
              <Clapperboard className="h-3 w-3" />
              {item.sourceBlockLabel}
            </span>
          )}
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
