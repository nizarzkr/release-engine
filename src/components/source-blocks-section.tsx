import { createClient } from "@/lib/supabase/server";
import { formatDateFr } from "@/lib/format";
import {
  SOURCE_BLOCK_TYPE_LABELS,
  SOURCE_STATUSES,
  SOURCE_STATUS_LABELS,
  type SourceBlockType,
  type SourceStatus,
} from "@/lib/domain/source-block";
import {
  setSourceBlockStatus,
  deleteSourceBlock,
  promoteRushesToEdit,
} from "@/app/(app)/releases/[id]/source-actions";
import { SourceBlockDialog } from "@/components/source-block-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATUS_BADGE: Record<SourceStatus, "outline" | "secondary" | "default"> = {
  PLANIFIE: "outline",
  TOURNE: "secondary",
  RUSHES_DISPO: "default",
};

export async function SourceBlocksSection({
  releaseId,
}: {
  releaseId: string;
}) {
  const supabase = await createClient();

  const { data: blocks } = await supabase
    .from("source_block")
    .select("*")
    .eq("release_id", releaseId)
    .order("shoot_date", { ascending: true, nullsFirst: false });

  // Compteurs de contenus liés (0 en J4 ; corrects dès J5).
  const { data: contents } = await supabase
    .from("content_item")
    .select("source_block_id, pipeline_status")
    .eq("release_id", releaseId);

  const totalByBlock = new Map<string, number>();
  const aTournerByBlock = new Map<string, number>();
  for (const c of contents ?? []) {
    if (!c.source_block_id) continue;
    totalByBlock.set(
      c.source_block_id,
      (totalByBlock.get(c.source_block_id) ?? 0) + 1,
    );
    if (c.pipeline_status === "A_TOURNER") {
      aTournerByBlock.set(
        c.source_block_id,
        (aTournerByBlock.get(c.source_block_id) ?? 0) + 1,
      );
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Tournages</h2>
          <p className="text-sm text-muted-foreground">
            Un tournage alimente plusieurs contenus.
          </p>
        </div>
        <SourceBlockDialog
          releaseId={releaseId}
          triggerLabel="Ajouter un tournage"
          triggerVariant="default"
          triggerSize="default"
        />
      </div>

      {!blocks || blocks.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aucun tournage pour l&apos;instant.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {blocks.map((b) => {
            const total = totalByBlock.get(b.id) ?? 0;
            const aTourner = aTournerByBlock.get(b.id) ?? 0;
            const status = b.status as SourceStatus;
            return (
              <li key={b.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {SOURCE_BLOCK_TYPE_LABELS[b.type as SourceBlockType] ??
                          b.type}
                      </span>
                      <Badge variant={STATUS_BADGE[status]}>
                        {SOURCE_STATUS_LABELS[status]}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {b.shoot_date ? formatDateFr(b.shoot_date) : "Date non définie"}
                      {" · "}
                      {total} contenu{total > 1 ? "s" : ""} lié
                      {total > 1 ? "s" : ""}
                    </div>
                    {b.asset_link && (
                      <a
                        href={b.asset_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs underline underline-offset-2"
                      >
                        Voir les rushes
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <SourceBlockDialog
                      releaseId={releaseId}
                      initial={b}
                      triggerLabel="Éditer"
                      triggerVariant="outline"
                    />
                    <form action={deleteSourceBlock.bind(null, b.id, releaseId)}>
                      <Button type="submit" variant="ghost" size="sm">
                        Supprimer
                      </Button>
                    </form>
                  </div>
                </div>

                {/* Contrôle de statut */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {SOURCE_STATUSES.map((s) => (
                    <form
                      key={s}
                      action={setSourceBlockStatus.bind(null, b.id, releaseId, s)}
                    >
                      <button
                        type="submit"
                        disabled={s === status}
                        className={
                          s === status
                            ? buttonVariants({ variant: "secondary", size: "xs" })
                            : buttonVariants({ variant: "ghost", size: "xs" })
                        }
                      >
                        {SOURCE_STATUS_LABELS[s]}
                      </button>
                    </form>
                  ))}
                </div>

                {/* Cascade : proposée uniquement quand les rushes sont dispo
                    ET qu'il reste des contenus À_TOURNER. */}
                {status === "RUSHES_DISPO" && aTourner > 0 && (
                  <form
                    action={promoteRushesToEdit.bind(null, b.id, releaseId)}
                    className="mt-3"
                  >
                    <Button type="submit" size="sm">
                      Basculer {aTourner} contenu{aTourner > 1 ? "s" : ""} → À
                      monter
                    </Button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
