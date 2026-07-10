import Link from "next/link";
import { redirect } from "next/navigation";
import { Rocket, Plus, Clock, TriangleAlert } from "lucide-react";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/domain/timeline";
import {
  cardTitle,
  PIPELINE_LABELS,
  type PipelineStatus,
} from "@/lib/domain/content";
import {
  CHECKLIST_PHASE_LABELS,
  type ChecklistPhase,
} from "@/lib/domain/checklist";
import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatusTone = "green" | "amber" | "blue" | "rose" | "gray";

type DueItem = {
  key: string;
  kind: "content" | "checklist";
  releaseId: string;
  releaseTitle: string;
  title: string;
  date: string;
  badge: string;
  tone: StatusTone;
  href: string;
};

// Couleur douce du badge selon le statut / la phase.
const TONE_BADGE: Record<StatusTone, string> = {
  green: "bg-[#eaf4ee] text-[#1e7a54]",
  amber: "bg-[#f6eedc] text-[#9a6d1e]",
  blue: "bg-[#e9eff7] text-[#345c93]",
  rose: "bg-[#f7e8e6] text-[#a8433d]",
  gray: "bg-muted text-muted-foreground",
};

const PIPELINE_TONE: Record<PipelineStatus, StatusTone> = {
  BACKLOG: "gray",
  A_TOURNER: "amber",
  A_MONTER: "blue",
  READY: "green",
};

const PHASE_TONE: Record<ChecklistPhase, StatusTone> = {
  PRE: "amber",
  POST: "green",
};

const MONTHS_FR = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
];

function datePill(iso: string) {
  return {
    d: iso.slice(8, 10),
    m: MONTHS_FR[Number(iso.slice(5, 7)) - 1] ?? "",
  };
}

export default async function DashboardPage() {
  const profile = await getProfile();
  if (!profile) redirect("/onboarding");

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const horizon = addDays(today, 14);

  const [{ data: contents }, { data: checks }, { data: releases }] =
    await Promise.all([
      supabase
        .from("content_item")
        .select("id, release_id, theme, brief, pipeline_status, scheduled_date")
        .eq("is_published", false)
        .not("scheduled_date", "is", null)
        .lte("scheduled_date", horizon),
      supabase
        .from("checklist_item")
        .select("id, release_id, label, phase, due_date")
        .eq("is_done", false)
        .not("due_date", "is", null)
        .lte("due_date", horizon),
      supabase.from("release").select("id, title"),
    ]);

  const titleOf = new Map((releases ?? []).map((r) => [r.id, r.title]));

  const items: DueItem[] = [];
  for (const c of contents ?? []) {
    if (!c.scheduled_date) continue;
    const status = (c.pipeline_status ?? "BACKLOG") as PipelineStatus;
    items.push({
      key: `c-${c.id}`,
      kind: "content",
      releaseId: c.release_id,
      releaseTitle: titleOf.get(c.release_id) ?? "—",
      title: cardTitle({ brief: c.brief, theme: c.theme }),
      date: c.scheduled_date,
      badge: PIPELINE_LABELS[status] ?? "",
      tone: PIPELINE_TONE[status] ?? "gray",
      href: `/releases/${c.release_id}/board`,
    });
  }
  for (const t of checks ?? []) {
    if (!t.due_date) continue;
    const phase = (t.phase ?? "PRE") as ChecklistPhase;
    items.push({
      key: `t-${t.id}`,
      kind: "checklist",
      releaseId: t.release_id,
      releaseTitle: titleOf.get(t.release_id) ?? "—",
      title: t.label,
      date: t.due_date,
      badge: CHECKLIST_PHASE_LABELS[phase] ?? "",
      tone: PHASE_TONE[phase] ?? "gray",
      href: `/releases/${t.release_id}`,
    });
  }

  const byDate = (a: DueItem, b: DueItem) => a.date.localeCompare(b.date);
  const overdue = items.filter((i) => i.date < today).sort(byDate);
  const upcoming = items.filter((i) => i.date >= today).sort(byDate);

  const stats = [
    { label: "Releases actives", value: releases?.length ?? 0, tone: "" },
    { label: "Tâches en retard", value: overdue.length, tone: "text-destructive" },
    { label: "Échéances · 14 j", value: items.length, tone: "text-primary" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Bonjour, {profile.artist_name}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Voici ce qui arrive à échéance dans les 14 prochains jours.
          </p>
        </div>
        <Link href="/releases/new" className={buttonVariants({ size: "lg" })}>
          <Plus className="h-4 w-4" />
          Créer une release
        </Link>
      </div>

      {/* Tuiles de stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex flex-col gap-2">
              <span
                className={cn(
                  "text-4xl font-semibold tracking-tight tabular-nums",
                  s.tone,
                )}
              >
                {s.value}
              </span>
              <span className="text-sm text-muted-foreground">{s.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {overdue.length === 0 && upcoming.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="Rien d'urgent 🎉"
          description="Profite-en pour générer un plan de contenu ou planifier un tournage."
          action={{ href: "/releases", label: "Voir mes releases" }}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {overdue.length > 0 && (
            <DueList
              title="En retard"
              icon={TriangleAlert}
              items={overdue}
              today={today}
              tone="danger"
            />
          )}
          <DueList
            title="À venir · 14 jours"
            icon={Clock}
            items={upcoming}
            today={today}
            tone="default"
          />
        </div>
      )}
    </div>
  );
}

function DueList({
  title,
  icon: Icon,
  items,
  today,
  tone,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: DueItem[];
  today: string;
  tone: "default" | "danger";
}) {
  const isDanger = tone === "danger";
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <Icon
            className={cn(
              "h-4 w-4",
              isDanger ? "text-destructive" : "text-muted-foreground",
            )}
          />
          <span
            className={cn(
              "text-xs font-semibold uppercase tracking-wider",
              isDanger ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {title}
          </span>
          <span className="text-xs text-muted-foreground/70">
            · {items.length}
          </span>
        </div>

        {items.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Rien à afficher.</p>
        ) : (
          <div className="-mx-2 divide-y divide-border">
            {items.map((it) => {
              const late = it.date < today;
              const { d, m } = datePill(it.date);
              return (
                <Link
                  key={it.key}
                  href={it.href}
                  className="flex items-center gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-secondary"
                >
                  <div
                    className={cn(
                      "flex w-14 shrink-0 flex-col items-center rounded-xl border bg-secondary py-2",
                      late && "border-destructive/40",
                    )}
                  >
                    <span
                      className={cn(
                        "text-base font-semibold leading-none tabular-nums",
                        late && "text-destructive",
                      )}
                    >
                      {d}
                    </span>
                    <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {m}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {it.title}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {it.releaseTitle}
                    </div>
                  </div>
                  {it.badge && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "shrink-0 rounded-md border-transparent font-medium",
                        TONE_BADGE[it.tone],
                      )}
                    >
                      {it.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
