import { Clapperboard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserOrRedirect } from "@/lib/auth";
import { computeAutoTags } from "@/lib/domain/content-tags";
import {
  SOURCE_BLOCK_TYPE_LABELS,
  type SourceBlockType,
} from "@/lib/domain/source-block";
import { formatDateFr } from "@/lib/format";
import { BoardView } from "@/components/board-view";
import { EmptyState } from "@/components/empty-state";
import type { BoardItem } from "@/components/content-card";
import type { PipelineStatus } from "@/lib/domain/content";

export default async function StudioPage() {
  await getUserOrRedirect();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: rawItems }, { data: blocks }, { data: releases }] =
    await Promise.all([
      supabase
        .from("content_item")
        .select("*")
        .eq("is_published", false)
        .order("scheduled_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true }),
      supabase.from("source_block").select("id, type, shoot_date, status"),
      supabase.from("release").select("id, title"),
    ]);

  const releaseTitle = new Map((releases ?? []).map((r) => [r.id, r.title]));
  const blockStatus = new Map<string, string | null>();
  const blockLabel = new Map<string, string>();
  for (const b of blocks ?? []) {
    const label =
      (SOURCE_BLOCK_TYPE_LABELS[b.type as SourceBlockType] ?? b.type) +
      (b.shoot_date ? ` — ${formatDateFr(b.shoot_date)}` : "");
    blockStatus.set(b.id, b.status);
    blockLabel.set(b.id, label);
  }

  const items: BoardItem[] = (rawItems ?? []).map((it) => ({
    ...it,
    releaseTitle: releaseTitle.get(it.release_id) ?? null,
    sourceBlockLabel: it.source_block_id
      ? (blockLabel.get(it.source_block_id) ?? null)
      : null,
    autoTags: computeAutoTags(
      {
        pipeline_status: (it.pipeline_status ?? "BACKLOG") as PipelineStatus,
        source_block_id: it.source_block_id,
        scheduled_date: it.scheduled_date,
        is_published: it.is_published ?? false,
        sourceBlockStatus: it.source_block_id
          ? (blockStatus.get(it.source_block_id) ?? null)
          : null,
      },
      today,
    ),
  }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Studio</h1>
        <p className="mt-1 text-muted-foreground">
          Toute ta production de contenu, toutes releases confondues.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Clapperboard}
          title="Rien à produire pour l'instant"
          description="Le contenu de tes releases apparaîtra ici. Ouvre une release pour générer un plan ou ajouter des cartes."
          action={{ href: "/releases", label: "Voir mes releases" }}
        />
      ) : (
        <BoardView
          items={items}
          sourceBlocks={[]}
          enableQuickAdd={false}
          releases={(releases ?? []).filter((r) =>
            items.some((it) => it.release_id === r.id),
          )}
          showReleaseFilter
          enableBulkDelete
        />
      )}
    </div>
  );
}
