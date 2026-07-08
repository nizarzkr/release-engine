import "server-only";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import { AI_PROVIDERS, type AiProvider } from "./config";

/**
 * Abstraction multi-provider : renvoie un LanguageModel du Vercel AI SDK
 * à partir du provider + de la clé (déchiffrée). Utilisé en J7 (generateObject).
 * La clé n'existe qu'en mémoire serveur le temps de l'appel.
 */
export function getModel(
  provider: AiProvider,
  apiKey: string,
  modelId?: string,
): LanguageModel {
  const model = modelId ?? AI_PROVIDERS[provider].defaultModel;

  switch (provider) {
    case "ANTHROPIC":
      return createAnthropic({ apiKey })(model);
    case "OPENAI":
      return createOpenAI({ apiKey })(model);
    case "GOOGLE":
      return createGoogleGenerativeAI({ apiKey })(model);
  }
}
