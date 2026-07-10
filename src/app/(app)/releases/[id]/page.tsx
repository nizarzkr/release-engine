import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ListChecks,
  GanttChartSquare,
  Columns3,
  Check,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserOrRedirect } from "@/lib/auth";
import { formatDateFr } from "@/lib/format";
import { coerceMilestones } from "@/lib/domain/release-template";
import {
  buildTimelineFromMilestones,
  formatOffset,
  daysBetween,
  type MilestonePhase,
} from "@/lib/domain/timeline";
import {
  PIPELINE_STATUSES,
  PIPELINE_LABELS,
  type PipelineStatus,
} from "@/lib/domain/content";
import {
  CHECKLIST_PHASES,
  CHECKLIST_PHASE_LABELS,
  type ChecklistPhase,
} from "@/lib/domain/checklist";
import { TimelineView } from "@/components/timeline-view";
import { SourceBlocksSection } from "@/components/source-blocks-section";
import { ChecklistSection } from "@/components/checklist-section";
import { toggleChecklistItem } from "./checklist-actions";
import { deleteRelease } from "../actions";
import { ReleaseTabs, TabLink } from "./release-tabs";
import { ReleaseActionsMenu } from "./release-actions-menu";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PHASE_DOT: Record<MilestonePhase, string> = {
  PRE: "#3E6DAE",
  DAY: "#1E8A5F",
  POST: "#C08A2E",
};

const PIPELINE_DOT: Record<PipelineStatus, string> = {
  BACKLOG: "#B0AB9F",
  A_TOURNER: "#C08A2E",
  A_MONTER: "#3E6DAE",
  READY: "#1E8A5F",
};

function coverLetter(title: string) {
  return (title.match(/[a-z0-9]/i)?.[0] ?? "•").toUpperCase();
}

