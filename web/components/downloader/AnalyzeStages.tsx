'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { Dots } from '@/components/ui/primitives';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export type AnalyzeStage = 'checking-url' | 'detecting-platform' | 'retrieving-info' | 'preparing-options';

export const ANALYZE_STAGES: AnalyzeStage[] = [
  'checking-url',
  'detecting-platform',
  'retrieving-info',
  'preparing-options',
];

const LABEL_KEYS: Record<AnalyzeStage, string> = {
  'checking-url': 'analyze.checkingUrl',
  'detecting-platform': 'analyze.detectingPlatform',
  'retrieving-info': 'analyze.retrievingInfo',
  'preparing-options': 'analyze.preparingOptions',
};

/**
 * Each row corresponds to a step that actually happened: the first two run in
 * the browser before the request goes out, the third covers the request
 * itself, and the fourth the response being turned into format options. No
 * invented percentages, and nothing ticks over on a timer.
 */
export function AnalyzeStages({ current }: { current: AnalyzeStage }) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const currentIndex = ANALYZE_STAGES.indexOf(current);

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-6 rounded-xl border border-line bg-surface px-6 py-10 shadow-sm sm:px-10"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <h3 className="text-lg font-semibold tracking-tight">{t('analyze.title')}</h3>
        <Dots />
        <p className="text-sm text-muted">{t('analyze.subtitle')}</p>
      </div>

      <ol className="flex w-full max-w-sm flex-col gap-1">
        {ANALYZE_STAGES.map((stage, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <li
              key={stage}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-300',
                active && 'bg-sunken',
              )}
            >
              <span
                className={cn(
                  'inline-flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-300',
                  done && 'border-transparent bg-success text-white',
                  active && 'border-primary text-primary',
                  !done && !active && 'border-line text-transparent',
                )}
              >
                {done ? (
                  <Check aria-hidden className="size-3" strokeWidth={3} />
                ) : active ? (
                  <Loader2 aria-hidden className="size-3 animate-spin" />
                ) : null}
              </span>
              <span className={cn('font-medium', done ? 'text-muted' : active ? 'text-fg' : 'text-subtle')}>
                {t(LABEL_KEYS[stage])}
              </span>
            </li>
          );
        })}
      </ol>
    </motion.div>
  );
}
