import "server-only";

// Appels REST Google Calendar v3 (avec un access token déjà obtenu).

const BASE = "https://www.googleapis.com/calendar/v3";

export type AllDayEvent = {
  summary: string;
  description?: string;
  date: string; // YYYY-MM-DD (événement d'une journée)
};

function eventBody(ev: AllDayEvent) {
  return {
    summary: ev.summary,
    description: ev.description,
    // Événement « journée entière » : end.date est exclusif → +1 jour.
    start: { date: ev.date },
    end: { date: addOneDay(ev.date) },
    transparency: "transparent", // n'occupe pas la dispo
  };
}

function addOneDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + 86_400_000)
    .toISOString()
    .slice(0, 10);
}

async function call(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

/** Crée l'agenda secondaire dédié et renvoie son id. */
export async function createDedicatedCalendar(
  accessToken: string,
  summary: string,
): Promise<string> {
  const res = await call(accessToken, "/calendars", {
    method: "POST",
    body: JSON.stringify({
      summary,
      description:
        "Agenda synchronisé depuis Release Engine — sorties, jalons, contenus, checklist.",
      timeZone: "UTC",
    }),
  });
  if (!res.ok) {
    throw new Error(`Création de l'agenda Google échouée (${res.status}).`);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

/** Vérifie qu'un agenda existe encore (renvoie false sur 404). */
export async function calendarExists(
  accessToken: string,
  calendarId: string,
): Promise<boolean> {
  const res = await call(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}`,
  );
  return res.ok;
}

export async function insertEvent(
  accessToken: string,
  calendarId: string,
  ev: AllDayEvent,
): Promise<string> {
  const res = await call(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    { method: "POST", body: JSON.stringify(eventBody(ev)) },
  );
  if (!res.ok) {
    throw new Error(`Création d'event Google échouée (${res.status}).`);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

export async function updateEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  ev: AllDayEvent,
): Promise<void> {
  const res = await call(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "PUT", body: JSON.stringify(eventBody(ev)) },
  );
  // 404 : l'event a été supprimé côté Google → l'appelant recréera.
  if (!res.ok && res.status !== 404) {
    throw new Error(`Mise à jour d'event Google échouée (${res.status}).`);
  }
}

/** Supprime un event ; 404/410 (déjà supprimé) sont tolérés. */
export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const res = await call(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE" },
  );
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Suppression d'event Google échouée (${res.status}).`);
  }
}

export type ChangedEvent = {
  id: string;
  cancelled: boolean;
  date: string | null; // start.date (événement journée), sinon null
};

export type ListChangesResult =
  | { expired: true }
  | { expired: false; changes: ChangedEvent[]; nextSyncToken: string | null };

/**
 * Liste les changements de l'agenda depuis `syncToken` (sync incrémental).
 * Sans token → liste complète pour établir un token de base. Pagine jusqu'au
 * `nextSyncToken`. Renvoie `expired` si le token n'est plus valide (410).
 */
export async function listChangedEvents(
  accessToken: string,
  calendarId: string,
  syncToken: string | null,
): Promise<ListChangesResult> {
  const changes: ChangedEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | null = null;

  do {
    const params = new URLSearchParams({
      showDeleted: "true",
      singleEvents: "true",
      maxResults: "250",
    });
    if (syncToken) params.set("syncToken", syncToken);
    if (pageToken) params.set("pageToken", pageToken);

    const res = await call(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
    );
    if (res.status === 410) return { expired: true }; // token périmé
    if (!res.ok) {
      throw new Error(`Liste des events Google échouée (${res.status}).`);
    }
    const data = (await res.json()) as {
      items?: {
        id: string;
        status?: string;
        start?: { date?: string; dateTime?: string };
      }[];
      nextPageToken?: string;
      nextSyncToken?: string;
    };

    for (const it of data.items ?? []) {
      changes.push({
        id: it.id,
        cancelled: it.status === "cancelled",
        date: it.start?.date ?? null,
      });
    }
    pageToken = data.nextPageToken;
    nextSyncToken = data.nextSyncToken ?? nextSyncToken;
  } while (pageToken);

  return { expired: false, changes, nextSyncToken };
}

/** Supprime l'agenda dédié (au moment de la déconnexion). */
export async function deleteCalendar(
  accessToken: string,
  calendarId: string,
): Promise<void> {
  const res = await call(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}`,
    { method: "DELETE" },
  );
  if (!res.ok && res.status !== 404) {
    throw new Error(`Suppression de l'agenda Google échouée (${res.status}).`);
  }
}
