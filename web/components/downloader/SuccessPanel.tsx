'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Check, Copy, Download, Home, Link2, RotateCcw, Timer } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { resolveDownloadUrl } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/lib/i18n';
import type { JobResult } from '@/lib/types';
import { formatBytes, minutesUntil } from '@/lib/utils';

export function SuccessPanel({
  result,
  title,
  thumbnail,
  onAnother,
}: {
  result: JobResult;
  title?: string;
  thumbnail?: string;
  onAnother: () => void;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState(() => minutesUntil(result.expiresAt) ?? 0);
  const downloadUrl = useMemo(() => resolveDownloadUrl(result.downloadUrl), [result.downloadUrl]);

  // Live countdown so an expiring link never looks usable when it isn't.
  useEffect(() => {
    const timer = setInterval(() => setRemaining(minutesUntil(result.expiresAt) ?? 0), 20_000);
    return () => clearInterval(timer);
  }, [result.expiresAt]);

  const expired = remaining <= 0;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(downloadUrl);
      setCopied(true);
      toast(t('common.copied'), { tone: 'success' });
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast(t('url.pasteFailed'), { tone: 'warning' });
    }
  };

  return (
    <motion.section
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      aria-live="polite"
      className="overflow-hidden rounded-xl border border-line bg-surface shadow-md"
    >
      <div className="flex flex-col items-center gap-3 border-b border-line bg-gradient-to-b from-success-soft to-transparent px-6 py-8 text-center">
        <motion.span
          initial={reduceMotion ? false : { scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.05 }}
          className="inline-flex size-12 items-center justify-center rounded-full bg-success text-white shadow-[0_8px_24px_-8px_var(--cf-success)]"
        >
          <Check aria-hidden className="size-6" strokeWidth={3} />
        </motion.span>
        <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">{t('success.title')}</h3>
        <Badge tone={expired ? 'danger' : remaining < 5 ? 'warning' : 'neutral'} icon={<Timer />}>
          {expired
            ? t('success.expired')
            : remaining < 1
              ? t('success.expiresSoon')
              : t('success.expiresIn', { minutes: remaining })}
        </Badge>
      </div>

      <div className="grid gap-6 p-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:p-8">
        {thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt=""
            referrerPolicy="no-referrer"
            className="h-24 w-40 shrink-0 rounded-md border border-line object-cover"
          />
        )}

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
          <div className="col-span-2 min-w-0 sm:col-span-3">
            <dt className="text-xs uppercase tracking-[0.1em] text-subtle">{t('success.fileName')}</dt>
            <dd className="mt-1 truncate font-medium" title={result.filename}>
              {result.filename}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.1em] text-subtle">{t('success.format')}</dt>
            <dd className="mt-1 font-medium uppercase">{result.container}</dd>
          </div>
          {result.quality && (
            <div>
              <dt className="text-xs uppercase tracking-[0.1em] text-subtle">{t('success.quality')}</dt>
              <dd className="mt-1 font-medium">{result.quality}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs uppercase tracking-[0.1em] text-subtle">{t('success.size')}</dt>
            <dd className="mt-1 font-medium tabular-nums">{formatBytes(result.filesize)}</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-col gap-3 border-t border-line bg-sunken/60 p-6 sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            size="lg"
            fullWidth
            disabled={expired}
            className="min-w-0 sm:flex-1"
            leadingIcon={<Download className="size-4.5" />}
            onClick={() => {
              window.location.href = downloadUrl;
            }}
          >
            {t('success.download')}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            disabled={expired}
            onClick={copyLink}
            leadingIcon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            className="shrink-0"
          >
            {copied ? t('common.copied') : t('success.copyLink')}
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            fullWidth
            onClick={onAnother}
            leadingIcon={<RotateCcw className="size-4" />}
            className="min-w-0 sm:flex-1"
          >
            {t('success.another')}
          </Button>
          <Link href="/" className="sm:flex-1">
            <Button variant="ghost" fullWidth leadingIcon={<Home className="size-4" />} tabIndex={-1}>
              {t('common.backHome')}
            </Button>
          </Link>
        </div>

        <p className="flex items-start gap-2 pt-1 text-xs leading-relaxed text-subtle">
          <Link2 aria-hidden className="mt-px size-3.5 shrink-0" />
          {t('success.expiryNote')}
        </p>
      </div>
    </motion.section>
  );
}
