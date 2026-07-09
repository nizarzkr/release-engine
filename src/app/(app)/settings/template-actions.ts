"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserOrRedirect } from "@/lib/auth";
import {
  ReleaseTemplateSchema,
  coerceMilestones,
} from "@/lib/domain/release-template";

export type TemplateState = { ok?: boolean; error?: string };

/** Reconstruit les jalons depuis les tableaux parallèles du formulaire. */
function parseForm(formData: FormData) {
  const labels = formData.getAll("m_label");
  const offsets = formData.getAll("m_offset");
  const phases = formData.getAll("m_phase");

  const milestones = labels
    .map((label, i) => ({
      key: String(i),
      label: (label ?? "").toString().trim(),
      offset: Number((offsets[i] ?? "").toString()),
      phase: (phases[i] ?? "PRE").toString(),
    }))
    // Ignore les lignes totalement vides (label vide).
    .filter((m) => m.label.length > 0);

  return ReleaseTemplateSchema.safeParse({
    name: (formData.get("name") ?? "").toString().trim(),
    description:
      (formData.get("description") ?? "").toString().trim() || null,
    milestones,
  });
}

export async function createTemplate(
  _prev: TemplateState,
  formData: FormData,
): Promise<TemplateState> {
  const user = await getUserOrRedirect();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const supabase = await createClient();
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

export async function updateTemplate(
  id: string,
  _prev: TemplateState,
  formData: FormData,
): Promise<TemplateState> {
  await getUserOrRedirect();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("release_template")
    .update({
      name: parsed.data.name,
      description: parsed.data.description,
      milestones: parsed.data.milestones,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteTemplate(id: string) {
  await getUserOrRedirect();
  const supabase = await createClient();
  await supabase.from("release_template").delete().eq("id", id);
  revalidatePath("/settings");
}

export async function duplicateTemplate(id: string) {
  const user = await getUserOrRedirect();
  const supabase = await createClient();
  const { data: src } = await supabase
    .from("release_template")
    .select("name, description, milestones")
    .eq("id", id)
    .maybeSingle();
  if (!src) return;

  await supabase.from("release_template").insert({
    user_id: user.id,
    name: `${src.name} (copie)`,
    description: src.description,
    milestones: coerceMilestones(src.milestones),
    is_builtin: false,
  });
  revalidatePath("/settings");
}
