"use client";

import { useActionState } from "react";
import type { ReleaseState } from "@/app/(app)/releases/actions";
import Link from "next/link";
import { RELEASE_TYPES, DSP_KEYS, DSP_LABELS } from "@/lib/domain/release";
import { templateSummary } from "@/lib/domain/release-template";
import type { Tables } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

type ParentOption = { id: string; title: string };
type TemplateOption = Pick<Tables<"release_template">, "id" | "name" | "milestones">;

export function ReleaseForm({
  initial,
  parents,
  templates,
  action,
  submitLabel = "Enregistrer",
}: {
  initial: Tables<"release"> | null;
  parents: ParentOption[];
  templates: TemplateOption[];
  action: (prev: ReleaseState, formData: FormData) => Promise<ReleaseState>;
  submitLabel?: string;
}) {
  // Pré-sélection en édition : le format dont le nom == window_template figé.
  const defaultTemplateId =
    templates.find((t) => t.name === initial?.window_template)?.id ??
    templates[0]?.id ??
    "";
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
        label="Format de release"
        htmlFor="template_id"
        hint="Détermine la durée de la campagne et les jalons de contenu."
      >
        <select
          id="template_id"
          name="template_id"
          defaultValue={defaultTemplateId}
          className={selectClass}
        >
          {templates.map((t) => {
            const s = templateSummary(t.milestones);
            return (
              <option key={t.id} value={t.id}>
                {t.name} — {s.weeks} sem · {s.count} jalons
              </option>
            );
          })}
        </select>
        <p className="text-xs text-muted-foreground">
          Personnalise tes formats dans{" "}
          <Link href="/settings" className="underline underline-offset-2">
            Réglages
          </Link>
          .
        </p>
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
