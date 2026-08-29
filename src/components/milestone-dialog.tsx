"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useActionToast } from "@/lib/use-action-toast";
import {
  createMilestone,
  deleteMilestone,
  updateMilestone,
  type MilestoneState,
} from "@/app/(app)/releases/[id]/milestone-actions";
import { isAnchor, milestoneDate } from "@/lib/domain/milestone";
import { formatOffset, type MilestoneDef } from "@/lib/domain/timeline";
import { formatDateFr } from "@/lib/format";
import { PIPELINE_LABELS, type PipelineStatus } from "@/lib/domain/content";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** Carte de contenu liée à un jalon (le peu qu'on affiche dans le dialogue). */
export type MilestoneCard = {
  id: string;
  milestone_key: string;
  pipeline_status: PipelineStatus;
  concept: string;
};

export function MilestoneDialog({
  releaseId,
  releaseDate,
  milestone,
  card,
  triggerRender,
  children,
}: {
  releaseId: string;
  releaseDate: string;
  milestone: MilestoneDef;
  card: MilestoneCard | null;
  triggerRender?: ReactElement;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const close = useCallback(() => setOpen(false), []);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setOpenCount((c) => c + 1);
      }}
    >
      <DialogTrigger render={triggerRender ?? <button type="button" />}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Jalon</DialogTitle>
        </DialogHeader>
        <MilestoneForm
          key={openCount}
          releaseId={releaseId}
          releaseDate={releaseDate}
          milestone={milestone}
          card={card}
          onSuccess={close}
        />
        {/* Hors du formulaire d'édition : deux <form> ne s'imbriquent pas. */}
        {!isAnchor(milestone) && (
          <MilestoneDeleteForm
            key={`delete-${openCount}`}
            releaseId={releaseId}
            milestoneKey={milestone.key}
            hasCard={card !== null}
            onSuccess={close}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Ajoute un jalon à la timeline. Le déclencheur est fourni par l'appelant
 * (`children`) pour que le bouton s'aligne sur la ligne de timeline qui le
 * précède, plutôt que d'imposer son style ici.
 */
export function MilestoneAddDialog({
  releaseId,
  releaseDate,
  children,
}: {
  releaseId: string;
  releaseDate: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const close = useCallback(() => setOpen(false), []);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setOpenCount((c) => c + 1);
      }}
    >
      <DialogTrigger render={<button type="button" />}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau jalon</DialogTitle>
        </DialogHeader>
        <MilestoneForm
          key={openCount}
          releaseId={releaseId}
          releaseDate={releaseDate}
          milestone={null}
          card={null}
          onSuccess={close}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * Formulaire d'un jalon, partagé par l'édition et la création : mêmes champs,
 * seule l'action diffère. En création (`milestone` null) la date est vide et
 * libre — c'est elle qui donnera au jalon sa position dans la timeline.
 */
function MilestoneForm({
  releaseId,
  releaseDate,
  milestone,
  card,
  onSuccess,
}: {
  releaseId: string;
  releaseDate: string;
  milestone: MilestoneDef | null;
  card: MilestoneCard | null;
  onSuccess: () => void;
}) {
  const action = milestone
    ? updateMilestone.bind(null, releaseId, milestone.key)
    : createMilestone.bind(null, releaseId);
  const [state, formAction, pending] = useActionState<MilestoneState, FormData>(
    action,
    {},
  );
  useActionToast(state, milestone ? "Jalon enregistré." : "Jalon ajouté.");
  useEffect(() => {
    if (state.ok) onSuccess();
  }, [state.ok, onSuccess]);

  const anchored = milestone ? isAnchor(milestone) : false;
  const date = milestone ? milestoneDate(milestone, releaseDate) : "";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="label">Titre</Label>
        <Input
          id="label"
          name="label"
          defaultValue={milestone?.label ?? ""}
          placeholder="Teasing 1, Annonce…"
          required
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          name="date"
          type="date"
          defaultValue={date}
          disabled={anchored}
          readOnly={anchored}
          required
        />
        <p className="text-xs text-muted-foreground">
          {!milestone
            ? `Sortie le ${formatDateFr(releaseDate)} — la date choisie place le jalon dans la timeline.`
            : anchored
              ? "Jour de sortie — se modifie dans l'édition de la release."
              : `${formatOffset(milestone.offset)} · déplaçable aussi à la souris sur la timeline.`}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="concept">Concept</Label>
        <Textarea
          id="concept"
          name="concept"
          rows={3}
          defaultValue={card?.concept ?? ""}
          placeholder="L'idée du contenu à produire pour ce jalon…"
        />
        <p className="text-xs text-muted-foreground">
          Même champ que le concept de la carte dans le Studio.
        </p>
      </div>

      {card ? (
        <div className="rounded-lg border bg-secondary p-3 text-xs">
          <p className="font-medium text-foreground">
            Carte liée · {PIPELINE_LABELS[card.pipeline_status]}
          </p>
          <p className="mt-1 text-muted-foreground">
            Le titre, la date et le concept suivent le jalon. Le reste du brief
            (hook, structure, son, CTA) se saisit dans la carte.
          </p>
          <Link
            href={`/releases/${releaseId}/board`}
            className="mt-2 inline-block font-medium text-primary hover:underline"
          >
            Ouvrir le pipeline →
          </Link>
        </div>
      ) : (
        <label className="flex items-start gap-2.5 rounded-lg border border-dashed p-3">
          <input
            type="checkbox"
            name="create_card"
            className="mt-0.5 h-4 w-4 accent-primary"
          />
          <span className="text-xs">
            <span className="font-medium text-foreground">
              Créer la carte dans le Studio
            </span>
            <span className="mt-0.5 block text-muted-foreground">
              Ajoute une carte au pipeline (colonne Backlog) pour produire le
              contenu de ce jalon. Saisir un concept la crée aussi.
            </span>
          </span>
        </label>
      )}

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "…" : milestone ? "Enregistrer" : "Ajouter le jalon"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Suppression d'un jalon, en deux temps : le premier clic n'arme que la
 * confirmation, seul le second soumet. La carte emportée peut contenir tout un
 * brief — c'est la seule chose ici qu'on ne puisse pas resaisir en deux clics.
 *
 * L'état d'armement est local et repart à zéro à chaque ouverture du dialogue
 * (le parent remonte ce composant), donc jamais de bouton resté armé.
 */
function MilestoneDeleteForm({
  releaseId,
  milestoneKey,
  hasCard,
  onSuccess,
}: {
  releaseId: string;
  milestoneKey: string;
  hasCard: boolean;
  onSuccess: () => void;
}) {
  const [armed, setArmed] = useState(false);
  const action = deleteMilestone.bind(null, releaseId, milestoneKey);
  const [state, formAction, pending] = useActionState<MilestoneState, FormData>(
    action,
    {},
  );
  useActionToast(
    state,
    hasCard ? "Jalon et carte supprimés." : "Jalon supprimé.",
  );
  useEffect(() => {
    if (state.ok) onSuccess();
  }, [state.ok, onSuccess]);

  return (
    <form
      action={formAction}
      className="flex items-center justify-between gap-3 border-t pt-3"
    >
      {armed ? (
        <>
          <p className="text-xs font-medium text-destructive">
            {hasCard
              ? "Supprimer ce jalon et sa carte ?"
              : "Supprimer ce jalon ?"}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => setArmed(false)}
            >
              Annuler
            </Button>
            <Button type="submit" variant="destructive" size="sm" disabled={pending}>
              {pending ? "…" : "Confirmer"}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {hasCard
              ? "Supprime aussi la carte liée dans le Studio."
              : "Aucune carte liée à supprimer."}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setArmed(true)}
            className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </Button>
        </>
      )}
    </form>
  );
}
