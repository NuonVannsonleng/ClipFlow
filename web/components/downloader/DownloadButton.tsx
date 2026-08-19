'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, Check, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/lib/i18n';
import type { Job } from '@/lib/types';

export type DownloadButtonState = 'default' | 'preparing' | 'processing' | 'ready' | 'error';

/** Maps a live job onto the button's five states. */
export function stateForJob(job: Job | null | undefined): DownloadButtonState {
  if (!job) return 'default';
  switch (job.state) {
    case 'queued':
    case 'analyzing':
      return 'preparing';
    case 'processing':
      return job.stage === 'fetching-media' ? 'preparing' : 'processing';
    case 'completed':
      return 'ready';
    case 'failed':
    case 'expired':
      return 'error';
    default:
      return 'default';
  }
}

/**
 * The page's strongest call to action. The label and icon follow the job
 * rather than a timer, so what it says is always what is happening.
 */
export function DownloadButton({
  state,
  format,
  onClick,
  disabled = false,
  className,
}: {
  state: DownloadButtonState;
  /** Container shown in the default and ready labels, e.g. "MP4". */
  format?: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();

  const config = {
    default: {
      label: format ? t('video.downloadWith', { format }) : t('download.default'),
      icon: <Download className="size-4.5" />,
      variant: 'primary' as const,
    },
    preparing: {
      label: t('download.preparing'),
      icon: <Loader2 className="size-4.5 animate-spin" />,
      variant: 'primary' as const,
    },
    processing: {
      label: t('download.processing'),
      icon: <Loader2 className="size-4.5 animate-spin" />,
      variant: 'primary' as const,
    },
    ready: {
      label: t('download.ready', { format: format ?? '' }).trim(),
      icon: <Check className="size-4.5" strokeWidth={3} />,
      variant: 'success' as const,
    },
    error: {
      label: t('download.error'),
      icon: <AlertCircle className="size-4.5" />,
      variant: 'danger' as const,
    },
  }[state];

  const inFlight = state === 'preparing' || state === 'processing';

  return (
    <Button
      size="lg"
      fullWidth
      variant={config.variant}
      disabled={disabled || inFlight}
      onClick={onClick}
      aria-live="polite"
      className={className}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={state}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2"
        >
          <span aria-hidden>{config.icon}</span>
          {config.label}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}
