'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type Language = 'en' | 'km';
export type VideoContainer = 'mp4' | 'webm';
export type QualityPreference = 'highest' | '1080' | '720' | '480' | '360';

export interface Settings {
  theme: ThemePreference;
  language: Language;
  defaultFormat: VideoContainer;
  defaultQuality: QualityPreference;
  rememberLast: boolean;
  lastFormatId?: string;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  language: 'en',
  defaultFormat: 'mp4',
  defaultQuality: 'highest',
  rememberLast: true,
};

export const STORAGE_KEY = 'clipflow.settings.v1';

interface SettingsContextValue {
  settings: Settings;
  /** True once localStorage has been read, so the UI can avoid a flash. */
  hydrated: boolean;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
  /** The theme actually rendered right now (`system` resolved). */
  resolvedTheme: 'light' | 'dark';
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function readStored(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function applyTheme(preference: ThemePreference): 'light' | 'dark' {
  const prefersDark =
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved = preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference;
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
  return resolved;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = readStored();
    setSettings(stored);
    setResolvedTheme(applyTheme(stored.theme));
    setHydrated(true);
  }, []);

  // Follow the OS while the preference is "system".
  useEffect(() => {
    if (!hydrated) return;
    setResolvedTheme(applyTheme(settings.theme));
    if (settings.theme !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolvedTheme(applyTheme('system'));
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [settings.theme, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.lang = settings.language;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* storage can be unavailable in private mode; preferences just won't persist */
    }
  }, [settings, hydrated]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const value = useMemo(
    () => ({ settings, hydrated, update, reset, resolvedTheme }),
    [settings, hydrated, update, reset, resolvedTheme],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used inside <SettingsProvider>');
  return context;
}

/**
 * Runs before React hydrates so the first paint already has the right theme.
 * Kept in sync with `applyTheme` above.
 */
export const themeBootstrapScript = `
(function(){
  try {
    var raw = localStorage.getItem('${STORAGE_KEY}');
    var pref = raw ? (JSON.parse(raw).theme || 'system') : 'system';
    var lang = raw ? (JSON.parse(raw).language || 'en') : 'en';
    var dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    document.documentElement.lang = lang;
  } catch (e) {}
})();
`;
