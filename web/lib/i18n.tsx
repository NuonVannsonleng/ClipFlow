'use client';

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import en from '@/translations/en.json';
import km from '@/translations/km.json';
import { useSettings, type Language } from './settings';

type Dictionary = typeof en;

const DICTIONARIES: Record<Language, Dictionary> = {
  en,
  km: km as Dictionary,
};

export const LANGUAGES: { id: Language; label: string; native: string }[] = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'km', label: 'Khmer', native: 'ខ្មែរ' },
];

type Vars = Record<string, string | number>;

function lookup(dictionary: unknown, path: string): string | undefined {
  const value = path.split('.').reduce<unknown>((node, key) => {
    if (node && typeof node === 'object' && key in (node as Record<string, unknown>)) {
      return (node as Record<string, unknown>)[key];
    }
    return undefined;
  }, dictionary);
  return typeof value === 'string' ? value : undefined;
}

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  /** Translate a dot path, e.g. t('hero.title'). Falls back to English. */
  t: (path: string, vars?: Vars) => string;
  locale: string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { settings, update } = useSettings();
  const language = settings.language;

  const t = useCallback(
    (path: string, vars?: Vars) => {
      const template = lookup(DICTIONARIES[language], path) ?? lookup(DICTIONARIES.en, path) ?? path;
      if (!vars) return template;
      return Object.entries(vars).reduce(
        (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
        template,
      );
    },
    [language],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage: (next: Language) => update({ language: next }),
      t,
      locale: language === 'km' ? 'km-KH' : 'en-US',
    }),
    [language, t, update],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside <I18nProvider>');
  return context;
}

/** Shorthand for components that only need the translate function. */
export const useT = () => useI18n().t;
