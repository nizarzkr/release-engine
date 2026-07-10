import Link from "next/link";
import { Music, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserOrRedirect } from "@/lib/auth";
import { formatDateFr } from "@/lib/format";
import { daysBetween } from "@/lib/domain/timeline";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

// Couleurs de pastille, assignées de façon déterministe par position.
const COVER_COLORS = ["#22201C", "#3E6DAE", "#1E8A5F", "#C08A2E", "#C15A54"];

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planifiée",
  ACTIVE: "En cours",
  RELEASED: "Sortie",
  DONE: "Terminée",
};

function coverLetter(title: string) {
  const m = title.match(/[a-z0-9]/i);
  return (m?.[0] ?? "•").toUpperCase();
}

function countdown(today: string, releaseDate: string) {
  const d = daysBetween(today, releaseDate);
  if (d > 0) return { label: `J-${d}`, tone: "text-foreground" };
  if (d === 0) return { label: "Aujourd'hui", tone: "text-primary" };
  return { label: "Sortie", tone: "text-muted-foreground" };
}

export default async function ReleasesPage() {
  await getUserOrRedirect();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: releases }, { data: checkRows }] = await Promise.all([
    supabase
      .from("release")
      .select("id, title, type, release_date, window_template, status")
      .order("release_date", { ascending: true }),
    supabase.from("checklist_item").select("release_id, is_done"),
  ]);

  // Avancement par release = tâches de checklist cochées / total.
  const progressOf = new Map<string, { done: number; total: number }>();
  for (const row of checkRows ?? []) {
    const agg = progressOf.get(row.release_id) ?? { done: 0, total: 0 };
    agg.total += 1;
    if (row.is_done) agg.done += 1;
    progressOf.set(row.release_id, agg);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Releases</h1>
          <p className="mt-1 text-muted-foreground">
            Tes sorties et leurs fenêtres de promo.
          </p>
        </div>
        <Link href="/releases/new" className={buttonVariants({ size: "lg" })}>
          <Plus className="h-4 w-4" />
          Nouvelle release
        </Link>
      </div>

      {!releases || releases.length === 0 ? (
        <EmptyState
          icon={Music}
          title="Aucune release pour l'instant"
          description="Crée ta première sortie pour générer sa timeline de promo et son plan de contenu."
          action={{ href: "/releases/new", label: "Créer ma première release" }}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {releases.map((r, i) => {
            const cd = countdown(today, r.release_date);
            const prog = progressOf.get(r.id);
            const pct =
              prog && prog.total > 0
                ? Math.round((prog.done / prog.total) * 100)
                : null;
            return (
              <li key={r.id}>
                <Link href={`/releases/${r.id}`} className="block h-full">
                  <Card className="h-full transition-transform hover:-translate-y-0.5">
                    <CardContent className="flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-semibold text-white"
                            style={{
                              backgroundColor:
                                COVER_COLORS[i % COVER_COLORS.length],
                            }}
                          >
                            {coverLetter(r.title)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {r.title}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge
                                variant="secondary"
                                className="rounded-md font-medium"
                              >
                                {r.type === "EP" ? "EP" : "Single"}
                              </Badge>
                              <span>·</span>
                              <span>{r.window_template}</span>
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className={cn("text-sm font-semibold", cd.tone)}>
                            {cd.label}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {formatDateFr(r.release_date)}
                          </div>
                        </div>
                      </div>

                      {pct !== null ? (
                        <div>
                          <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {prog!.done}/{prog!.total} tâches
                            </span>
                            <span className="tabular-nums">{pct}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          {r.status
                            ? (STATUS_LABELS[r.status] ?? r.status)
                            : "—"}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
