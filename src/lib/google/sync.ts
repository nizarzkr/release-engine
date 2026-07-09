import "server-only";
import { createClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/crypto";
import { addDays } from "@/lib/domain/timeline";
import { cardTitle } from "@/lib/domain/content";
import { coerceMilestones } from "@/lib/domain/release-template";
import { getConnectionRow } from "./connection";
import { getAccessToken } from "./oauth";
import {
  calendarExists,
  createDedicatedCalendar,
  deleteEvent,
  insertEvent,
  updateEvent,
  type AllDayEvent,
} from "./calendar";

const CALENDAR_SUMMARY = "Release Engine";

type SourceKind = "MILESTONE" | "CONTENT" | "CHECKLIST";

type Desired = {
  kind: SourceKind;
  sourceId: string;
  event: AllDayEvent;
  hash: string;
};

export type SyncResult =
  | { ok: true; inserted: number; updated: number; deleted: number }
  | { ok: false; reason: "not_connected" | "no_user"; error?: string }
  | { ok: false; reason: "error"; error: string };

const key = (kind: SourceKind, id: string) => `${kind}:${id}`;
const hashOf = (ev: AllDayEvent) => `${ev.date}|${ev.summary}`;

/**
 * Réconcilie l'agenda Google dédié avec l'état de la base (push idempotent).
 * Crée / met à jour / supprime les events pour que Google reflète l'app.
 */
export async function reconcileGoogleCalendar(): Promise<SyncResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "no_user" };

  const conn = await getConnectionRow(supabase);
  if (!conn) return { ok: false, reason: "not_connected" };

  try {
    const accessToken = await getAccessToken(
      decryptSecret(conn.refresh_token_enc),
    );

    // Agenda dédié : créer s'il manque ou a été supprimé côté Google.
    let calendarId = conn.google_calendar_id;
    const exists = calendarId
      ? await calendarExists(accessToken, calendarId)
      : false;
    if (!calendarId || !exists) {
      calendarId = await createDedicatedCalendar(accessToken, CALENDAR_SUMMARY);
      await supabase
        .from("google_calendar_connection")
        .update({ google_calendar_id: calendarId })
        .eq("user_id", user.id);
      // Agenda recréé → les anciens mappings pointent dans le vide.
      if (!exists && conn.google_calendar_id) {
        await supabase
          .from("google_calendar_event")
          .delete()
          .eq("user_id", user.id);
      }
    }

    const desired = await buildDesired(supabase);
    const { data: mappings } = await supabase
      .from("google_calendar_event")
      .select("*");

    const mapByKey = new Map(
      (mappings ?? []).map((m) => [key(m.source_kind as SourceKind, m.source_id), m]),
    );

    let inserted = 0;
    let updated = 0;
    let deleted = 0;

    // Inserts + updates.
    for (const d of desired.values()) {
      const existing = mapByKey.get(key(d.kind, d.sourceId));
      if (!existing) {
        const eventId = await insertEvent(accessToken, calendarId, d.event);
        await supabase.from("google_calendar_event").insert({
          user_id: user.id,
          source_kind: d.kind,
          source_id: d.sourceId,
          google_event_id: eventId,
          content_hash: d.hash,
        });
        inserted++;
      } else if (existing.content_hash !== d.hash) {
        await updateEvent(
          accessToken,
          calendarId,
          existing.google_event_id,
          d.event,
        );
        await supabase
          .from("google_calendar_event")
          .update({ content_hash: d.hash })
          .eq("id", existing.id);
        updated++;
      }
    }

    // Deletes : mappings sans desired correspondant.
    for (const [k, m] of mapByKey) {
      if (!desired.has(k)) {
        await deleteEvent(accessToken, calendarId, m.google_event_id);
        await supabase.from("google_calendar_event").delete().eq("id", m.id);
        deleted++;
      }
    }

    return { ok: true, inserted, updated, deleted };
  } catch (e) {
    return {
      ok: false,
      reason: "error",
      error: e instanceof Error ? e.message : "Erreur de synchro Google.",
    };
  }
}

/** Version « au fil de l'eau » : ne lève jamais, à appeler après une mutation. */
export async function syncGoogleBestEffort(): Promise<void> {
  try {
    await reconcileGoogleCalendar();
  } catch {
    // best-effort : la synchro ne doit jamais casser l'action principale.
  }
}

/** Construit l'ensemble des events attendus depuis la base. */
async function buildDesired(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Map<string, Desired>> {
  const [{ data: releases }, { data: contents }, { data: checks }] =
    await Promise.all([
      supabase.from("release").select("id, title, release_date, milestones"),
      supabase
        .from("content_item")
        .select("id, theme, brief, scheduled_date")
        .eq("is_published", false)
        .not("scheduled_date", "is", null),
      supabase
        .from("checklist_item")
        .select("id, label, due_date")
        .eq("is_done", false)
        .not("due_date", "is", null),
    ]);

  const desired = new Map<string, Desired>();
  const add = (d: Desired) => desired.set(key(d.kind, d.sourceId), d);

  for (const r of releases ?? []) {
    for (const m of coerceMilestones(r.milestones)) {
      const date = addDays(r.release_date, m.offset);
      const prefix = m.phase === "DAY" ? "🎵" : "📣";
      const event: AllDayEvent = {
        summary: `${prefix} ${m.label} · ${r.title}`,
        date,
      };
      add({
        kind: "MILESTONE",
        sourceId: `${r.id}:${m.key}`,
        event,
        hash: hashOf(event),
      });
    }
  }

  for (const c of contents ?? []) {
    if (!c.scheduled_date) continue;
    const event: AllDayEvent = {
      summary: `🎬 ${cardTitle({ brief: c.brief, theme: c.theme })}`,
      date: c.scheduled_date,
    };
    add({ kind: "CONTENT", sourceId: c.id, event, hash: hashOf(event) });
  }

  for (const t of checks ?? []) {
    if (!t.due_date) continue;
    const event: AllDayEvent = { summary: `✅ ${t.label}`, date: t.due_date };
    add({ kind: "CHECKLIST", sourceId: t.id, event, hash: hashOf(event) });
  }

  return desired;
}
