"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useActionToast } from "@/lib/use-action-toast";
import { saveProfile, type ProfileState } from "@/app/(app)/profile/actions";
import {
  IMAGE_STANCES,
  IMAGE_STANCE_LABELS,
  CONTENT_PLATFORMS,
  listToString,
} from "@/lib/domain/profile";
import type { Tables } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function ProfileForm({
  initial,
  submitLabel = "Enregistrer",
  redirectTo = "/dashboard",
  onSaved,
}: {
  initial: Tables<"artist_profile"> | null;
  submitLabel?: string;
  // Où aller après enregistrement. `null` = rester (le wizard enchaîne via
  // onSaved).
  redirectTo?: string | null;
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    saveProfile.bind(null, redirectTo),
    {},
  );
  useActionToast(state, "Profil enregistré.");
  useEffect(() => {
    if (state.ok) onSaved?.();
  }, [state.ok, onSaved]);

  const stance = initial?.image_stance ?? "HYBRIDE";

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      <Field label="Nom d'artiste" htmlFor="artist_name">
        <Input
          id="artist_name"
          name="artist_name"
          required
          defaultValue={initial?.artist_name ?? ""}
          placeholder="Ton nom de scène"
        />
      </Field>

      <Field
        label="Genres"
        htmlFor="genres"
        hint="Séparés par des virgules (ex. électro, synthwave)"
      >
        <Input
          id="genres"
          name="genres"
          defaultValue={listToString(initial?.genres)}
          placeholder="électro, synthwave"
        />
      </Field>

      <Field
        label="Références artistiques"
        htmlFor="references_art"
        hint="Artistes / œuvres qui t'inspirent, séparés par des virgules"
      >
        <Input
          id="references_art"
          name="references_art"
          defaultValue={listToString(initial?.references_art)}
          placeholder="Kavinsky, Blade Runner, ..."
        />
      </Field>

      <Field
        label="Mots-clés DA"
        htmlFor="da_keywords"
        hint="Direction artistique : ambiances, couleurs, mots, séparés par des virgules"
      >
        <Input
          id="da_keywords"
          name="da_keywords"
          defaultValue={listToString(initial?.da_keywords)}
          placeholder="néon, rétro-futuriste, nuit"
        />
      </Field>

      <Field
        label="Posture image"
        htmlFor="image_stance"
        hint="Conditionne les briefs IA (ex. HYBRIDE = pas de talk face caméra)"
      >
        <select
          id="image_stance"
          name="image_stance"
          defaultValue={stance}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {IMAGE_STANCES.map((s) => (
            <option key={s} value={s}>
              {IMAGE_STANCE_LABELS[s]}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex flex-col gap-2">
        <Label>Plateformes actives</Label>
        <PlatformPicker initial={initial?.platforms ?? []} />
        <p className="text-xs text-muted-foreground">
          Déroule et coche les plateformes que tu utilises.
        </p>
      </div>

      <Field
        label="Capacité de production hebdo"
        htmlFor="weekly_capacity"
        hint="Nombre de contenus réaliste par semaine"
      >
        <Input
          id="weekly_capacity"
          name="weekly_capacity"
          type="number"
          min={0}
          max={50}
          defaultValue={initial?.weekly_capacity ?? 3}
        />
      </Field>

      <Field
        label="Contraintes"
        htmlFor="constraints"
        hint="Matériel dispo, aversions, particularités… (texte libre)"
      >
        <Textarea
          id="constraints"
          name="constraints"
          rows={3}
          defaultValue={initial?.constraints ?? ""}
          placeholder="Ex. pas de talk face cam, un seul synthé analo, tournage le week-end..."
        />
      </Field>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function PlatformPicker({ initial }: { initial: string[] }) {
  const [selected, setSelected] = useState<string[]>(initial);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Liste des options : les plateformes proposées + d'éventuelles valeurs déjà
  // enregistrées hors liste (custom historiques), pour ne rien perdre.
  const options = useMemo(() => {
    const base = [...CONTENT_PLATFORMS] as string[];
    for (const p of initial) if (!base.includes(p)) base.push(p);
    return base;
  }, [initial]);

  // Ferme au clic extérieur.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = (p: string) =>
    setSelected((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );

  const summary =
    selected.length === 0
      ? "Choisir des plateformes…"
      : selected.length <= 3
        ? selected.join(", ")
        : `${selected.slice(0, 3).join(", ")} +${selected.length - 3}`;

  return (
    <div ref={ref} className="relative max-w-xs">
      {/* Valeur soumise au serveur : parseList la relit telle quelle. */}
      <input type="hidden" name="platforms" value={selected.join(", ")} />

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors hover:bg-secondary",
          selected.length === 0 && "text-muted-foreground",
        )}
      >
        <span className="truncate">{summary}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
      </button>

      {open && (
        <div className="absolute left-0 top-11 z-30 max-h-64 w-full min-w-56 overflow-y-auto rounded-xl border bg-popover p-1.5 shadow-lg">
          {options.map((p) => {
            const on = selected.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => toggle(p)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-secondary"
              >
                <span
                  className={cn(
                    "flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-[5px] border-2 transition-colors",
                    on
                      ? "border-primary bg-primary text-white"
                      : "border-input text-transparent",
                  )}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {p}
              </button>
            );
          })}
        </div>
      )}
    </div>
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
