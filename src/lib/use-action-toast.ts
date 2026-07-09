"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

type ActionState = { ok?: boolean; error?: string };

/**
 * Émet un toast quand l'état d'une action serveur (useActionState) change :
 * `error` → toast d'erreur, `ok` → toast de succès (message optionnel).
 * Ne se déclenche pas au montage (compare l'identité de l'état).
 */
export function useActionToast<S extends ActionState>(
  state: S,
  success?: string | ((state: S) => string),
) {
  const previous = useRef<S>(state);
  useEffect(() => {
    if (state === previous.current) return;
    previous.current = state;

    if (state.error) {
      toast.error(state.error);
    } else if (state.ok) {
      const message =
        typeof success === "function" ? success(state) : success;
      if (message) toast.success(message);
    }
  }, [state, success]);
}
