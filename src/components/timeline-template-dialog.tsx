"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { useActionToast } from "@/lib/use-action-toast";
import {
  saveTimelineAsTemplate,
  type MilestoneState,
} from "@/app/(app)/releases/[id]/milestone-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Enregistre la timeline courante (jalons renommés/réordonnés) comme nouveau
 * format de release réutilisable pour les prochaines sorties.
 */
export function TimelineTemplateDialog({
  releaseId,
  count,
  defaultName,
}: {
  releaseId: string;
  count: number;
  defaultName: string;
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
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Bookmark className="h-4 w-4" />
        Enregistrer comme format
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau format de release</DialogTitle>
        </DialogHeader>
        <TemplateForm
          key={openCount}
          releaseId={releaseId}
          count={count}
          defaultName={defaultName}
          onSuccess={close}
        />
      </DialogContent>
    </Dialog>
  );
}

function TemplateForm({
  releaseId,
  count,
  defaultName,
  onSuccess,
}: {
  releaseId: string;
  count: number;
  defaultName: string;
  onSuccess: () => void;
}) {
  const action = saveTimelineAsTemplate.bind(null, releaseId);
  const [state, formAction, pending] = useActionState<MilestoneState, FormData>(
    action,
    {},
  );
  useActionToast(state, "Format enregistré — disponible dans les réglages.");
  useEffect(() => {
    if (state.ok) onSuccess();
  }, [state.ok, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Les {count} jalons de cette timeline (titres et dates relatives)
        deviennent un format réutilisable pour tes prochaines releases.
      </p>

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nom du format</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaultName}
          placeholder="Mon format single"
          required
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          placeholder="Quand l'utiliser…"
        />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "…" : "Enregistrer le format"}
        </Button>
      </div>
    </form>
  );
}