export default async function ReleaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await getUserOrRedirect();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: release } = await supabase
    .from("release")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!release) {
    notFound();
  }

  const [{ data: checkItems }, { data: contentRows }, { count: tournageCount }] =
    await Promise.all([
      supabase
        .from("checklist_item")
        .select("id, label, phase, due_date, is_done")
        .eq("release_id", id)
        .order("due_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("content_item")
        .select("pipeline_status")
        .eq("release_id", id),
      supabase
        .from("source_block")
        .select("*", { count: "exact", head: true })
        .eq("release_id", id),
    ]);

  const parent = release.parent_release_id
    ? (
        await supabase
          .from("release")
          .select("id, title")
          .eq("id", release.parent_release_id)
          .maybeSingle()
      ).data
    : null;

  // --- Checklist ---
  const checks = checkItems ?? [];
  const doneCount = checks.filter((c) => c.is_done).length;
  const totalChecks = checks.length;
  const checkPct =
    totalChecks > 0 ? Math.round((doneCount / totalChecks) * 100) : 0;
  const phaseStat = (phase: ChecklistPhase) => {
    const g = checks.filter((c) => c.phase === phase);
    return { done: g.filter((c) => c.is_done).length, total: g.length };
  };
  const nextTasks = checks.filter((c) => !c.is_done).slice(0, 3);

  // --- Contenu ---
  const contents = contentRows ?? [];
  const contentCount = (status: PipelineStatus) =>
    contents.filter((c) => (c.pipeline_status ?? "BACKLOG") === status).length;

  // --- Timeline (aperçu) ---
  const milestones = coerceMilestones(release.milestones);
  const timeline = buildTimelineFromMilestones(milestones, release.release_date);
  const upcoming = timeline.milestones.filter((m) => m.date >= today);
  const timelinePreview = (upcoming.length ? upcoming : timeline.milestones).slice(
    0,
    3,
  );

  const days = daysBetween(today, release.release_date);
  const jLabel = days > 0 ? `J-${days}` : days === 0 ? "Jour J" : "Sortie";

  const overview = (
    <div className="flex flex-col gap-4">
      {/* HÉROS CHECKLIST */}
      <Card className="shadow-[0_1px_2px_rgba(34,32,28,0.04),0_10px_28px_rgba(30,138,95,0.08)] ring-primary/25">
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
              <ListChecks className="h-[18px] w-[18px]" />
            </span>
            <h2 className="text-base font-semibold tracking-tight">Checklist</h2>
            <div className="ml-auto text-right">
              <div className="text-[22px] font-semibold leading-none tracking-tight">
                {checkPct}%
              </div>
              <div className="mt-1 text-[11.5px] text-muted-foreground">
                {doneCount}/{totalChecks} tâches faites
              </div>
            </div>
          </div>

          <div className="h-2.5 overflow-hidden rounded-full border bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${checkPct}%` }}
            />
          </div>

          {totalChecks === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune tâche pour l&apos;instant — ajoute la checklist type depuis
              l&apos;onglet Checklist.
            </p>
          ) : (
            <>
              <div className="flex gap-2.5">
                {CHECKLIST_PHASES.map((phase) => {
                  const s = phaseStat(phase);
                  return (
                    <div
                      key={phase}
                      className="flex flex-1 items-center gap-2 rounded-[10px] border bg-secondary px-3 py-2.5 text-[12.5px]"
                    >
                      <span
                        className="h-[7px] w-[7px] rounded-full"
                        style={{
                          background:
                            phase === "PRE" ? PHASE_DOT.PRE : PHASE_DOT.POST,
                        }}
                      />
                      {CHECKLIST_PHASE_LABELS[phase]}
                      <span className="ml-auto font-semibold">
                        {s.done}/{s.total}
                      </span>
                    </div>
                  );
                })}
              </div>

              {nextTasks.length > 0 && (
                <div>
                  <div className="mb-1 mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Prochaines tâches
                  </div>
                  <ul>
                    {nextTasks.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center gap-3 border-t py-2.5 first:border-t-0"
                      >
                        <form
                          action={toggleChecklistItem.bind(null, t.id, id, true)}
                          className="flex"
                        >
                          <button
                            type="submit"
                            aria-label="Cocher la tâche"
                            className="flex h-[19px] w-[19px] items-center justify-center rounded-[6px] border-2 border-input text-transparent transition-colors hover:border-primary hover:text-primary/40"
                          >
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </button>
                        </form>
                        <span className="flex-1 text-[13.5px]">{t.label}</span>
                        {t.due_date && (
                          <span className="text-[11.5px] text-muted-foreground">
                            {formatDateFr(t.due_date)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <div className="flex gap-2 border-t pt-3.5">
            <TabLink
              to="checklist"
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 px-3 py-1.5 text-[12.5px] font-medium text-primary transition-colors hover:bg-primary/5"
            >
              Voir toute la checklist
              <ArrowRight className="h-3.5 w-3.5" />
            </TabLink>
          </div>
        </CardContent>
      </Card>

      {/* LIGNE SECONDAIRE : Timeline + Contenu */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              <GanttChartSquare className="h-3.5 w-3.5" />
              Timeline
              <TabLink
                to="timeline"
                className="ml-auto text-[12px] font-semibold normal-case tracking-normal text-primary"
              >
                Tout voir →
              </TabLink>
            </div>
            <ol className="flex flex-col gap-2">
              {timelinePreview.map((m) => (
                <li key={m.key} className="flex items-baseline gap-3">
                  <span
                    className="h-2.5 w-2.5 shrink-0 self-center rounded-full"
                    style={{ background: PHASE_DOT[m.phase] }}
                  />
                  <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">
                    {formatOffset(m.offset)}
                  </span>
                  <span className="flex-1 text-[13px]">{m.label}</span>
                  <span className="text-[11.5px] text-muted-foreground">
                    {formatDateFr(m.date)}
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              <Columns3 className="h-3.5 w-3.5" />
              Contenu
              <Link
                href={`/releases/${id}/board`}
                className="ml-auto text-[12px] font-semibold normal-case tracking-normal text-primary"
              >
                Board →
              </Link>
            </div>
            <ul className="flex flex-col gap-2">
              {PIPELINE_STATUSES.map((status) => (
                <li
                  key={status}
                  className="flex items-center gap-2.5 rounded-[9px] border bg-secondary px-3 py-2 text-[12.5px]"
                >
                  <span
                    className="h-2 w-2 rounded-[3px]"
                    style={{ background: PIPELINE_DOT[status] }}
                  />
                  {PIPELINE_LABELS[status]}
                  <span className="ml-auto font-semibold">
                    {contentCount(status)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/releases"
        className="w-fit text-sm text-muted-foreground hover:text-foreground"
      >
        ← Releases
      </Link>

      {/* EN-TÊTE D'IDENTITÉ */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-foreground text-xl font-semibold text-background">
              {coverLetter(release.title)}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight sm:text-[22px]">
                {release.title}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
                <span className="rounded-md bg-secondary px-2 py-0.5 text-[11.5px] font-medium text-foreground/80 ring-1 ring-border">
                  {release.type === "EP" ? "EP" : "Single"}
                </span>
                <span className="rounded-md bg-secondary px-2 py-0.5 text-[11.5px] font-medium text-foreground/80 ring-1 ring-border">
                  {release.window_template}
                </span>
                <span>Sortie le {formatDateFr(release.release_date)}</span>
                {parent && (
                  <span>
                    · extrait de{" "}
                    <Link
                      href={`/releases/${parent.id}`}
                      className="underline underline-offset-2"
                    >
                      {parent.title}
                    </Link>
                  </span>
                )}
              </div>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <Link
                href={`/releases/${id}/board`}
                className={cn(buttonVariants(), "hidden sm:inline-flex")}
              >
                <Columns3 className="h-4 w-4" />
                Ouvrir le pipeline
              </Link>
              <ReleaseActionsMenu
                editHref={`/releases/${id}/edit`}
                deleteAction={deleteRelease.bind(null, id)}
              />
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 overflow-hidden rounded-xl border sm:grid-cols-[1.4fr_1fr_1fr]">
            <div className="bg-primary/8 p-3.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-primary/80">
                Checklist
              </div>
              <div className="mt-1 text-xl font-semibold tracking-tight">
                {doneCount}
                <span className="text-xs font-normal text-muted-foreground">
                  /{totalChecks} · {checkPct}%
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${checkPct}%` }}
                />
              </div>
            </div>
            <div className="border-t bg-secondary p-3.5 sm:border-l sm:border-t-0">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                Compte à rebours
              </div>
              <div className="mt-1 text-xl font-semibold tracking-tight">
                {jLabel}
              </div>
            </div>
            <div className="border-t bg-secondary p-3.5 sm:border-l sm:border-t-0">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                Contenus
              </div>
              <div className="mt-1 text-xl font-semibold tracking-tight">
                {contents.length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ReleaseTabs
        tabs={[
          { key: "overview", label: "Vue d'ensemble" },
          { key: "timeline", label: "Timeline" },
          { key: "tournages", label: "Tournages", badge: tournageCount ?? 0 },
          { key: "checklist", label: "Checklist", badge: totalChecks },
        ]}
        panels={{
          overview,
          timeline: (
            <Card>
              <CardContent>
                <TimelineView
                  milestones={milestones}
                  releaseDate={release.release_date}
                />
              </CardContent>
            </Card>
          ),
          tournages: (
            <Card>
              <CardContent>
                <SourceBlocksSection releaseId={id} />
              </CardContent>
            </Card>
          ),
          checklist: (
            <Card>
              <CardContent>
                <ChecklistSection releaseId={id} />
              </CardContent>
            </Card>
          ),
        }}
      />
    </div>
  );
}
