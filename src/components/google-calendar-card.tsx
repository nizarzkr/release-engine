"use client";

import { useActionState } from "react";
import { useActionToast } from "@/lib/use-action-toast";
import {
  syncGoogleNow,
  disconnectGoogle,
  type GoogleSyncState,
} from "@/app/(app)/settings/google-actions";
import type { GoogleConnectionStatus } from "@/lib/google/connection";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function GoogleCalendarCard({
  status,
  flash,
}: {
  status: GoogleConnectionStatus;
  flash?: { tone: "ok" | "error"; message: string };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Google Agenda</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {flash && (
          <p
            className={
              flash.tone === "ok" ? "text-emerald-600" : "text-destructive"
            }
          >
            {flash.message}
          </p>
        )}

        {!status.configured ? (
          <p className="text-muted-foreground">
            Synchro non configurée côté serveur. Ajoute{" "}
            <code className="rounded bg-muted px-1">GOOGLE_CLIENT_ID</code> et{" "}
            <code className="rounded bg-muted px-1">GOOGLE_CLIENT_SECRET</code>{" "}
            dans <code className="rounded bg-muted px-1">.env.local</code>, puis
            relance le serveur.
          </p>
        ) : status.connected ? (
          <>
            <p className="text-muted-foreground">
              Connecté{status.email ? ` · ${status.email}` : ""}. Tes sorties,
              jalons, contenus et tâches sont poussés vers un agenda dédié{" "}
              <strong>Release Engine</strong>.
            </p>
            <div className="flex items-center gap-2">
              <SyncButton />
              <form action={disconnectGoogle}>
                <Button type="submit" variant="ghost" size="sm">
                  Déconnecter
                </Button>
              </form>
            </div>
          </>
        ) : (
          <>
            <p className="text-muted-foreground">
              Connecte ton compte Google pour synchroniser automatiquement ton
              planning dans un agenda dédié (créé par l&apos;app).
            </p>
            <div>
              <a
                href="/auth/google/connect"
                className={buttonVariants({ size: "sm" })}
              >
                Connecter Google Agenda
              </a>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SyncButton() {
  const [state, formAction, pending] = useActionState<GoogleSyncState, FormData>(
    syncGoogleNow,
    {},
  );
  useActionToast(state, (s) => s.message ?? "Synchronisé.");
  return (
    <form action={formAction} className="flex items-center gap-2">
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Synchro…" : "Synchroniser maintenant"}
      </Button>
    </form>
  );
}
