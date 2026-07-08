"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import {
  createSourceBlock,
  updateSourceBlock,
  type SourceBlockState,
} from "@/app/(app)/releases/[id]/source-actions";
import {
  SOURCE_BLOCK_TYPES,
  SOURCE_BLOCK_TYPE_LABELS,
  SOURCE_STATUSES,
  SOURCE_STATUS_LABELS,
} from "@/lib/domain/source-block";
import type { Tables } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function SourceBlockDialog({
  releaseId,
  initial = null,
  triggerLabel,
  triggerVariant = "outline",
  triggerSize = "sm",
}: {
  releaseId: string;
  initial?: Tables<"source_block"> | null;
  triggerLabel: string;
  triggerVariant?: "default" | "outline" | "ghost";
  triggerSize?: "default" | "sm";
}) {
  const [open, setOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const isEdit = initial !== null;

  const action = isEdit
    ? updateSourceBlock.bind(null, initial.id, releaseId)
    : createSourceBlock.bind(null, releaseId);

  const close = useCallback(() => setOpen(false), []);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setOpenCount((c) => c + 1);
      }}
    >
      <DialogTrigger
        render={<Button variant={triggerVariant} size={triggerSize} />}
      >
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier le tournage" : "Nouveau tournage"}
          </DialogTitle>
        </DialogHeader>
        <SourceBlockForm
          key={openCount}
          action={action}
          initial={initial}
          onSuccess={close}
        />
      </DialogContent>
    </Dialog>
  );
}

function SourceBlockForm({
  action,
  initial,
  onSuccess,
}: {
  action: (prev: SourceBlockState, formData: FormData) => Promise<SourceBlockState>;
  initial: Tables<"source_block"> | null;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState<SourceBlockState, FormData>(
    action,
    {},
  );

  useEffect(() => {
    if (state.ok) onSuccess();
  }, [state.ok, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="type">Type de tournage</Label>
        <select
          id="type"
          name="type"
          defaultValue={initial?.type ?? "LIVE_SESSION"}
          className={selectClass}
        >
          {SOURCE_BLOCK_TYPES.map((t) => (
            <option key={t} value={t}>
              {SOURCE_BLOCK_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="shoot_date">Date de tournage</Label>
        <Input
          id="shoot_date"
          name="shoot_date"
          type="date"
          defaultValue={initial?.shoot_date ?? ""}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="asset_link">Lien vers les rushes</Label>
        <Input
          id="asset_link"
          name="asset_link"
          type="url"
          defaultValue={initial?.asset_link ?? ""}
          placeholder="https://drive… / frame.io…"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="status">Statut</Label>
        <select
          id="status"
          name="status"
          defaultValue={initial?.status ?? "PLANIFIE"}
          className={selectClass}
        >
          {SOURCE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {SOURCE_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
