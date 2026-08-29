"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserOrRedirect } from "@/lib/auth";
import { coerceMilestones, ReleaseTemplateSchema } from "@/lib/domain/release-template";
import type { MilestoneDef } from "@/lib/domain/timeline";
import {
  MilestoneEditSchema,
  milestoneCardFields,
  offsetForDate,
  phaseForOffset,
  reorderMilestones,
  replaceMilestone,
} from "@/lib/domain/milestone";
import { EMPTY_BRIEF } from "@/lib/domain/content";
import { syncGoogleBestEffort } from "@/lib/google/sync";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type MilestoneState = { ok?: boolean; error?: string };

type Client = SupabaseClient<Database>;

/** Charge la release et son snapshot de jalons (RLS = isolation par user). */
async function loadRelease(supabase: Client, releaseId: string) {
  const { data } = await supabase
    .from("release")
    .select("id, release_date, milestones")
    .eq("id", releaseId)
    .maybeSingle();
  if (!data) return null;
  return { ...data, milestones: coerceMilestones(data.milestones) };
}

function persistMilestones(
  supabase: Client,
  releaseId: string,
  milestones: MilestoneDef[],
) {
  return supabase.from("release").update({ milestones }).eq("id", releaseId);
}

/**
 * Aligne la carte liée à un jalon. Le jalon ne pilote que le titre (`theme`)
 * et la date programmée : ni la colonne kanban, ni le brief, ni le tournage
 * source ne sont touchés — ce qui a été saisi dans la carte reste intact.
 * `createIfMissing` : crée la carte quand elle n'existe pas encore.
 */
async function syncMilestoneCard(
  supabase: Client,
  userId: string,
  releaseId: string,
  releaseDate: string,
  milestone: MilestoneDef,
  createIfMissing: boolean,
): Promise<{ touched: boolean; error?: string }> {
  const fields = milestoneCardFields(milestone, releaseDate);

  const { data: existing } = await supabase
    .from("content_item")
    .select("id")
    .eq("release_id", releaseId)
    .eq("milestone_key", milestone.key)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("content_item")
      .update(fields)
      .eq("id", existing.id);
    return { touched: !error, error: error?.message };
  }

  if (!createIfMissing) return { touched: false };

  const { error } = await supabase.from("content_item").insert({
    user_id: userId,
    release_id: releaseId,
    milestone_key: milestone.key,
    ...fields,
    brief: { ...EMPTY_BRIEF },
    pipeline_status: "BACKLOG",
  });
  return { touched: !error, error: error?.message };
}

function revalidateRelease(releaseId: string) {
  revalidatePath(`/releases/${releaseId}`);
  revalidatePath(`/releases/${releaseId}/board`);
  revalidatePath("/studio");
  revalidatePath("/calendar");
}

/**
 * Édite un jalon (titre + date) dans le snapshot de la release, puis
 * synchronise sa carte kanban. La case « créer la carte » n'a d'effet que la
 * première fois : ensuite la carte existante est simplement mise à jour.
 */
export async function updateMilestone(
  releaseId: string,
  key: string,
  _prev: MilestoneState,
  formData: FormData,
): Promise<MilestoneState> {
  const user = await getUserOrRedirect();
  const parsed = MilestoneEditSchema.safeParse({
    label: (formData.get("label") ?? "").toString().trim(),
    date: (formData.get("date") ?? "").toString(),
    create_card: formData.get("create_card") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const supabase = await createClient();
  const release = await loadRelease(supabase, releaseId);
  if (!release) return { error: "Release introuvable." };

  const current = release.milestones.find((m) => m.key === key);
  if (!current) return { error: "Jalon introuvable." };

  // Le jalon « Sortie » est l'ancre de la timeline : sa date EST la date de
  // sortie, elle ne se modifie que depuis l'édition de la release.
  const anchored = current.offset === 0 && current.phase === "DAY";
  const offset = anchored
    ? 0
    : offsetForDate(release.release_date, parsed.data.date);

  const updated: MilestoneDef = {
    ...current,
    label: parsed.data.label,
    offset,
    phase: anchored ? "DAY" : phaseForOffset(offset),
  };

  const { error } = await persistMilestones(
    supabase,
    releaseId,
    replaceMilestone(release.milestones, updated),
  );
  if (error) return { error: error.message };

  const card = await syncMilestoneCard(
    supabase,
    user.id,
    releaseId,
    release.release_date,
    updated,
    parsed.data.create_card,
  );
  if (card.error) return { error: card.error };
  if (card.touched) await syncGoogleBestEffort();

  revalidateRelease(releaseId);
  return { ok: true };
}

/**
 * Déplace un jalon dans la timeline : sa nouvelle position lui donne une
 * nouvelle date, et la carte liée est redatée avec lui.
 * Appelée depuis un `startTransition` (pas de retour à afficher).
 */
export async function moveMilestone(
  releaseId: string,
  fromIndex: number,
  toIndex: number,
) {
  const user = await getUserOrRedirect();
  const supabase = await createClient();
  const release = await loadRelease(supabase, releaseId);
  if (!release) return;

  const result = reorderMilestones(release.milestones, fromIndex, toIndex);
  if (!result) return;

  const { error } = await persistMilestones(
    supabase,
    releaseId,
    result.milestones,
  );
  if (error) return;

  // Redate la carte liée si elle existe (jamais de création par un drag).
  const card = await syncMilestoneCard(
    supabase,
    user.id,
    releaseId,
    release.release_date,
    result.moved,
    false,
  );
  if (card.touched) await syncGoogleBestEffort();

  revalidateRelease(releaseId);
}

/**
 * Enregistre la timeline courante (jalons réordonnés/renommés) comme nouveau
 * format de release réutilisable.
 */
export async function saveTimelineAsTemplate(
  releaseId: string,
  _prev: MilestoneState,
  formData: FormData,
): Promise<MilestoneState> {
  const user = await getUserOrRedirect();
  const supabase = await createClient();
  const release = await loadRelease(supabase, releaseId);
  if (!release) return { error: "Release introuvable." };

  const parsed = ReleaseTemplateSchema.safeParse({
    name: (formData.get("name") ?? "").toString().trim(),
    description: (formData.get("description") ?? "").toString().trim() || null,
    // Clés renumérotées : un format est une liste neuve, indépendante des
    // clés du snapshot (qui portent les liens vers les cartes de CETTE release).
    milestones: release.milestones.map((m, i) => ({ ...m, key: String(i) })),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const { error } = await supabase.from("release_template").insert({
    user_id: user.id,
    name: parsed.data.name,
    description: parsed.data.description,
    milestones: parsed.data.milestones,
    is_builtin: false,
  });
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}
