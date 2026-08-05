import { generateText, Output } from "ai";
import { z } from "zod";

const translationSchema = z.object({
  meaning: z.string().describe("Natural English equivalent of the Icelandic expression"),
  literal: z.string().describe("Close literal English rendering"),
  why: z.string().describe("Concise usage, imagery, etymology, or cultural context; clearly state uncertainty"),
});

export type TranslationProvider = "openai" | "gemini";

const models: Record<TranslationProvider, string> = {
  openai: "openai/gpt-5.6-terra",
  gemini: "google/gemini-3.6-flash",
};

export async function generateTranslationDraft(expression: string, provider: TranslationProvider) {
  const model = models[provider];
  const { output } = await generateText({
    model,
    output: Output.object({ schema: translationSchema }),
    system: "You are a careful Icelandic lexicographer. Produce accurate, compact editorial copy for a language-learning flash card. Preserve ambiguity when needed. Never invent a historical origin; if etymology is uncertain, say so and explain current usage or imagery instead.",
    prompt: `Translate and explain this Icelandic expression: ${JSON.stringify(expression)}`,
  });
  return { ...output, model };
}
