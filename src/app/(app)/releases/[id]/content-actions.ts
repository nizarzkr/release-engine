"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserOrRedirect } from "@/lib/auth";
import { parseList } from "@/lib/domain/profile";
import {
  QuickContentSchema,
  ContentSchema,
  PIPELINE_STATUSES,
  EMPTY_BRIEF,
  type PipelineStatus,
} from "@/lib/domain/content";
import { syncGoogleBestEffort } from "@/lib/google/sync";

export type ContentState = { ok?: boolean; error?: string };

function opt(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t === "" ? null : t;
}

export async function createContent(
  releaseId: string,
  _prev: ContentState,
  formData: FormData,
): Promise<ContentState> {
  const user = await getUserOrRedirect();
  const parsed = QuickContentSchema.safeParse({
    hook: (formData.get("hook") ?? "").toString().trim(),
    theme: (formData.get("theme") ?? "").toString().trim(),
    platform: opt(formData.get("platform")),
    pipeline_status: formData.get("pipeline_status") ?? "BACKLOG",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("content_item").insert({
    user_id: user.id,
    release_id: releaseId,
    theme: parsed.data.theme,
    platform: parsed.data.platform,
    pipeline_status: parsed.data.pipeline_status,
    brief: { ...EMPTY_BRIEF, hook: parsed.data.hook },
  });
  if (error) return { error: error.message };

  revalidatePath(`/releases/${releaseId}/board`);
  return { ok: true };
}

export async function updateContent(
  id: string,
  releaseId: string,
  _prev: ContentState,
  formData: FormData,
): Promise<ContentState> {
  await getUserOrRedirect();
  const parsed = ContentSchema.safeParse({
    theme: (formData.get("theme") ?? "").toString().trim(),
    format: formData.get("format") ?? "SHORT",
    platform: opt(formData.get("platform")),
    objective_tag: opt(formData.get("objective_tag")),
    brief: {
      hook: (formData.get("hook") ?? "").toString(),
      concept: (formData.get("concept") ?? "").toString(),
      structure: (formData.get("structure") ?? "").toString(),
      sound_suggestion: (formData.get("sound_suggestion") ?? "").toString(),
      cta: (formData.get("cta") ?? "").toString(),
    },
    pipeline_status: formData.get("pipeline_status") ?? "BACKLOG",
    scheduled_date: opt(formData.get("scheduled_date")),
    assignee: opt(formData.get("assignee")),
    source_block_id: opt(formData.get("source_block_id")),
    tags: parseList(formData.get("tags")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("content_item")
    .update(parsed.data)
    .eq("id", id);
  if (error) return { error: error.message };

  await syncGoogleBestEffort();
  revalidatePath(`/releases/${releaseId}/board`);
  return { ok: true };
}

export async function moveContent(
  id: string,
  releaseId: string,
  status: PipelineStatus,
) {
  await getUserOrRedirect();
  if (!PIPELINE_STATUSES.includes(status)) return;
  const supabase = await createClient();
  await supabase
    .from("content_item")
    .update({ pipeline_status: status })
    .eq("id", id);
  revalidatePath(`/releases/${releaseId}/board`);
}

export async function publishContent(id: string, releaseId: string) {
  await getUserOrRedirect();
  const supabase = await createClient();
  await supabase
    .from("content_item")
    .update({ is_published: true })
    .eq("id", id);
  await syncGoogleBestEffort();
  revalidatePath(`/releases/${releaseId}/board`);
}

export async function deleteContent(id: string, releaseId: string) {
  await getUserOrRedirect();
  const supabase = await createClient();
  await supabase.from("content_item").delete().eq("id", id);
  await syncGoogleBestEffort();
  revalidatePath(`/releases/${releaseId}/board`);
}
