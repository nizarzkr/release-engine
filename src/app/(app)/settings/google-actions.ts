"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserOrRedirect } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { getConnectionRow } from "@/lib/google/connection";
import { getAccessToken } from "@/lib/google/oauth";
import { deleteCalendar } from "@/lib/google/calendar";
import { twoWaySync } from "@/lib/google/sync";

export type GoogleSyncState = { ok?: boolean; message?: string; error?: string };

/** Synchro manuelle (« Synchroniser maintenant »). */
export async function syncGoogleNow(
  _prev: GoogleSyncState,
  _formData: FormData,
): Promise<GoogleSyncState> {
  await getUserOrRedirect();
  const result = await twoWaySync();

  if (result.ok) {
    revalidatePath("/settings");
    revalidatePath("/calendar");
    revalidatePath("/dashboard");
    const pulled = result.pulled ?? 0;
    return {
      ok: true,
      message: `Synchronisé : ${pulled} depuis Google, ${result.inserted} ajout(s), ${result.updated} màj, ${result.deleted} suppression(s).`,
    };
  }
  if (result.reason === "not_connected") {
    return { error: "Connecte d'abord ton compte Google." };
  }
  return { error: result.error ?? "Synchro impossible." };
}

/** Déconnecte Google : supprime l'agenda dédié + le mapping + la connexion. */
export async function disconnectGoogle() {
  const user = await getUserOrRedirect();
  const supabase = await createClient();
  const conn = await getConnectionRow(supabase);

  if (conn?.google_calendar_id) {
    try {
      const accessToken = await getAccessToken(
        decryptSecret(conn.refresh_token_enc),
      );
      await deleteCalendar(accessToken, conn.google_calendar_id);
    } catch {
      // best-effort : on déconnecte même si l'API Google échoue.
    }
  }

  await supabase.from("google_calendar_event").delete().eq("user_id", user.id);
  await supabase
    .from("google_calendar_connection")
    .delete()
    .eq("user_id", user.id);

  revalidatePath("/settings");
}
