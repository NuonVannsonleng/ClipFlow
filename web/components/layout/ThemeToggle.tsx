'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useSettings, type ThemePreference } from '@/lib/settings';
import { cn } from '@/lib/utils';

const ORDER: ThemePreference[] = ['light', 'dark', 'system'];

const ICONS: Record<ThemePreference, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

/** Cycles light -> dark -> system, matching the three options in Settings. */
export function ThemeToggle({ className }: { className?: string }) {
  const { settings, update, hydrated } = useSettings();
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();

  const current = settings.theme;
  const Icon = ICONS[current];
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length] as ThemePreference;

  return (
    <button
      type="button"
      onClick={() => update({ theme: next })}
      title={`${t('nav.toggleTheme')}: ${t(`settings.${current}`)}`}
      aria-label={`${t('nav.toggleTheme')} (${t(`settings.${current}`)})`}
      className={cn(
        'relative inline-flex size-10 items-center justify-center rounded-md border border-line',
        'bg-surface text-muted transition-colors duration-200 hover:border-line-strong hover:text-fg',
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={hydrated ? current : 'placeholder'}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, rotate: -35, scale: 0.7 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, rotate: 35, scale: 0.7 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Icon className="size-4.5" />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
