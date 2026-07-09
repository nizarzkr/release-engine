"use client";

import { useActionState } from "react";
import { useActionToast } from "@/lib/use-action-toast";
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
  useActionToast(
    state,
    (s) => `${s.count} contenus générés via ${s.provider}.`,
  );

  return (
    <div className="flex flex-col items-start gap-1.5">
      <form action={formAction}>
        <Button type="submit" size={size} disabled={pending}>
          {pending ? "Génération… (~30 s)" : "✨ Générer le plan"}
        </Button>
      </form>
    </div>
  );
}
