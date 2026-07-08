"use client";

import { useEffect, useState, useTransition } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  PIPELINE_STATUSES,
  PIPELINE_LABELS,
  type PipelineStatus,
} from "@/lib/domain/content";
import {
  moveContent,
  createContent,
  type ContentState,
} from "@/app/(app)/releases/[id]/content-actions";
import { ContentCard, type BoardItem } from "@/components/content-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActionState } from "react";

type Columns = Record<PipelineStatus, BoardItem[]>;

function group(items: BoardItem[]): Columns {
  const g: Columns = { BACKLOG: [], A_TOURNER: [], A_MONTER: [], READY: [] };
  for (const it of items) {
    const s = (it.pipeline_status ?? "BACKLOG") as PipelineStatus;
    (g[s] ?? g.BACKLOG).push(it);
  }
  return g;
}

export function KanbanBoard({
  releaseId,
  items,
  sourceBlocks,
}: {
  releaseId: string;
  items: BoardItem[];
  sourceBlocks: { id: string; label: string }[];
}) {
  const [columns, setColumns] = useState<Columns>(() => group(items));
  const [, startTransition] = useTransition();

  // Resync quand le serveur renvoie de nouvelles données (create/edit/publish…).
  useEffect(() => {
    setColumns(group(items));
  }, [items]);

  function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const from = source.droppableId as PipelineStatus;
    const to = destination.droppableId as PipelineStatus;

    setColumns((prev) => {
      const next: Columns = {
        ...prev,
        [from]: [...prev[from]],
        [to]: [...prev[to]],
      };
      const [moved] = next[from].splice(source.index, 1);
      if (!moved) return prev;
      next[to].splice(destination.index, 0, { ...moved, pipeline_status: to });
      return next;
    });

    if (from !== to) {
      startTransition(() => {
        moveContent(draggableId, releaseId, to);
      });
    }
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PIPELINE_STATUSES.map((status) => (
          <Droppable droppableId={status} key={status}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`flex min-h-40 flex-col gap-2 rounded-lg border p-2 transition-colors ${
                  snapshot.isDraggingOver ? "bg-muted/60" : "bg-muted/20"
                }`}
              >
                <div className="flex items-center justify-between px-1 py-1">
                  <span className="text-sm font-medium">
                    {PIPELINE_LABELS[status]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {columns[status].length}
                  </span>
                </div>

                {status === "BACKLOG" && <QuickAdd releaseId={releaseId} />}

                {columns[status].map((item, index) => (
                  <Draggable draggableId={item.id} index={index} key={item.id}>
                    {(dp, ds) => (
                      <div
                        ref={dp.innerRef}
                        {...dp.draggableProps}
                        {...dp.dragHandleProps}
                      >
                        <ContentCard
                          item={item}
                          releaseId={releaseId}
                          sourceBlocks={sourceBlocks}
                          dragging={ds.isDragging}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}

function QuickAdd({ releaseId }: { releaseId: string }) {
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, pending] = useActionState<ContentState, FormData>(
    createContent.bind(null, releaseId),
    {},
  );

  // Réinitialise le formulaire après un ajout réussi (state est un nouvel objet
  // à chaque soumission → on dépend de son identité).
  useEffect(() => {
    if (state.ok) setFormKey((k) => k + 1);
  }, [state]);

  return (
    <form
      key={formKey}
      action={formAction}
      className="flex flex-col gap-1.5 rounded-lg border border-dashed p-2"
    >
      <Input
        name="hook"
        placeholder="Idée / hook…"
        required
        className="h-8 text-sm"
      />
      <div className="flex gap-1.5">
        <Input
          name="theme"
          placeholder="Thème"
          required
          className="h-8 text-sm"
        />
        <Input name="platform" placeholder="Plateforme" className="h-8 text-sm" />
      </div>
      <input type="hidden" name="pipeline_status" value="BACKLOG" />
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      <Button type="submit" size="xs" disabled={pending}>
        {pending ? "…" : "+ Ajouter"}
      </Button>
    </form>
  );
}
