"use client";

import { useState, useTransition } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";
import {
  formatOffset,
  type MilestoneDef,
} from "@/lib/domain/timeline";
import {
  isAnchor,
  milestoneDate,
  reorderMilestones,
  sortMilestones,
} from "@/lib/domain/milestone";
import { MILESTONE_PHASE_COLORS } from "@/lib/domain/release-template";
import { PIPELINE_COLORS, PIPELINE_LABELS } from "@/lib/domain/content";
import { moveMilestone } from "@/app/(app)/releases/[id]/milestone-actions";
import { MilestoneDialog, type MilestoneCard } from "@/components/milestone-dialog";
import { formatDateFr } from "@/lib/format";

/**
 * Timeline d'une release. Sans `releaseId`, c'est un simple aperçu en lecture
 * seule ; avec, chaque jalon devient éditable (clic) et déplaçable (drag), sa
 * position dans la liste déterminant sa date.
 */
export function TimelineView({
  milestones,
  releaseDate,
  releaseId,
  cards = [],
}: {
  milestones: MilestoneDef[];
  releaseDate: string;
  releaseId?: string;
  cards?: MilestoneCard[];
}) {
  const [list, setList] = useState(() => sortMilestones(milestones));
  const [snapshot, setSnapshot] = useState(milestones);
  const [, startTransition] = useTransition();

  // Resync quand le serveur renvoie un nouveau snapshot (édition, drag validé).
  // Ajustement pendant le rendu plutôt que dans un effet : pas de rendu en
  // cascade, et l'état optimiste du drag n'est jamais affiché en retard.
  if (snapshot !== milestones) {
    setSnapshot(milestones);
    setList(sortMilestones(milestones));
  }

  const cardOf = (key: string) =>
    cards.find((c) => c.milestone_key === key) ?? null;

  if (!releaseId) {
    return (
      <TimelineFrame>
        {list.map((m) => (
          <li key={m.key} className="flex items-center gap-3 py-2">
            <MilestoneRow milestone={m} releaseDate={releaseDate} card={null} />
          </li>
        ))}
      </TimelineFrame>
    );
  }

  function onDragEnd(result: DropResult) {
    const { source, destination } = result;
    if (!destination || destination.index === source.index) return;

    // Même fonction pure côté client et côté serveur → pas de divergence.
    const next = reorderMilestones(list, source.index, destination.index);
    if (!next) return;

    setList(next.milestones);
    startTransition(() => {
      moveMilestone(releaseId!, source.index, destination.index);
    });
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="timeline">
        {(provided) => (
          <TimelineFrame ref={provided.innerRef} {...provided.droppableProps}>
            {list.map((m, index) => (
              <Draggable
                draggableId={m.key}
                index={index}
                key={m.key}
                isDragDisabled={isAnchor(m)}
              >
                {(dp, ds) => (
                  <li
                    ref={dp.innerRef}
                    {...dp.draggableProps}
                    className={`group flex items-center gap-3 rounded-lg py-2 pr-1 transition-colors ${
                      ds.isDragging ? "bg-card ring-1 ring-primary/30" : ""
                    }`}
                  >
                    <MilestoneDialog
                      releaseId={releaseId}
                      releaseDate={releaseDate}
                      milestone={m}
                      card={cardOf(m.key)}
                      triggerRender={
                        <button
                          type="button"
                          className="flex flex-1 items-center gap-3 rounded-md text-left transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      }
                    >
                      <MilestoneRow
                        milestone={m}
                        releaseDate={releaseDate}
                        card={cardOf(m.key)}
                      />
                    </MilestoneDialog>

                    <span
                      {...dp.dragHandleProps}
                      aria-label={
                        isAnchor(m)
                          ? "Jalon ancré à la date de sortie"
                          : "Déplacer le jalon"
                      }
                      className={`shrink-0 rounded p-0.5 ${
                        isAnchor(m)
                          ? "invisible"
                          : "cursor-grab text-muted-foreground/30 transition-colors group-hover:text-muted-foreground active:cursor-grabbing"
                      }`}
                    >
                      <GripVertical className="h-4 w-4" />
                    </span>
                  </li>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </TimelineFrame>
        )}
      </Droppable>
    </DragDropContext>
  );
}

/** Filet vertical de la timeline + liste. La pastille de chaque ligne se
 *  superpose au filet : elle reste dans le flux, donc elle suit le drag. */
function TimelineFrame({
  children,
  ref,
  ...props
}: React.ComponentProps<"ol">) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="absolute bottom-4 left-[7px] top-4 w-px bg-border"
      />
      <ol ref={ref} className="relative flex flex-col" {...props}>
        {children}
      </ol>
    </div>
  );
}

/** Contenu d'une ligne : pastille, J±, titre, état de la carte liée, date. */
function MilestoneRow({
  milestone,
  releaseDate,
  card,
}: {
  milestone: MilestoneDef;
  releaseDate: string;
  card: MilestoneCard | null;
}) {
  const day = milestone.phase === "DAY";
  return (
    <>
      <span
        className="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-background"
        style={{ background: MILESTONE_PHASE_COLORS[milestone.phase] }}
        aria-hidden
      />
      <span
        className={`w-12 shrink-0 text-xs font-medium ${
          day ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
        }`}
      >
        {formatOffset(milestone.offset)}
      </span>
      <span className={`truncate text-sm ${day ? "font-semibold" : "font-medium"}`}>
        {milestone.label}
      </span>
      {card && (
        <span
          className="flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
          title="Carte liée dans le pipeline"
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: PIPELINE_COLORS[card.pipeline_status] }}
          />
          {PIPELINE_LABELS[card.pipeline_status]}
        </span>
      )}
      <span className="ml-auto shrink-0 pl-2 text-xs text-muted-foreground">
        {formatDateFr(milestoneDate(milestone, releaseDate))}
      </span>
    </>
  );
}
