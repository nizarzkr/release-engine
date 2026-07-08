"use client";

import { useActionState } from "react";
import type { ReleaseState } from "@/app/(app)/releases/actions";
import { RELEASE_TYPES, DSP_KEYS, DSP_LABELS } from "@/lib/domain/release";
import { WINDOW_TEMPLATES, TEMPLATE_META } from "@/lib/domain/timeline";
import type { Tables } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

type ParentOption = { id: string; title: string };

export function ReleaseForm({
  initial,
  parents,
  action,
  submitLabel = "Enregistrer",
}: {
  initial: Tables<"release"> | null;
  parents: ParentOption[];
  action: (prev: ReleaseState, formData: FormData) => Promise<ReleaseState>;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<ReleaseState, FormData>(
    action,
    {},
  );

  const dsp = (initial?.dsp_links ?? {}) as Record<string, string>;

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      <Field label="Titre" htmlFor="title">
        <Input
          id="title"
          name="title"
          required
          defaultValue={initial?.title ?? ""}
          placeholder="Titre de la sortie"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Type" htmlFor="type">
          <select
            id="type"
            name="type"
            defaultValue={initial?.type ?? "SINGLE"}
            className={selectClass}
          >
            {RELEASE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === "SINGLE" ? "Single" : "EP"}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Date de sortie" htmlFor="release_date">
          <Input
            id="release_date"
            name="release_date"
            type="date"
            required
            defaultValue={initial?.release_date ?? ""}
          />
        </Field>
      </div>

      <Field
        label="Template de fenêtre"
        htmlFor="window_template"
        hint="Détermine la durée de la campagne et les jalons de contenu."
      >
        <select
          id="window_template"
          name="window_template"
          defaultValue={initial?.window_template ?? "MARATHON"}
          className={selectClass}
        >
          {WINDOW_TEMPLATES.map((w) => (
            <option key={w} value={w}>
              {TEMPLATE_META[w].label} — {TEMPLATE_META[w].weeks} semaines
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="BPM" htmlFor="bpm">
          <Input
            id="bpm"
            name="bpm"
            type="number"
            min={1}
            max={400}
            defaultValue={initial?.bpm ?? ""}
            placeholder="120"
          />
        </Field>

        <Field label="Mood" htmlFor="mood">
          <Input
            id="mood"
            name="mood"
            defaultValue={initial?.mood ?? ""}
            placeholder="nocturne, mélancolique…"
          />
        </Field>
      </div>

      <Field
        label="EP parent"
        htmlFor="parent_release_id"
        hint="Optionnel : rattache ce single à un EP existant."
      >
        <select
          id="parent_release_id"
          name="parent_release_id"
          defaultValue={initial?.parent_release_id ?? ""}
          className={selectClass}
        >
          <option value="">— Aucun —</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </Field>

      <fieldset className="flex flex-col gap-3 rounded-md border p-4">
        <legend className="px-1 text-sm text-muted-foreground">
          Liens DSP (optionnels)
        </legend>
        {DSP_KEYS.map((key) => (
          <Field key={key} label={DSP_LABELS[key]} htmlFor={`dsp_${key}`}>
            <Input
              id={`dsp_${key}`}
              name={`dsp_${key}`}
              type="url"
              defaultValue={dsp[key] ?? ""}
              placeholder="https://…"
            />
          </Field>
        ))}
      </fieldset>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Field({
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
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
