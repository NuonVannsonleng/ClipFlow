'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/lib/i18n';
import type { ApiErrorCode } from '@/lib/types';

/**
 * Errors arrive as codes, never as raw server text, so each one gets a
 * translated explanation and an action the user can actually take.
 */
export function ErrorPanel({
  code,
  onRetry,
  onBack,
  detail,
}: {
  code: ApiErrorCode;
  onRetry?: () => void;
  onBack?: () => void;
  detail?: string;
}) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      role="alert"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl border border-danger/35 bg-danger-soft/50 p-6 sm:p-8"
    >
      <div className="flex flex-col items-start gap-4 sm:flex-row">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-danger/12 text-danger">
          <AlertTriangle aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold tracking-tight">{t('errors.title')}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{t(`errors.${code}`)}</p>
          {detail && <p className="mt-1 text-xs text-subtle">{detail}</p>}

          <div className="mt-5 flex flex-wrap gap-2">
            {onRetry && (
              <Button size="sm" onClick={onRetry} leadingIcon={<RotateCcw className="size-4" />}>
                {t('common.tryAgain')}
              </Button>
            )}
            {onBack && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onBack}
                leadingIcon={<ArrowLeft className="size-4" />}
              >
                {t('common.goBack')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
