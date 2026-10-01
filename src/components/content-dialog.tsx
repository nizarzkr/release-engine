"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { useActionToast } from "@/lib/use-action-toast";
import {
  updateContent,
  publishContent,
  deleteContent,
  type ContentState,
} from "@/app/(app)/releases/[id]/content-actions";
import {
  regenerateContentItem,
  type RegenState,
} from "@/app/(app)/releases/[id]/generate-actions";
import {
  CONTENT_FORMATS,
  FORMAT_LABELS,
  OBJECTIVE_TAGS,
  OBJECTIVE_LABELS,
  PIPELINE_STATUSES,
  PIPELINE_LABELS,
  PIPELINE_COLORS,
  cardTitle,
  type Brief,
  type ContentFormat,
  type ObjectiveTag,
  type PipelineStatus,
} from "@/lib/domain/content";
import { formatDateFr } from "@/lib/format";
import { Clapperboard, Disc3, Pencil } from "lucide-react";
import { listToString } from "@/lib/domain/profile";
import type { Tables } from "@/types/database.types";
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

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

type SourceOption = { id: string; label: string };

export function ContentDialog({
  item,
  releaseId,
  sourceBlocks,
  triggerRender,
  triggerChildren,
  preview = false,
  open: controlledOpen,
  onOpenChange,
}: {
  item: Tables<"content_item"> & { releaseTitle?: string | null };
  releaseId: string;
  sourceBlocks: SourceOption[];
  // Déclencheur personnalisable : par défaut un bouton « Éditer » (kanban),
  // ou une ligne entière (vue Liste). `null` = pas de déclencheur (ouverture
  // pilotée par `open` / `onOpenChange`).
  triggerRender?: ReactElement | null;
  triggerChildren?: ReactNode;
  // Ouvre d'abord l'aperçu en lecture seule, avec un bouton « Éditer ».
  preview?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const [openCount, setOpenCount] = useState(0);
  const [editing, setEditing] = useState(!preview);
  const close = useCallback(() => {
    setLocalOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setLocalOpen(next);
        onOpenChange?.(next);
        if (next) {
          setOpenCount((c) => c + 1);
          setEditing(!preview);
        }
      }}
    >
      {triggerRender !== null && (
        <DialogTrigger
          render={triggerRender ?? <Button variant="ghost" size="xs" />}
        >
          {triggerChildren ?? "Éditer"}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Contenu" : cardTitle(item)}</DialogTitle>
        </DialogHeader>
        {editing ? (
          <EditForm
            key={openCount}
            item={item}
            releaseId={releaseId}
            sourceBlocks={sourceBlocks}
            onSuccess={close}
          />
        ) : (
          <ContentPreview
            item={item}
            sourceBlocks={sourceBlocks}
            onClose={close}
            onEdit={() => setEditing(true)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Aperçu en lecture seule d'une carte : tout le brief, sans formulaire. */
function ContentPreview({
  item,
  sourceBlocks,
  onClose,
  onEdit,
}: {
  item: Tables<"content_item"> & { releaseTitle?: string | null };
  sourceBlocks: SourceOption[];
  onClose: () => void;
  onEdit: () => void;
}) {
  const brief = (item.brief ?? {}) as Partial<Brief>;
  const status = (item.pipeline_status ?? "BACKLOG") as PipelineStatus;
  const source = sourceBlocks.find((b) => b.id === item.source_block_id);
  const meta = [
    item.scheduled_date ? formatDateFr(item.scheduled_date) : "Non daté",
    item.platform,
    item.format ? FORMAT_LABELS[item.format as ContentFormat] : null,
    item.objective_tag
      ? OBJECTIVE_LABELS[item.objective_tag as ObjectiveTag]
      : null,
  ].filter(Boolean);
  const fields: [string, string | undefined][] = [
    ["Accroche", brief.hook],
    ["Concept", brief.concept],
    ["Structure", brief.structure],
    ["Son suggéré", brief.sound_suggestion],
    ["CTA", brief.cta],
  ];
  const filled = fields.filter(([, v]) => v?.trim());

  return (
    <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 font-medium text-foreground/80 ring-1 ring-border"
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: PIPELINE_COLORS[status] }}
          />
          {PIPELINE_LABELS[status]}
        </span>
        {item.is_published && (
          <span className="rounded-full bg-muted px-2 py-0.5">Archivé</span>
        )}
        <span>{item.theme}</span>
        {meta.map((m) => (
          <span key={m}>· {m}</span>
        ))}
      </div>

      {(item.releaseTitle || source) && (
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          {item.releaseTitle && (
            <span className="inline-flex items-center gap-1.5">
              <Disc3 className="h-3.5 w-3.5" />
              {item.releaseTitle}
            </span>
          )}
          {source && (
            <span className="inline-flex items-center gap-1.5">
              <Clapperboard className="h-3.5 w-3.5" />
              {source.label}
            </span>
          )}
        </div>
      )}

      {filled.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          Pas encore de brief pour ce contenu.
        </p>
      ) : (
        <dl className="flex flex-col gap-3">
          {filled.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                {label}
              </dt>
              <dd className="mt-0.5 whitespace-pre-line text-sm leading-relaxed">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {(item.tags ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {(item.tags ?? []).map((t) => (
            <span
              key={t}
              className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2 border-t pt-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Fermer
        </Button>
        <Button type="button" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          Éditer
        </Button>
      </div>
    </div>
  );
}

function EditForm({
  item,
  releaseId,
  sourceBlocks,
  onSuccess,
}: {
  item: Tables<"content_item">;
  releaseId: string;
  sourceBlocks: SourceOption[];
  onSuccess: () => void;
}) {
  const action = updateContent.bind(null, item.id, releaseId);
  const [state, formAction, pending] = useActionState<ContentState, FormData>(
    action,
    {},
  );
  useActionToast(state, "Contenu enregistré.");
  useEffect(() => {
    if (state.ok) onSuccess();
  }, [state.ok, onSuccess]);

  const brief = (item.brief ?? {}) as Partial<Brief>;

  return (
    <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
      <RegenBlock
        itemId={item.id}
        releaseId={releaseId}
        onSuccess={onSuccess}
      />

      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <FieldSmall label="Thème" htmlFor="theme">
            <Input id="theme" name="theme" defaultValue={item.theme} required />
          </FieldSmall>
          <FieldSmall label="Colonne" htmlFor="pipeline_status">
            <select
              id="pipeline_status"
              name="pipeline_status"
              defaultValue={item.pipeline_status ?? "BACKLOG"}
              className={selectClass}
            >
              {PIPELINE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PIPELINE_LABELS[s]}
                </option>
              ))}
            </select>
          </FieldSmall>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <FieldSmall label="Format" htmlFor="format">
            <select
              id="format"
              name="format"
              defaultValue={item.format ?? "SHORT"}
              className={selectClass}
            >
              {CONTENT_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {FORMAT_LABELS[f]}
                </option>
              ))}
            </select>
          </FieldSmall>
          <FieldSmall label="Plateforme" htmlFor="platform">
            <Input
              id="platform"
              name="platform"
              defaultValue={item.platform ?? ""}
              placeholder="TikTok…"
            />
          </FieldSmall>
          <FieldSmall label="Objectif" htmlFor="objective_tag">
            <select
              id="objective_tag"
              name="objective_tag"
              defaultValue={item.objective_tag ?? ""}
              className={selectClass}
            >
              <option value="">—</option>
              {OBJECTIVE_TAGS.map((o) => (
                <option key={o} value={o}>
                  {OBJECTIVE_LABELS[o]}
                </option>
              ))}
            </select>
          </FieldSmall>
        </div>

        <FieldSmall label="Hook" htmlFor="hook">
          <Input
            id="hook"
            name="hook"
            defaultValue={brief.hook ?? ""}
            placeholder="L'accroche des 3 premières secondes"
          />
        </FieldSmall>
        <FieldSmall label="Concept" htmlFor="concept">
          <Textarea
            id="concept"
            name="concept"
            rows={2}
            defaultValue={brief.concept ?? ""}
          />
        </FieldSmall>
        <FieldSmall label="Structure" htmlFor="structure">
          <Textarea
            id="structure"
            name="structure"
            rows={2}
            defaultValue={brief.structure ?? ""}
          />
        </FieldSmall>
        <div className="grid grid-cols-2 gap-3">
          <FieldSmall label="Suggestion son / trend" htmlFor="sound_suggestion">
            <Input
              id="sound_suggestion"
              name="sound_suggestion"
              defaultValue={brief.sound_suggestion ?? ""}
            />
          </FieldSmall>
          <FieldSmall label="CTA" htmlFor="cta">
            <Input id="cta" name="cta" defaultValue={brief.cta ?? ""} />
          </FieldSmall>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldSmall label="Date programmée" htmlFor="scheduled_date">
            <Input
              id="scheduled_date"
              name="scheduled_date"
              type="date"
              defaultValue={item.scheduled_date ?? ""}
            />
          </FieldSmall>
          <FieldSmall label="Assigné à" htmlFor="assignee">
            <Input
              id="assignee"
              name="assignee"
              defaultValue={item.assignee ?? ""}
              placeholder="toi / vidéaste"
            />
          </FieldSmall>
        </div>

        <FieldSmall label="Tournage source" htmlFor="source_block_id">
          <select
            id="source_block_id"
            name="source_block_id"
            defaultValue={item.source_block_id ?? ""}
            className={selectClass}
          >
            <option value="">— Aucun —</option>
            {sourceBlocks.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </FieldSmall>

        <FieldSmall
          label="Tags"
          htmlFor="tags"
          hint="Séparés par des virgules"
        >
          <Input
            id="tags"
            name="tags"
            defaultValue={listToString(item.tags)}
          />
        </FieldSmall>

        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "…" : "Enregistrer"}
          </Button>
        </div>
      </form>

      {/* Actions hors formulaire d'édition */}
      <div className="flex items-center justify-between border-t pt-3">
        <form action={deleteContent.bind(null, item.id, releaseId)}>
          <Button type="submit" variant="ghost" size="sm">
            Supprimer
          </Button>
        </form>
        {!item.is_published && (
          <form action={publishContent.bind(null, item.id, releaseId)}>
            <Button type="submit" variant="secondary" size="sm">
              Publié (archiver)
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function FieldSmall({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function RegenBlock({
  itemId,
  releaseId,
  onSuccess,
}: {
  itemId: string;
  releaseId: string;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState<RegenState, FormData>(
    regenerateContentItem.bind(null, itemId, releaseId),
    {},
  );
  useActionToast(state, "Contenu regénéré.");

  useEffect(() => {
    if (state.ok) onSuccess();
  }, [state.ok, onSuccess]);

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-muted/40 p-3">
      <Label htmlFor="micro_prompt" className="text-xs font-medium">
        ✨ Regénérer par IA
      </Label>
      <form action={formAction} className="flex gap-2">
        <Input
          id="micro_prompt"
          name="micro_prompt"
          placeholder="plus drôle, plus court, sans ce synthé…"
          className="h-8 text-sm"
          required
        />
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {pending ? "…" : "Regénérer"}
        </Button>
      </form>
      <p className="text-[11px] text-muted-foreground">
        Garde le même pilier et la même date ; ne retravaille que le contenu.
      </p>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
    </div>
  );
}
