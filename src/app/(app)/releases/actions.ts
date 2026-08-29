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
import { addDays, type MilestoneDef } from "@/lib/domain/timeline";
import { syncGoogleBestEffort } from "@/lib/google/sync";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type ReleaseState = { error?: string };

type CurrentRelease = {
  window_template: string | null;
  milestones: unknown;
  release_date: string;
};

/**
 * Valide le formulaire ET fige un snapshot des jalons du template choisi
 * (`template_id`) → éditer/supprimer le format ensuite ne touche pas la release.
 *
 * En édition (`current` fourni), le snapshot n'est REFAIT que si le format a
 * changé : sinon on conserve les jalons de la release, qui ont pu être
 * renommés ou redatés depuis la timeline.
 */
async function parseForm(
  formData: FormData,
  supabase: SupabaseClient<Database>,
  current?: CurrentRelease,
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

  const keepEdits = Boolean(
    current && template.name === current.window_template,
  );

  const parentRaw = formData.get("parent_release_id");
  const parsed = ReleaseSchema.safeParse({
    title: (formData.get("title") ?? "").toString().trim(),
    type: formData.get("type"),
    release_date: (formData.get("release_date") ?? "").toString(),
    window_template: template.name,
    milestones: coerceMilestones(
      keepEdits ? current!.milestones : template.milestones,
    ),
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
  return { success: true as const, data: parsed.data, keepEdits };
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

  const { data: current } = await supabase
    .from("release")
    .select("window_template, milestones, release_date")
    .eq("id", id)
    .maybeSingle();

  const parsed = await parseForm(formData, supabase, current ?? undefined);
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

  if (current) {
    if (!parsed.keepEdits) {
      // Changement de format : le snapshot est reconstruit, les clés de jalons
      // ne désignent plus rien. On détache les cartes (elles restent dans le
      // board) plutôt que de les laisser pointer vers un jalon fantôme.
      await supabase
        .from("content_item")
        .update({ milestone_key: null })
        .eq("release_id", id)
        .not("milestone_key", "is", null);
    } else if (current.release_date !== parsed.data.release_date) {
      await redateMilestoneCards(supabase, id, parsed.data);
    }
  }

  await syncGoogleBestEffort();
  revalidatePath("/releases");
  revalidatePath(`/releases/${id}`);
  revalidatePath(`/releases/${id}/board`);
  revalidatePath("/studio");
  redirect(`/releases/${id}`);
}

/**
 * La date de sortie a bougé : les jalons sont relatifs (J±) donc ils suivent
 * tout seuls, mais les cartes qu'ils ont générées portent une date absolue.
 * On les recale pour que le board ne mente pas.
 */
async function redateMilestoneCards(
  supabase: SupabaseClient<Database>,
  releaseId: string,
  release: { release_date: string; milestones: MilestoneDef[] },
) {
  const { data: cards } = await supabase
    .from("content_item")
    .select("id, milestone_key")
    .eq("release_id", releaseId)
    .not("milestone_key", "is", null);
  if (!cards?.length) return;

  const offsets = new Map(release.milestones.map((m) => [m.key, m.offset]));
  await Promise.all(
    cards.map((card) => {
      const offset = offsets.get(card.milestone_key ?? "");
      if (offset === undefined) return null;
      return supabase
        .from("content_item")
        .update({ scheduled_date: addDays(release.release_date, offset) })
        .eq("id", card.id);
    }),
  );
}

export async function deleteRelease(id: string) {
  await getUserOrRedirect();
  const supabase = await createClient();
  await supabase.from("release").delete().eq("id", id);
  await syncGoogleBestEffort();
  revalidatePath("/releases");
  redirect("/releases");
}
