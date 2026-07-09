"use client";

import { useActionState } from "react";
import { useActionToast } from "@/lib/use-action-toast";
import { saveProfile, type ProfileState } from "@/app/(app)/profile/actions";
import {
  IMAGE_STANCES,
  IMAGE_STANCE_LABELS,
  listToString,
} from "@/lib/domain/profile";
import type { Tables } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ProfileForm({
  initial,
  submitLabel = "Enregistrer",
}: {
  initial: Tables<"artist_profile"> | null;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    saveProfile,
    {},
  );
  useActionToast(state, "Profil enregistré.");

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

      <Field
        label="Plateformes actives"
        htmlFor="platforms"
        hint="Séparées par des virgules (ex. TikTok, Instagram, YouTube)"
      >
        <Input
          id="platforms"
          name="platforms"
          defaultValue={listToString(initial?.platforms)}
          placeholder="TikTok, Instagram, YouTube"
        />
      </Field>

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
