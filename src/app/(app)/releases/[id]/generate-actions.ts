"use server";

import { revalidatePath } from "next/cache";
import { generateObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getUserOrRedirect, getProfile } from "@/lib/auth";
import { getDecryptedKey } from "@/lib/ai/keys";
import { getModel } from "@/lib/ai/providers";
import {
  AI_PROVIDER_ORDER,
  AI_PROVIDERS,
  type AiProvider,
} from "@/lib/ai/config";
import {
  buildTimeline,
  addDays,
  type WindowTemplate,
} from "@/lib/domain/timeline";
import {
  ContentPlanSchema,
  RegeneratedItemSchema,
  DEFAULT_THEMES,
} from "@/lib/domain/content-plan";
import { buildContentPlanPrompt, buildRegenPrompt } from "@/lib/ai/prompt";

/** Choisit la première clé configurée par ordre de priorité (Claude > GPT > Gemini). */
async function pickProvider(): Promise<{
  provider: AiProvider;
  apiKey: string;
} | null> {
  for (const provider of AI_PROVIDER_ORDER) {
    const apiKey = await getDecryptedKey(provider);
    if (apiKey) return { provider, apiKey };
  }
  return null;
}

export type ContentPlanState = {
  ok?: boolean;
  error?: string;
  count?: number;
  provider?: string;
};

export async function generateContentPlan(
  releaseId: string,
  _prev: ContentPlanState,
  _formData: FormData,
): Promise<ContentPlanState> {
  const user = await getUserOrRedirect();

  const profile = await getProfile();
  if (!profile) {
    return { error: "Complète d'abord ton profil artiste." };
  }

  const supabase = await createClient();
  const { data: release } = await supabase
    .from("release")
    .select("*")
    .eq("id", releaseId)
    .maybeSingle();
  if (!release) {
    return { error: "Release introuvable." };
  }

  const picked = await pickProvider();
  if (!picked) {
    return { error: "Ajoute une clé API dans Réglages pour générer." };
  }
  const { provider, apiKey } = picked;

  const { data: sourceBlocks } = await supabase
    .from("source_block")
    .select("type, status, shoot_date")
    .eq("release_id", releaseId);

  const timeline = buildTimeline(
    (release.window_template ?? "MARATHON") as WindowTemplate,
    release.release_date,
  );
  const { system, prompt } = buildContentPlanPrompt({
    profile,
    release,
    timeline,
    themes: [...DEFAULT_THEMES],
    sourceBlocks: sourceBlocks ?? [],
  });

  let items;
  try {
    const { object } = await generateObject({
      model: getModel(provider, apiKey),
      schema: ContentPlanSchema,
      schemaName: "content_plan",
      system,
      prompt,
    });
    items = object.items;
  } catch {
    return {
      error:
        "La génération a échoué (clé invalide, quota atteint, ou réponse inattendue). Réessaie.",
    };
  }

  if (!items || items.length === 0) {
    return { error: "Aucun contenu généré. Réessaie." };
  }

  const clamp = (n: number) =>
    Math.max(-timeline.preDays, Math.min(timeline.postDays, Math.round(n)));

  const rows = items.map((it) => ({
    user_id: user.id,
    release_id: releaseId,
    theme: it.theme,
    format: it.format,
    platform: it.platform,
    objective_tag: it.objective_tag,
    brief: it.brief,
    pipeline_status: "BACKLOG" as const,
    scheduled_date: addDays(
      release.release_date,
      clamp(it.suggested_day_offset),
    ),
  }));

  const { error } = await supabase.from("content_item").insert(rows);
  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/releases/${releaseId}/board`);
  return { ok: true, count: rows.length, provider: AI_PROVIDERS[provider].label };
}

export type RegenState = { ok?: boolean; error?: string };

export async function regenerateContentItem(
  itemId: string,
  releaseId: string,
  _prev: RegenState,
  formData: FormData,
): Promise<RegenState> {
  await getUserOrRedirect();

  const microPrompt = (formData.get("micro_prompt") ?? "").toString().trim();
  if (!microPrompt) {
    return { error: "Décris la variation souhaitée." };
  }

  const profile = await getProfile();
  if (!profile) return { error: "Complète d'abord ton profil artiste." };

  const supabase = await createClient();
  const [{ data: item }, { data: release }] = await Promise.all([
    supabase.from("content_item").select("*").eq("id", itemId).maybeSingle(),
    supabase.from("release").select("*").eq("id", releaseId).maybeSingle(),
  ]);
  if (!item || !release) return { error: "Contenu introuvable." };

  const picked = await pickProvider();
  if (!picked) {
    return { error: "Ajoute une clé API dans Réglages pour regénérer." };
  }

  const { system, prompt } = buildRegenPrompt({
    profile,
    release,
    item,
    microPrompt,
  });

  let out;
  try {
    const { object } = await generateObject({
      model: getModel(picked.provider, picked.apiKey),
      schema: RegeneratedItemSchema,
      schemaName: "regenerated_item",
      system,
      prompt,
    });
    out = object;
  } catch {
    return {
      error: "La regénération a échoué (clé invalide, quota, ou réponse inattendue).",
    };
  }

  // On ne touche ni au thème ni à la date programmée (raffiner en place).
  const { error } = await supabase
    .from("content_item")
    .update({
      format: out.format,
      platform: out.platform,
      objective_tag: out.objective_tag,
      brief: out.brief,
    })
    .eq("id", itemId);
  if (error) return { error: error.message };

  revalidatePath(`/releases/${releaseId}/board`);
  return { ok: true };
}
