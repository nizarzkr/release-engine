import Link from "next/link";
import { getUserOrRedirect } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cardTitle } from "@/lib/domain/content";
import {
  buildMonthGrid,
  type CalendarEvent,
} from "@/lib/domain/calendar-month";
import { autoPullIfStale } from "@/lib/google/sync";
import { ReleaseCalendar } from "@/components/release-calendar";

/** Borne le mois demandé (?y=&m=) sinon retombe sur le mois courant. */
function resolveMonth(
  y: string | string[] | undefined,
  m: string | string[] | undefined,
  today: string,
): { year: number; month: number } {
  const year = Number(Array.isArray(y) ? y[0] : y);
  const month = Number(Array.isArray(m) ? m[0] : m);
  if (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    year >= 2000 &&
    year <= 2100 &&
    month >= 1 &&
    month <= 12
  ) {
    return { year, month };
  }
  return { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string | string[]; m?: string | string[] }>;
}) {
  await getUserOrRedirect();
  // Tire les éventuelles modifs faites dans Google (throttlé) avant d'afficher.
  await autoPullIfStale();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { y, m } = await searchParams;
  const { year, month } = resolveMonth(y, m, today);

  const [{ data: releases }, { data: contents }, { data: checks }] =
    await Promise.all([
      supabase.from("release").select("id, title, release_date"),
      supabase
        .from("content_item")
        .select("id, release_id, theme, brief, scheduled_date")
        .eq("is_published", false)
        .not("scheduled_date", "is", null),
      supabase
        .from("checklist_item")
        .select("id, release_id, label, due_date")
        .eq("is_done", false)
        .not("due_date", "is", null),
    ]);

  const events: CalendarEvent[] = [];
  for (const r of releases ?? []) {
    if (!r.release_date) continue;
    events.push({
      id: `r-${r.id}`,
      date: r.release_date,
      kind: "RELEASE",
      label: r.title,
      href: `/releases/${r.id}`,
    });
  }
  for (const c of contents ?? []) {
    if (!c.scheduled_date) continue;
    events.push({
      id: `c-${c.id}`,
      date: c.scheduled_date,
      kind: "CONTENT",
      label: cardTitle({ brief: c.brief, theme: c.theme }),
      href: `/releases/${c.release_id}/board`,
    });
  }
  for (const t of checks ?? []) {
    if (!t.due_date) continue;
    events.push({
      id: `t-${t.id}`,
      date: t.due_date,
      kind: "CHECKLIST",
      label: t.label,
      href: `/releases/${t.release_id}`,
    });
  }

  const model = buildMonthGrid(year, month, events, today);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendrier</h1>
        <p className="text-muted-foreground">
          Sorties, contenus planifiés et tâches de checklist, mois par mois.
        </p>
      </div>

      <ReleaseCalendar model={model} today={today} />
    </div>
  );
}
