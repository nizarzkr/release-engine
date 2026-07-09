"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { useActionToast } from "@/lib/use-action-toast";
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  type TemplateState,
} from "@/app/(app)/settings/template-actions";
import {
  MILESTONE_PHASES,
  MILESTONE_PHASE_LABELS,
  templateSummary,
  coerceMilestones,
} from "@/lib/domain/release-template";
import type { MilestoneDef } from "@/lib/domain/timeline";
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
  "h-9 rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

type Template = Tables<"release_template">;

export function TemplateManager({ templates }: { templates: Template[] }) {
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {templates.map((t) => {
          const s = templateSummary(t.milestones);
          return (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-md border p-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t.name}</span>
                  {t.is_builtin && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                      défaut
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {s.weeks} sem · {s.count} jalons · {s.preDays} j avant /{" "}
                  {s.postDays} j après
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <TemplateDialog
                  initial={t}
                  triggerLabel="Éditer"
                  triggerVariant="outline"
                />
                <form action={duplicateTemplate.bind(null, t.id)}>
                  <Button type="submit" variant="ghost" size="sm">
                    Dupliquer
                  </Button>
                </form>
                <form action={deleteTemplate.bind(null, t.id)}>
                  <Button type="submit" variant="ghost" size="sm">
                    Supprimer
                  </Button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>

      <div>
        <TemplateDialog
          initial={null}
          triggerLabel="+ Créer un format"
          triggerVariant="outline"
        />
      </div>
    </div>
  );
}

function TemplateDialog({
  initial,
  triggerLabel,
  triggerVariant = "outline",
}: {
  initial: Template | null;
  triggerLabel: string;
  triggerVariant?: "default" | "outline" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const isEdit = initial !== null;
  const action = isEdit
    ? updateTemplate.bind(null, initial.id)
    : createTemplate;
  const close = useCallback(() => setOpen(false), []);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setOpenCount((c) => c + 1);
      }}
    >
      <DialogTrigger render={<Button variant={triggerVariant} size="sm" />}>
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier le format" : "Nouveau format"}
          </DialogTitle>
        </DialogHeader>
        <TemplateForm
          key={openCount}
          action={action}
          initial={initial}
          onSuccess={close}
        />
      </DialogContent>
    </Dialog>
  );
}

const EMPTY_ROW: MilestoneDef = {
  key: "0",
  label: "Sortie",
  offset: 0,
  phase: "DAY",
};

function TemplateForm({
  action,
  initial,
  onSuccess,
}: {
  action: (prev: TemplateState, formData: FormData) => Promise<TemplateState>;
  initial: Template | null;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState<TemplateState, FormData>(
    action,
    {},
  );
  useActionToast(state, "Format enregistré.");
  const [rows, setRows] = useState<MilestoneDef[]>(() => {
    const existing = coerceMilestones(initial?.milestones);
    return existing.length > 0 ? existing : [EMPTY_ROW];
  });

  useEffect(() => {
    if (state.ok) onSuccess();
  }, [state.ok, onSuccess]);

  const update = (i: number, patch: Partial<MilestoneDef>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const addRow = () =>
    setRows((rs) => [
      ...rs,
      { key: String(rs.length), label: "", offset: 0, phase: "PRE" },
    ]);
  const removeRow = (i: number) =>
    setRows((rs) => rs.filter((_, j) => j !== i));

  return (
    <form
      action={formAction}
      className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nom du format</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={initial?.name ?? ""}
          placeholder="Ex. Sprint express"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description (optionnelle)</Label>
        <Input
          id="description"
          name="description"
          defaultValue={initial?.description ?? ""}
          placeholder="Fenêtre courte, sortie surprise…"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Jalons</Label>
        <p className="text-xs text-muted-foreground">
          Offset = jours par rapport au jour de sortie (négatif = avant, 0 = jour
          J, positif = après).
        </p>
        <div className="flex flex-col gap-2">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                name="m_label"
                value={row.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder="Libellé"
                className="flex-1"
              />
              <Input
                name="m_offset"
                type="number"
                value={row.offset}
                onChange={(e) =>
                  update(i, { offset: Number(e.target.value) })
                }
                className="w-20"
                aria-label="Offset (jours)"
              />
              <select
                name="m_phase"
                value={row.phase}
                onChange={(e) =>
                  update(i, { phase: e.target.value as MilestoneDef["phase"] })
                }
                className={selectClass}
                aria-label="Phase"
              >
                {MILESTONE_PHASES.map((p) => (
                  <option key={p} value={p}>
                    {MILESTONE_PHASE_LABELS[p]}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeRow(i)}
                disabled={rows.length === 1}
                aria-label="Retirer le jalon"
              >
                ✕
              </Button>
            </div>
          ))}
        </div>
        <div>
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            + Ajouter un jalon
          </Button>
        </div>
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
