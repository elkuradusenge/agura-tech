/**
 * Translation resources.
 *
 * Kinyarwanda is the default. English and French are first drafts: every string a
 * human should confirm is listed in the TODO block at the end of each file so a
 * reviewer has one place to work from.
 */

export type TranslationKey = string;

export type Dictionary = Record<string, string>;

export const SUPPORTED_LANGUAGES = ["rw", "en", "fr"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, string> = {
  rw: "Kinyarwanda",
  en: "English",
  fr: "Francais",
};

export const DEFAULT_LANGUAGE: Language = "rw";
