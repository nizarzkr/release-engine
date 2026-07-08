"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserOrRedirect } from "@/lib/auth";
import {
  SourceBlockSchema,
  SOURCE_STATUSES,
  type SourceStatus,
} from "@/lib/domain/source-block";

export type SourceBlockState = { ok?: boolean; error?: string };

function parseForm(formData: FormData) {
  const shoot = formData.get("shoot_date");
  const asset = formData.get("asset_link");
  return SourceBlockSchema.safeParse({
    type: formData.get("type"),
    shoot_date: typeof shoot === "string" && shoot.trim() ? shoot : null,
    asset_link: typeof asset === "string" && asset.trim() ? asset.trim() : null,
    status: formData.get("status") ?? "PLANIFIE",
  });
}

export async function createSourceBlock(
  releaseId: string,
  _prev: SourceBlockState,
  formData: FormData,
): Promise<SourceBlockState> {
  const user = await getUserOrRedirect();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("source_block").insert({
    user_id: user.id,
    release_id: releaseId,
    ...parsed.data,
  });
  if (error) return { error: error.message };

  revalidatePath(`/releases/${releaseId}`);
  return { ok: true };
}

export async function updateSourceBlock(
  id: string,
  releaseId: string,
  _prev: SourceBlockState,
  formData: FormData,
): Promise<SourceBlockState> {
  await getUserOrRedirect();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("source_block")
    .update(parsed.data)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/releases/${releaseId}`);
  return { ok: true };
}

export async function setSourceBlockStatus(
  id: string,
  releaseId: string,
  status: SourceStatus,
) {
  await getUserOrRedirect();
  if (!SOURCE_STATUSES.includes(status)) return;

  const supabase = await createClient();
  await supabase.from("source_block").update({ status }).eq("id", id);
  revalidatePath(`/releases/${releaseId}`);
}

export async function deleteSourceBlock(id: string, releaseId: string) {
  await getUserOrRedirect();
  const supabase = await createClient();
  await supabase.from("source_block").delete().eq("id", id);
  revalidatePath(`/releases/${releaseId}`);
}

/**
 * Cascade "un clic" : quand les rushes sont dispo, bascule les contenus liés
 * de À_TOURNER → À_MONTER. RLS scope automatiquement à l'utilisateur.
 * (Utilisable comme action de formulaire → retour void ; le comptage/toast
 * arrivera en J5 côté client.)
 */
export async function promoteRushesToEdit(
  sourceBlockId: string,
  releaseId: string,
): Promise<void> {
  await getUserOrRedirect();
  const supabase = await createClient();
  await supabase
    .from("content_item")
    .update({ pipeline_status: "A_MONTER" })
    .eq("source_block_id", sourceBlockId)
    .eq("pipeline_status", "A_TOURNER");

  revalidatePath(`/releases/${releaseId}`);
}
