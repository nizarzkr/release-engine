import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserOrRedirect } from "@/lib/auth";
import { computeAutoTags } from "@/lib/domain/content-tags";
import {
  SOURCE_BLOCK_TYPE_LABELS,
  type SourceBlockType,
} from "@/lib/domain/source-block";
import { formatDateFr } from "@/lib/format";
import { KanbanBoard } from "@/components/kanban-board";
import type { BoardItem } from "@/components/content-card";
import type { PipelineStatus } from "@/lib/domain/content";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await getUserOrRedirect();
  const supabase = await createClient();

  const { data: release } = await supabase
    .from("release")
    .select("id, title")
    .eq("id", id)
    .maybeSingle();
  if (!release) notFound();

  const [{ data: rawItems }, { data: blocks }, { count: publishedCount }] =
    await Promise.all([
      supabase
        .from("content_item")
        .select("*")
        .eq("release_id", id)
        .eq("is_published", false)
        .order("scheduled_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("source_block")
        .select("id, type, shoot_date, status")
        .eq("release_id", id)
        .order("shoot_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("content_item")
        .select("id", { count: "exact", head: true })
        .eq("release_id", id)
        .eq("is_published", true),
    ]);

  // Index des tournages : statut (tags auto) + libellé (affichage).
  const blockStatus = new Map<string, string | null>();
  const blockLabel = new Map<string, string>();
  const sourceOptions: { id: string; label: string }[] = [];
  for (const b of blocks ?? []) {
    const label =
      (SOURCE_BLOCK_TYPE_LABELS[b.type as SourceBlockType] ?? b.type) +
      (b.shoot_date ? ` — ${formatDateFr(b.shoot_date)}` : "");
    blockStatus.set(b.id, b.status);
    blockLabel.set(b.id, label);
    sourceOptions.push({ id: b.id, label });
  }

  const today = new Date().toISOString().slice(0, 10);

  const items: BoardItem[] = (rawItems ?? []).map((it) => ({
    ...it,
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <Link
            href={`/releases/${id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← {release.title}
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
        </div>
        {publishedCount ? (
          <span className="text-sm text-muted-foreground">
            {publishedCount} publié{publishedCount > 1 ? "s" : ""} (archivés)
          </span>
        ) : null}
      </div>

      <KanbanBoard releaseId={id} items={items} sourceBlocks={sourceOptions} />
    </div>
  );
}
