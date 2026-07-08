"use client";

import { useActionState } from "react";
import {
  generateContentPlan,
  type ContentPlanState,
} from "@/app/(app)/releases/[id]/generate-actions";
import { Button } from "@/components/ui/button";

export function GeneratePlanButton({
  releaseId,
  size = "default",
}: {
  releaseId: string;
  size?: "default" | "sm" | "lg";
}) {
  const [state, formAction, pending] = useActionState<ContentPlanState, FormData>(
    generateContentPlan.bind(null, releaseId),
    {},
  );

  return (
    <div className="flex flex-col items-start gap-1.5">
      <form action={formAction}>
        <Button type="submit" size={size} disabled={pending}>
          {pending ? "Génération… (~30 s)" : "✨ Générer le plan"}
        </Button>
      </form>
      {state.ok && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          {state.count} contenus générés via {state.provider}.
        </p>
      )}
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
    </div>
  );
}
