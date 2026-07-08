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
import { ContentPlanSchema, DEFAULT_THEMES } from "@/lib/domain/content-plan";
import { buildContentPlanPrompt } from "@/lib/ai/prompt";

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

  // Choix du provider : première clé disponible par ordre de priorité.
  let provider: AiProvider | null = null;
  let apiKey: string | null = null;
  for (const p of AI_PROVIDER_ORDER) {
    const k = await getDecryptedKey(p);
    if (k) {
      provider = p;
      apiKey = k;
      break;
    }
  }
  if (!provider || !apiKey) {
    return { error: "Ajoute une clé API dans Réglages pour générer." };
  }

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
