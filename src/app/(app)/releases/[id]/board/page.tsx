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
import { BoardView } from "@/components/board-view";
import { GeneratePlanButton } from "@/components/generate-plan-button";
import { buttonVariants } from "@/components/ui/button";
import { listKeyStatuses } from "@/lib/ai/keys";
import type { BoardItem } from "@/components/content-card";
import type { PipelineStatus } from "@/lib/domain/content";

// La génération IA peut prendre plusieurs dizaines de secondes.
export const maxDuration = 300;

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

  const canGenerate = (await listKeyStatuses()).length > 0;
  const isEmpty = items.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link
            href={`/releases/${id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← {release.title}
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">Pipeline</h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          {canGenerate ? (
            <GeneratePlanButton releaseId={id} size="sm" />
          ) : (
            <Link
              href="/settings"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Configure une clé IA
            </Link>
          )}
          {publishedCount ? (
            <span className="text-xs text-muted-foreground">
              {publishedCount} publié{publishedCount > 1 ? "s" : ""} (archivés)
            </span>
          ) : null}
        </div>
      </div>

      {isEmpty && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">
            Pipeline vide. Génère un plan de contenu par IA, ou ajoute des cartes
            à la main dans le Backlog.
          </p>
          {canGenerate ? (
            <GeneratePlanButton releaseId={id} />
          ) : (
            <Link href="/settings" className={buttonVariants()}>
              Configure une clé IA dans Réglages
            </Link>
          )}
        </div>
      )}

      <BoardView releaseId={id} items={items} sourceBlocks={sourceOptions} />
    </div>
  );
}
