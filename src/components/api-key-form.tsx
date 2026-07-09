"use client";

import { useActionState, useEffect, useState } from "react";
import { useActionToast } from "@/lib/use-action-toast";
import { saveApiKey, deleteApiKey, type KeyState } from "@/app/(app)/settings/actions";
import { AI_PROVIDERS, type AiProvider } from "@/lib/ai/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function ApiKeyForm({
  provider,
  configured,
  hint,
}: {
  provider: AiProvider;
  configured: boolean;
  hint: string | null;
}) {
  const meta = AI_PROVIDERS[provider];
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, pending] = useActionState<KeyState, FormData>(
    saveApiKey.bind(null, provider),
    {},
  );
  useActionToast(state, "Clé enregistrée (chiffrée).");

  // Réinitialise le champ après un enregistrement réussi.
  useEffect(() => {
    if (state.ok) setFormKey((k) => k + 1);
  }, [state]);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-medium">{meta.label}</span>
            {configured ? (
              <Badge variant="secondary">Configurée · ••••{hint}</Badge>
            ) : (
              <Badge variant="outline">Non configurée</Badge>
            )}
          </div>
          <a
            href={meta.consoleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Obtenir une clé ↗
          </a>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <form
            key={formKey}
            action={formAction}
            className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end"
          >
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor={`key-${provider}`} className="text-xs">
                {configured ? "Remplacer la clé" : "Clé API"}
              </Label>
              <Input
                id={`key-${provider}`}
                name="api_key"
                type="password"
                autoComplete="off"
                placeholder={meta.keyPrefix ? `${meta.keyPrefix}…` : "clé…"}
                required
              />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "…" : "Enregistrer"}
            </Button>
          </form>

          {configured && (
            <form action={deleteApiKey.bind(null, provider)}>
              <Button type="submit" variant="ghost">
                Supprimer
              </Button>
            </form>
          )}
        </div>

        {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      </CardContent>
    </Card>
  );
}
