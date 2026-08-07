import english from "@/locales/player/en.json";
import french from "@/locales/player/fr.json";

export type PlayerLocale = "en" | "fr";
export type PlayerMessages = typeof english;

const messages: Record<PlayerLocale, PlayerMessages> = { en: english, fr: french };

export function getPlayerMessages(locale: PlayerLocale): PlayerMessages {
  return messages[locale] ?? messages.en;
}

export function translate(message: string, values: Record<string, string | number> = {}) {
  return message.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(values[key] ?? ""));
}
