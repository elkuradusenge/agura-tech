/**
 * i18n.
 *
 * A tiny provider rather than a library: the app needs three languages, dot key
 * lookup, variable interpolation and a persisted choice, and nothing more.
 */

import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import en from "./en.json";
import fr from "./fr.json";
import rw from "./rw.json";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type Dictionary, type Language } from "./types";

const DICTIONARIES: Record<Language, Dictionary> = {
  rw: rw as Dictionary,
  en: en as Dictionary,
  fr: fr as Dictionary,
};

const STORAGE_KEY = "agura.language";

export type Translate = (key: string, params?: Record<string, string | number>) => string;

interface I18nValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translate;
}

const I18nContext = createContext<I18nValue | null>(null);

function isLanguage(value: string | null): value is Language {
  return value !== null && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  let output = template;
  for (const [key, value] of Object.entries(params)) {
    output = output.split(`{${key}}`).join(String(value));
  }
  return output;
}

/**
 * Look a key up in the chosen language, then English, then Kinyarwanda.
 * A missing key returns the key itself so it is obvious in review, never blank.
 */
export function translate(
  dictionaries: Record<Language, Dictionary>,
  language: Language,
  key: string,
  params?: Record<string, string | number>,
): string {
  const value = dictionaries[language][key] ?? dictionaries.en[key] ?? dictionaries.rw[key];
  if (value === undefined) return key;
  return interpolate(value, params);
}

function initialLanguage(): Language {
  const stored = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  return isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const setLanguage = useCallback((next: Language) => setLanguageState(next), []);

  const t = useCallback<Translate>(
    (key, params) => translate(DICTIONARIES, language, key, params),
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return createElement(I18nContext.Provider, { value }, children);
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (value === null) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}

export function useTranslate(): Translate {
  return useI18n().t;
}

export { DICTIONARIES, SUPPORTED_LANGUAGES };
export type { Language };
