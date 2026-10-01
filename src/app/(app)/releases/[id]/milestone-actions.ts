"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserOrRedirect } from "@/lib/auth";
import {
  coerceMilestones,
  MilestoneSchema,
  ReleaseTemplateSchema,
} from "@/lib/domain/release-template";
import type { MilestoneDef } from "@/lib/domain/timeline";
import {
  MAX_MILESTONES,
  MilestoneEditSchema,
  hasAnchor,
  isAnchor,
  milestoneCardFields,
  offsetForDate,
  phaseForOffset,
  removeMilestones,
  reorderMilestones,
  replaceMilestone,
  sortMilestones,
} from "@/lib/domain/milestone";
import { EMPTY_BRIEF, type Brief } from "@/lib/domain/content";
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
 * Aligne la carte liée à un jalon. Le jalon pilote le titre (`theme`), la date
 * programmée et — si `concept` est fourni — le concept du brief. La colonne
 * kanban, le tournage source et le RESTE du brief (hook, structure, son, CTA)
 * ne sont jamais touchés : ce qui a été saisi dans le Studio reste intact.
 *
 * `concept: null` = ne pas toucher au brief (cas d'un simple déplacement).
 * `createIfMissing` : crée la carte quand elle n'existe pas encore.
 */
async function syncMilestoneCard(
  supabase: Client,
  userId: string,
  releaseId: string,
  releaseDate: string,
  milestone: MilestoneDef,
  createIfMissing: boolean,
  concept: string | null = null,
): Promise<{ touched: boolean; error?: string }> {
  const fields = milestoneCardFields(milestone, releaseDate);

  const { data: existing } = await supabase
    .from("content_item")
    .select("id, brief")
    .eq("release_id", releaseId)
    .eq("milestone_key", milestone.key)
    .maybeSingle();

  if (existing) {
    // Relecture-fusion plutôt qu'écriture directe : `brief` est un jsonb, un
    // update partiel de la colonne écraserait les autres champs du brief.
    const brief =
      concept === null
        ? undefined
        : {
            ...EMPTY_BRIEF,
            ...((existing.brief ?? {}) as Partial<Brief>),
            concept,
          };
    const { error } = await supabase
      .from("content_item")
      .update(brief ? { ...fields, brief } : fields)
      .eq("id", existing.id);
    return { touched: !error, error: error?.message };
  }

  if (!createIfMissing) return { touched: false };

  const { error } = await supabase.from("content_item").insert({
    user_id: userId,
    release_id: releaseId,
    milestone_key: milestone.key,
    ...fields,
    brief: { ...EMPTY_BRIEF, concept: concept ?? "" },
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
 * synchronise sa carte kanban — dont le concept, seul champ du brief que ce
 * formulaire pilote. La case « créer la carte » n'a d'effet que la première
 * fois : ensuite la carte existante est simplement mise à jour.
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
    concept: (formData.get("concept") ?? "").toString(),
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

  // Un concept saisi implique la carte : sans elle, le texte n'aurait nulle
  // part où être stocké (le concept vit dans le brief de la carte).
  const concept = parsed.data.concept.trim();
  const card = await syncMilestoneCard(
    supabase,
    user.id,
    releaseId,
    release.release_date,
    updated,
    parsed.data.create_card || concept.length > 0,
    concept,
  );
  if (card.error) return { error: card.error };
  if (card.touched) await syncGoogleBestEffort();

  revalidateRelease(releaseId);
  return { ok: true };
}

/**
 * Ajoute un jalon à la timeline d'une release. Même formulaire que l'édition
 * (titre, date, concept, carte), à ceci près que la date est libre : c'est
 * elle qui donne au jalon sa position et sa phase.
 */
export async function createMilestone(
  releaseId: string,
  _prev: MilestoneState,
  formData: FormData,
): Promise<MilestoneState> {
  const user = await getUserOrRedirect();
  const parsed = MilestoneEditSchema.safeParse({
    label: (formData.get("label") ?? "").toString().trim(),
    date: (formData.get("date") ?? "").toString(),
    concept: (formData.get("concept") ?? "").toString(),
    create_card: formData.get("create_card") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const supabase = await createClient();
  const release = await loadRelease(supabase, releaseId);
  if (!release) return { error: "Release introuvable." };

  if (release.milestones.length >= MAX_MILESTONES) {
    return { error: `Timeline pleine (${MAX_MILESTONES} jalons max).` };
  }

  const offset = offsetForDate(release.release_date, parsed.data.date);
  if (offset === 0 && hasAnchor(release.milestones)) {
    return {
      error: "Le jour de sortie porte déjà son jalon. Choisis une autre date.",
    };
  }

  // Clé aléatoire plutôt qu'un rang : les clés portent le lien vers les cartes,
  // et une clé recyclée ferait pointer le nouveau jalon sur une carte ancienne.
  const created = {
    key: crypto.randomUUID(),
    label: parsed.data.label,
    offset,
    phase: phaseForOffset(offset),
  };
  // Rejoue le schéma partagé : il porte les bornes d'offset (±365), donc une
  // date absurde est refusée ici plutôt qu'écrite dans le snapshot.
  const valid = MilestoneSchema.safeParse(created);
  if (!valid.success) {
    return { error: valid.error.issues[0]?.message ?? "Jalon invalide." };
  }

  const { error } = await persistMilestones(
    supabase,
    releaseId,
    sortMilestones([...release.milestones, valid.data]),
  );
  if (error) return { error: error.message };

  const concept = parsed.data.concept.trim();
  const card = await syncMilestoneCard(
    supabase,
    user.id,
    releaseId,
    release.release_date,
    valid.data,
    parsed.data.create_card || concept.length > 0,
    concept,
  );
  if (card.error) return { error: card.error };
  if (card.touched) await syncGoogleBestEffort();

  revalidateRelease(releaseId);
  return { ok: true };
}

/**
 * Supprime un jalon ET la carte qu'il a générée : un jalon = une carte, la
 * carte n'a pas de vie propre une fois son jalon disparu.
 *
 * Le jour de sortie est refusé : sa date EST celle de la release et il sert
 * d'origine aux offsets — sans lui, les J± des autres jalons ne veulent plus
 * rien dire. Il se supprime avec la release elle-même.
 */
export async function deleteMilestone(
  releaseId: string,
  key: string,
  _prev: MilestoneState,
  _formData: FormData,
): Promise<MilestoneState> {
  await getUserOrRedirect();
  const supabase = await createClient();
  const release = await loadRelease(supabase, releaseId);
  if (!release) return { error: "Release introuvable." };

  const target = release.milestones.find((m) => m.key === key);
  if (!target) return { error: "Jalon introuvable." };
  if (isAnchor(target)) {
    return {
      error: "Le jour de sortie ancre la timeline : il ne se supprime pas.",
    };
  }

  // La carte d'abord : si le retrait du jalon passait mais pas celui de la
  // carte, elle resterait dans le board en pointant un jalon fantôme.
  const { error: cardError } = await supabase
    .from("content_item")
    .delete()
    .eq("release_id", releaseId)
    .eq("milestone_key", key);
  if (cardError) return { error: cardError.message };

  const { error } = await persistMilestones(
    supabase,
    releaseId,
    release.milestones.filter((m) => m.key !== key),
  );
  if (error) return { error: error.message };

  await syncGoogleBestEffort();
  revalidateRelease(releaseId);
  return { ok: true };
}

/**
 * Suppression groupée depuis la timeline (mode sélection). Contrairement à la
 * suppression unitaire, les cartes liées RESTENT dans le board : elles sont
 * seulement détachées de leur jalon. Le jour de sortie est ignoré.
 */
export async function deleteMilestones(
  releaseId: string,
  keys: string[],
): Promise<MilestoneState & { deleted?: number }> {
  await getUserOrRedirect();
  const supabase = await createClient();
  const release = await loadRelease(supabase, releaseId);
  if (!release) return { error: "Release introuvable." };

  const { milestones, removed } = removeMilestones(release.milestones, keys);
  if (removed.length === 0) return { error: "Aucun jalon à supprimer." };

  // Détacher d'abord : une carte ne doit jamais pointer un jalon fantôme.
  const { error: cardError } = await supabase
    .from("content_item")
    .update({ milestone_key: null })
    .eq("release_id", releaseId)
    .in("milestone_key", removed);
  if (cardError) return { error: cardError.message };

  const { error } = await persistMilestones(supabase, releaseId, milestones);
  if (error) return { error: error.message };

  await syncGoogleBestEffort();
  revalidateRelease(releaseId);
  return { ok: true, deleted: removed.length };
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
