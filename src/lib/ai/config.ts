// Métadonnées providers — NON sensibles, utilisables côté client (UI Réglages).
// La création réelle des modèles (avec clé) est côté serveur : voir providers.ts.

export const AI_PROVIDERS = {
  ANTHROPIC: {
    label: "Claude (Anthropic)",
    defaultModel: "claude-opus-4-8",
    keyPrefix: "sk-ant-",
    consoleUrl: "https://console.anthropic.com/settings/keys",
  },
  OPENAI: {
    label: "GPT (OpenAI)",
    defaultModel: "gpt-4o",
    keyPrefix: "sk-",
    consoleUrl: "https://platform.openai.com/api-keys",
  },
  GOOGLE: {
    label: "Gemini (Google)",
    defaultModel: "gemini-2.0-flash",
    keyPrefix: "",
    consoleUrl: "https://aistudio.google.com/app/apikey",
  },
} as const;

export type AiProvider = keyof typeof AI_PROVIDERS;
export const AI_PROVIDER_ORDER: AiProvider[] = ["ANTHROPIC", "OPENAI", "GOOGLE"];

/** Validation de format légère (pas d'appel réseau). */
export function validateKeyFormat(
  provider: AiProvider,
  key: string,
): { ok: boolean; error?: string } {
  const k = key.trim();
  if (k.length < 16) {
    return { ok: false, error: "Clé trop courte / invalide." };
  }
  const prefix = AI_PROVIDERS[provider].keyPrefix;
  if (prefix && !k.startsWith(prefix)) {
    return {
      ok: false,
      error: `Clé ${AI_PROVIDERS[provider].label} attendue (préfixe « ${prefix} »).`,
    };
  }
  return { ok: true };
}

/** 4 derniers caractères — indice d'affichage non sensible. */
export function keyHint(key: string): string {
  const k = key.trim();
  return k.slice(-4);
}
