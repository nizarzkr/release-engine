"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserOrRedirect } from "@/lib/auth";
import {
  checklistRowsForRelease,
  CHECKLIST_PHASES,
} from "@/lib/domain/checklist";
import { syncGoogleBestEffort } from "@/lib/google/sync";

export async function seedChecklist(releaseId: string) {
  const user = await getUserOrRedirect();
  const supabase = await createClient();

  const { data: release } = await supabase
    .from("release")
    .select("release_date")
    .eq("id", releaseId)
    .maybeSingle();
  if (!release) return;

  const rows = checklistRowsForRelease(release.release_date).map((r) => ({
    ...r,
    user_id: user.id,
    release_id: releaseId,
  }));

  await supabase.from("checklist_item").insert(rows);
  await syncGoogleBestEffort();
  revalidatePath(`/releases/${releaseId}`);
}

export async function addChecklistItem(releaseId: string, formData: FormData) {
  const user = await getUserOrRedirect();
  const label = (formData.get("label") ?? "").toString().trim();
  if (!label) return;

  const phaseRaw = (formData.get("phase") ?? "PRE").toString();
  const phase = (CHECKLIST_PHASES as readonly string[]).includes(phaseRaw)
    ? phaseRaw
    : "PRE";

  const dueRaw = (formData.get("due_date") ?? "").toString().trim();
  const due_date = /^\d{4}-\d{2}-\d{2}$/.test(dueRaw) ? dueRaw : null;

  const supabase = await createClient();
  await supabase.from("checklist_item").insert({
    user_id: user.id,
    release_id: releaseId,
    label,
    phase,
    due_date,
  });
  await syncGoogleBestEffort();
  revalidatePath(`/releases/${releaseId}`);
}

export async function toggleChecklistItem(
  id: string,
  releaseId: string,
  isDone: boolean,
) {
  await getUserOrRedirect();
  const supabase = await createClient();
  await supabase.from("checklist_item").update({ is_done: isDone }).eq("id", id);
  await syncGoogleBestEffort();
  revalidatePath(`/releases/${releaseId}`);
}

export async function deleteChecklistItem(id: string, releaseId: string) {
  await getUserOrRedirect();
  const supabase = await createClient();
  await supabase.from("checklist_item").delete().eq("id", id);
  await syncGoogleBestEffort();
  revalidatePath(`/releases/${releaseId}`);
}
