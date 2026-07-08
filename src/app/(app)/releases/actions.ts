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

export type ReleaseState = { error?: string };

function parseForm(formData: FormData) {
  const parentRaw = formData.get("parent_release_id");
  return ReleaseSchema.safeParse({
    title: (formData.get("title") ?? "").toString().trim(),
    type: formData.get("type"),
    release_date: (formData.get("release_date") ?? "").toString(),
    window_template: formData.get("window_template"),
    bpm: parseOptionalInt(formData.get("bpm")),
    mood: parseOptionalText(formData.get("mood")),
    parent_release_id:
      typeof parentRaw === "string" && parentRaw ? parentRaw : null,
    dsp_links: parseDspLinks(formData),
  });
}

export async function createRelease(
  _prev: ReleaseState,
  formData: FormData,
): Promise<ReleaseState> {
  const user = await getUserOrRedirect();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("release")
    .insert({ user_id: user.id, ...parsed.data })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Création impossible." };
  }

  revalidatePath("/releases");
  redirect(`/releases/${data.id}`);
}

export async function updateRelease(
  id: string,
  _prev: ReleaseState,
  formData: FormData,
): Promise<ReleaseState> {
  await getUserOrRedirect();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("release")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/releases");
  revalidatePath(`/releases/${id}`);
  redirect(`/releases/${id}`);
}

export async function deleteRelease(id: string) {
  await getUserOrRedirect();
  const supabase = await createClient();
  await supabase.from("release").delete().eq("id", id);
  revalidatePath("/releases");
  redirect("/releases");
}
