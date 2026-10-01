import { createClient } from "@/lib/supabase/server";
import { getUserOrRedirect } from "@/lib/auth";
import { coerceMilestones } from "@/lib/domain/release-template";
import {
  SOURCE_BLOCK_TYPE_LABELS,
  type SourceBlockType,
} from "@/lib/domain/source-block";
import {
  EXPORT_SCOPES,
  FORMATS_BY_SCOPE,
  buildReleaseExport,
  checklistTable,
  contentsTable,
  exportFileName,
  milestonesTable,
  timelineTable,
  toCsv,
  type ExportFormat,
  type ExportScope,
} from "@/lib/domain/export";
import { formatDateFr } from "@/lib/format";
import { renderReleasePdf } from "@/lib/export/pdf";
import { renderWorkbook } from "@/lib/export/xlsx";

const MIME: Record<ExportFormat, string> = {
  pdf: "application/pdf",
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/**
 * GET /releases/:id/export?scope=all|checklist|timeline&format=pdf|csv|xlsx
 * Télécharge la checklist, la timeline de contenu, ou le plan de sortie
 * complet. La RLS garantit qu'on n'exporte que ses propres releases.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await getUserOrRedirect();
  const { id } = await params;
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") as ExportScope;
  const format = url.searchParams.get("format") as ExportFormat;
  if (
    !EXPORT_SCOPES.includes(scope) ||
    !FORMATS_BY_SCOPE[scope].includes(format)
  ) {
    return new Response("Export invalide.", { status: 400 });
  }

  const supabase = await createClient();
  const { data: release } = await supabase
    .from("release")
    .select("title, type, release_date, window_template, milestones")
    .eq("id", id)
    .maybeSingle();
  if (!release) return new Response("Release introuvable.", { status: 404 });

  const [{ data: tasks }, { data: contents }, { data: blocks }] =
    await Promise.all([
      supabase
        .from("checklist_item")
        .select("label, phase, due_date, is_done")
        .eq("release_id", id),
      supabase
        .from("content_item")
        .select(
          "theme, milestone_key, platform, format, objective_tag, pipeline_status, is_published, source_block_id, tags, scheduled_date, brief",
        )
        .eq("release_id", id),
      supabase
        .from("source_block")
        .select("id, type, shoot_date")
        .eq("release_id", id),
    ]);

  const sourceBlockLabels = new Map(
    (blocks ?? []).map((b) => [
      b.id,
      (SOURCE_BLOCK_TYPE_LABELS[b.type as SourceBlockType] ?? b.type) +
        (b.shoot_date ? ` — ${formatDateFr(b.shoot_date)}` : ""),
    ]),
  );
  const milestones = coerceMilestones(release.milestones);
  const data = buildReleaseExport({
    release,
    milestones,
    tasks: tasks ?? [],
    contents: contents ?? [],
    sourceBlockLabels,
    today: new Date().toISOString().slice(0, 10),
  });

  let body: Buffer | string;
  if (format === "pdf") {
    body = await renderReleasePdf(data, scope);
  } else if (format === "xlsx") {
    body = await renderWorkbook([
      checklistTable(data),
      milestonesTable(data),
      contentsTable(data),
    ]);
  } else {
    body = toCsv(
      scope === "checklist"
        ? checklistTable(data)
        : timelineTable(data, milestones, release.release_date),
    );
  }

  const filename = exportFileName(scope, release.title, release.release_date, format);
  return new Response(new Uint8Array(Buffer.from(body)), {
    headers: {
      "Content-Type": MIME[format],
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
