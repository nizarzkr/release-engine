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
  updateMilestone,
  type MilestoneState,
} from "@/app/(app)/releases/[id]/milestone-actions";
import { isAnchor, milestoneDate } from "@/lib/domain/milestone";
import { formatOffset, type MilestoneDef } from "@/lib/domain/timeline";
import { PIPELINE_LABELS, type PipelineStatus } from "@/lib/domain/content";
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
      </DialogContent>
    </Dialog>
  );
}

function MilestoneForm({
  releaseId,
  releaseDate,
  milestone,
  card,
  onSuccess,
}: {
  releaseId: string;
  releaseDate: string;
  milestone: MilestoneDef;
  card: MilestoneCard | null;
  onSuccess: () => void;
}) {
  const action = updateMilestone.bind(null, releaseId, milestone.key);
  const [state, formAction, pending] = useActionState<MilestoneState, FormData>(
    action,
    {},
  );
  useActionToast(state, "Jalon enregistré.");
  useEffect(() => {
    if (state.ok) onSuccess();
  }, [state.ok, onSuccess]);

  const anchored = isAnchor(milestone);
  const date = milestoneDate(milestone, releaseDate);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="label">Titre</Label>
        <Input
          id="label"
          name="label"
          defaultValue={milestone.label}
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
        />
        <p className="text-xs text-muted-foreground">
          {anchored
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
          {pending ? "…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
