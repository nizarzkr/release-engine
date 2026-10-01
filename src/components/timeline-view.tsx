"use client";

import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Check, CheckSquare, GripVertical, Plus, Trash2, X } from "lucide-react";
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
import {
  deleteMilestones,
  moveMilestone,
} from "@/app/(app)/releases/[id]/milestone-actions";
import {
  MilestoneAddDialog,
  MilestoneDialog,
  type MilestoneCard,
} from "@/components/milestone-dialog";
import { formatDateFr } from "@/lib/format";

/**
 * Timeline d'une release. Sans `releaseId`, c'est un simple aperçu en lecture
 * seule ; avec, chaque jalon devient éditable (clic) et déplaçable (drag), sa
 * position dans la liste déterminant sa date. Le mode « Sélectionner »
 * permet de supprimer plusieurs jalons d'un coup (cartes liées conservées).
 */
export function TimelineView({
  milestones,
  releaseDate,
  releaseId,
  cards = [],
  headerActions,
}: {
  milestones: MilestoneDef[];
  releaseDate: string;
  releaseId?: string;
  cards?: MilestoneCard[];
  // Boutons de l'en-tête (export, enregistrer comme format), masqués
  // pendant la sélection au profit de la barre d'actions.
  headerActions?: ReactNode;
}) {
  const [list, setList] = useState(() => sortMilestones(milestones));
  const [snapshot, setSnapshot] = useState(milestones);
  const [, startTransition] = useTransition();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [deleting, startDelete] = useTransition();

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

  // Le jour de sortie n'est jamais sélectionnable : il ancre la timeline.
  const selectableKeys = list.filter((m) => !isAnchor(m)).map((m) => m.key);
  const allSelected =
    selectableKeys.length > 0 && selectableKeys.every((k) => selected.has(k));
  const linkedCount = cards.filter((c) => selected.has(c.milestone_key)).length;

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(selectableKeys));
  const exitSelection = () => {
    setSelecting(false);
    setSelected(new Set());
    setConfirming(false);
  };

  const runDelete = () => {
    const keys = [...selected];
    if (keys.length === 0) return;
    startDelete(async () => {
      const res = await deleteMilestones(releaseId!, keys);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      const n = res.deleted ?? keys.length;
      toast.success(
        `${n} jalon${n > 1 ? "s" : ""} supprimé${n > 1 ? "s" : ""}.`,
      );
      exitSelection();
    });
  };

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
    <div className="flex flex-col gap-4">
      {selecting ? (
        <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-primary/40 bg-primary/5 px-3.5 py-2.5">
          <button
            type="button"
            onClick={toggleAll}
            className="text-[13px] font-medium text-primary underline underline-offset-2"
          >
            {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
          </button>
          <span className="text-[13px] text-muted-foreground">
            {selected.size} sélectionné{selected.size > 1 ? "s" : ""}
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-2.5">
            {confirming ? (
              <>
                <span className="text-[13px] text-foreground">
                  Supprimer {selected.size} jalon{selected.size > 1 ? "s" : ""} ?
                  {linkedCount > 0 && (
                    <span className="text-muted-foreground">
                      {" "}
                      {linkedCount} carte{linkedCount > 1 ? "s" : ""} liée
                      {linkedCount > 1 ? "s" : ""} reste
                      {linkedCount > 1 ? "nt" : ""} dans le board.
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={runDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-2 text-[13px] font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deleting ? "Suppression…" : "Confirmer"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={deleting}
                  className="text-[13px] text-muted-foreground hover:text-foreground"
                >
                  Annuler
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={selected.size === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-2 text-[13px] font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Supprimer
                </button>
                <button
                  type="button"
                  onClick={exitSelection}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-card px-3 py-2 text-[13px] font-medium text-foreground/80 transition-colors hover:bg-secondary"
                >
                  <X className="h-3.5 w-3.5" />
                  Quitter
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-muted-foreground">
            Clique un jalon pour l&apos;éditer, glisse-le pour le redater.
          </p>
          <div className="ml-auto flex items-center gap-2">
            {selectableKeys.length > 0 && (
              <button
                type="button"
                onClick={() => setSelecting(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <CheckSquare className="h-4 w-4" />
                Sélectionner
              </button>
            )}
            {headerActions}
          </div>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="timeline">
          {(provided) => (
            <TimelineFrame
              ref={provided.innerRef}
              {...provided.droppableProps}
              footer={
                selecting ? null : (
                  <MilestoneAddDialog
                    releaseId={releaseId}
                    releaseDate={releaseDate}
                  >
                    <span className="group relative flex w-full items-center gap-3 rounded-lg py-2 text-left transition-colors hover:bg-secondary/70">
                      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground/50 bg-background ring-2 ring-background transition-colors group-hover:border-primary">
                        <Plus className="h-2.5 w-2.5 text-muted-foreground transition-colors group-hover:text-primary" />
                      </span>
                      <span className="text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                        Ajouter un jalon
                      </span>
                    </span>
                  </MilestoneAddDialog>
                )
              }
            >
              {list.map((m, index) => (
                <Draggable
                  draggableId={m.key}
                  index={index}
                  key={m.key}
                  isDragDisabled={selecting || isAnchor(m)}
                >
                  {(dp, ds) => (
                    <li
                      ref={dp.innerRef}
                      {...dp.draggableProps}
                      className={`group flex items-center gap-3 rounded-lg py-2 pr-1 transition-colors ${
                        ds.isDragging ? "bg-card ring-1 ring-primary/30" : ""
                      }`}
                    >
                      {selecting ? (
                        <SelectableRow
                          milestone={m}
                          releaseDate={releaseDate}
                          card={cardOf(m.key)}
                          checked={selected.has(m.key)}
                          onToggle={() => toggle(m.key)}
                        />
                      ) : (
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
                      )}

                      <span
                        {...dp.dragHandleProps}
                        aria-label={
                          isAnchor(m)
                            ? "Jalon ancré à la date de sortie"
                            : "Déplacer le jalon"
                        }
                        className={`shrink-0 rounded p-0.5 ${
                          selecting || isAnchor(m)
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
    </div>
  );
}

/** Ligne en mode sélection : la case à cocher remplace l'édition au clic.
 *  Le jour de sortie est grisé (non supprimable). */
function SelectableRow({
  milestone,
  releaseDate,
  card,
  checked,
  onToggle,
}: {
  milestone: MilestoneDef;
  releaseDate: string;
  card: MilestoneCard | null;
  checked: boolean;
  onToggle: () => void;
}) {
  const locked = isAnchor(milestone);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={locked}
      title={locked ? "Le jour de sortie ancre la timeline" : undefined}
      onClick={onToggle}
      className={`flex flex-1 items-center gap-3 rounded-md text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
        locked ? "cursor-not-allowed opacity-50" : "hover:bg-secondary/70"
      } ${checked ? "bg-primary/5" : ""}`}
    >
      <MilestoneRow milestone={milestone} releaseDate={releaseDate} card={card} />
      <span
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 transition-colors ${
          checked
            ? "border-primary bg-primary text-white"
            : "border-input text-transparent"
        }`}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    </button>
  );
}

/** Filet vertical de la timeline + liste. La pastille de chaque ligne se
 *  superpose au filet : elle reste dans le flux, donc elle suit le drag. */
function TimelineFrame({
  children,
  footer,
  ref,
  ...props
}: React.ComponentProps<"ol"> & { footer?: React.ReactNode }) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="absolute bottom-4 left-[7px] top-4 w-px bg-border"
      />
      <ol ref={ref} className="relative flex flex-col" {...props}>
        {children}
      </ol>
      {footer}
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
