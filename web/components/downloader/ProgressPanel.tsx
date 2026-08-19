'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/primitives';
import { useI18n } from '@/lib/i18n';
import type { Job, JobStage } from '@/lib/types';
import { cn } from '@/lib/utils';

const STAGE_SEQUENCE: JobStage[] = ['fetching-media', 'processing', 'preparing-file', 'ready'];

const STAGE_LABELS: Record<string, string> = {
  'fetching-media': 'download.stageFetching',
  processing: 'download.stageProcessing',
  'preparing-file': 'download.stagePreparing',
  ready: 'download.stageReady',
};

/**
 * Shows the job's real state. When the backend cannot report a percentage —
 * during an FFmpeg merge, for instance — the bar goes indeterminate instead of
 * inventing a number.
 */
export function ProgressPanel({ job, onCancel }: { job: Job; onCancel?: () => void }) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();

  const queued = job.state === 'queued' || job.state === 'analyzing';
  const stageIndex = STAGE_SEQUENCE.indexOf(job.stage);
  const percent = job.state === 'completed' ? 100 : job.progress;

  return (
    <motion.section
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      aria-live="polite"
      className="rounded-xl border border-line bg-surface p-6 shadow-md sm:p-8"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold tracking-tight">{t('download.progressTitle')}</h3>
          {job.title && <p className="mt-1 truncate text-sm text-muted">{job.title}</p>}
        </div>
        {percent !== null && (
          <span className="shrink-0 text-2xl font-semibold tabular-nums text-primary">
            {Math.round(percent)}%
          </span>
        )}
      </div>

      <Progress
        value={percent}
        label={t(STAGE_LABELS[job.stage] ?? 'download.stageFetching')}
        className="mt-5 h-2.5"
      />

      <p className="mt-3 text-sm text-muted">
        {queued
          ? t('download.queued')
          : t(STAGE_LABELS[job.stage] ?? 'download.stageProcessing')}
        {percent === null && !queued && (
          <span className="ml-1 text-subtle">— {t('download.indeterminate')}</span>
        )}
      </p>

      <ol className="mt-6 grid gap-2 sm:grid-cols-4">
        {STAGE_SEQUENCE.map((stage, index) => {
          const done = stageIndex > index || job.state === 'completed';
          const active = stageIndex === index && job.state !== 'completed';
          return (
            <li
              key={stage}
              className={cn(
                'flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-colors duration-300',
                done && 'border-success/40 bg-success-soft text-success',
                active && 'border-primary/50 bg-primary-soft text-primary',
                !done && !active && 'border-line text-subtle',
              )}
            >
              <span className="shrink-0">
                {done ? (
                  <Check aria-hidden className="size-3.5" strokeWidth={3} />
                ) : active ? (
                  <Loader2 aria-hidden className="size-3.5 animate-spin" />
                ) : (
                  <span aria-hidden className="block size-1.5 rounded-full bg-current opacity-40" />
                )}
              </span>
              {t(STAGE_LABELS[stage] as string)}
            </li>
          );
        })}
      </ol>

      {onCancel && (
        <div className="mt-6 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel} leadingIcon={<X className="size-4" />}>
            {t('download.cancel')}
          </Button>
        </div>
      )}
    </motion.section>
  );
}
