import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/domain/timeline";
import { cardTitle, PIPELINE_LABELS, type PipelineStatus } from "@/lib/domain/content";
import {
  CHECKLIST_PHASE_LABELS,
  type ChecklistPhase,
} from "@/lib/domain/checklist";
import { formatDateFr } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type DueItem = {
  key: string;
  kind: "content" | "checklist";
  releaseId: string;
  releaseTitle: string;
  title: string;
  date: string;
  badge: string;
  href: string;
};

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
    items.push({
      key: `c-${c.id}`,
      kind: "content",
      releaseId: c.release_id,
      releaseTitle: titleOf.get(c.release_id) ?? "—",
      title: cardTitle({ brief: c.brief, theme: c.theme }),
      date: c.scheduled_date,
      badge:
        PIPELINE_LABELS[(c.pipeline_status ?? "BACKLOG") as PipelineStatus] ??
        "",
      href: `/releases/${c.release_id}/board`,
    });
  }
  for (const t of checks ?? []) {
    if (!t.due_date) continue;
    items.push({
      key: `t-${t.id}`,
      kind: "checklist",
      releaseId: t.release_id,
      releaseTitle: titleOf.get(t.release_id) ?? "—",
      title: t.label,
      date: t.due_date,
      badge: CHECKLIST_PHASE_LABELS[(t.phase ?? "PRE") as ChecklistPhase] ?? "",
      href: `/releases/${t.release_id}`,
    });
  }

  const byDate = (a: DueItem, b: DueItem) => a.date.localeCompare(b.date);
  const overdue = items.filter((i) => i.date < today).sort(byDate);
  const upcoming = items.filter((i) => i.date >= today).sort(byDate);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Bonjour, {profile.artist_name}
          </h1>
          <p className="text-muted-foreground">
            Ce qui arrive à échéance dans les 14 prochains jours.
          </p>
        </div>
        <Link href="/releases/new" className={buttonVariants()}>
          Créer une release
        </Link>
      </div>

      {overdue.length === 0 && upcoming.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Rien d&apos;urgent 🎉 — profite-en pour générer un plan ou planifier
            un tournage.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {overdue.length > 0 && (
            <DueList
              title="En retard"
              items={overdue}
              today={today}
              tone="danger"
            />
          )}
          <DueList
            title="À venir (14 jours)"
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
  items,
  today,
  tone,
}: {
  title: string;
  items: DueItem[];
  today: string;
  tone: "default" | "danger";
}) {
  return (
    <Card className={tone === "danger" ? "border-destructive/40" : undefined}>
      <CardHeader>
        <CardTitle
          className={`text-base ${tone === "danger" ? "text-destructive" : ""}`}
        >
          {title} · {items.length}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 pt-0">
        {items.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            Rien à afficher.
          </p>
        ) : (
          items.map((it) => (
            <Link
              key={it.key}
              href={it.href}
              className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted"
            >
              <span
                className={`w-16 shrink-0 text-xs ${
                  it.date < today
                    ? "font-medium text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {formatDateFr(it.date)}
              </span>
              <span className="flex-1 truncate text-sm">{it.title}</span>
              {it.badge && (
                <Badge variant="outline" className="shrink-0">
                  {it.badge}
                </Badge>
              )}
              <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                {it.releaseTitle}
              </span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
