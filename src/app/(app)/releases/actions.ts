"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserOrRedirect } from "@/lib/auth";
import {
  ReleaseSchema,
  parseDspLinks,
  parseOptionalInt,
  parseOptionalText,
} from "@/lib/domain/release";
import { coerceMilestones } from "@/lib/domain/release-template";
import { syncGoogleBestEffort } from "@/lib/google/sync";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type ReleaseState = { error?: string };

/**
 * Valide le formulaire ET fige un snapshot des jalons du template choisi
 * (`template_id`) → éditer/supprimer le format ensuite ne touche pas la release.
 */
async function parseForm(
  formData: FormData,
  supabase: SupabaseClient<Database>,
) {
  const templateId = (formData.get("template_id") ?? "").toString();
  const { data: template } = await supabase
    .from("release_template")
    .select("name, milestones")
    .eq("id", templateId)
    .maybeSingle();

  if (!template) {
    return { success: false as const, message: "Format de release invalide." };
  }

  const parentRaw = formData.get("parent_release_id");
  const parsed = ReleaseSchema.safeParse({
    title: (formData.get("title") ?? "").toString().trim(),
    type: formData.get("type"),
    release_date: (formData.get("release_date") ?? "").toString(),
    window_template: template.name,
    milestones: coerceMilestones(template.milestones),
    bpm: parseOptionalInt(formData.get("bpm")),
    mood: parseOptionalText(formData.get("mood")),
    parent_release_id:
      typeof parentRaw === "string" && parentRaw ? parentRaw : null,
    dsp_links: parseDspLinks(formData),
  });

  if (!parsed.success) {
    return {
      success: false as const,
      message: parsed.error.issues[0]?.message ?? "Champs invalides.",
    };
  }
  return { success: true as const, data: parsed.data };
}

export async function createRelease(
  _prev: ReleaseState,
  formData: FormData,
): Promise<ReleaseState> {
  const user = await getUserOrRedirect();
  const supabase = await createClient();
  const parsed = await parseForm(formData, supabase);
  if (!parsed.success) {
    return { error: parsed.message };
  }

  const { data, error } = await supabase
    .from("release")
    .insert({ user_id: user.id, ...parsed.data })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Création impossible." };
  }

  await syncGoogleBestEffort();
  revalidatePath("/releases");
  redirect(`/releases/${data.id}`);
}

export async function updateRelease(
  id: string,
  _prev: ReleaseState,
  formData: FormData,
): Promise<ReleaseState> {
  await getUserOrRedirect();
  const supabase = await createClient();
  const parsed = await parseForm(formData, supabase);
  if (!parsed.success) {
    return { error: parsed.message };
  }

  const { error } = await supabase
    .from("release")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  await syncGoogleBestEffort();
  revalidatePath("/releases");
  revalidatePath(`/releases/${id}`);
  redirect(`/releases/${id}`);
}

export async function deleteRelease(id: string) {
  await getUserOrRedirect();
  const supabase = await createClient();
  await supabase.from("release").delete().eq("id", id);
  await syncGoogleBestEffort();
  revalidatePath("/releases");
  redirect("/releases");
}
