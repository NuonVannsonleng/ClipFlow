'use client';

import { AlertTriangle, FlaskConical, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { Capabilities } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * Surfaces what this deployment can actually do. It is better for the user to
 * read "the media service is unavailable" up front than to hit a failure after
 * pasting a link.
 */
export function CapabilityNotice({ className }: { className?: string }) {
  const { t } = useI18n();
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api
      .capabilities()
      .then(({ capabilities: value }) => {
        if (!cancelled) setCapabilities(value);
      })
      .catch(() => {
        /* the downloader surfaces connection problems on its own */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!capabilities) return null;

  const notice =
    capabilities.provider === 'unavailable'
      ? { tone: 'danger' as const, icon: <AlertTriangle />, title: t('status.toolsTitle'), body: t('status.toolsBody') }
      : capabilities.provider === 'mock'
        ? { tone: 'warning' as const, icon: <FlaskConical />, title: t('status.mockTitle'), body: t('status.mockBody') }
        : !capabilities.ffmpeg
          ? { tone: 'warning' as const, icon: <Wrench />, title: t('status.ffmpegTitle'), body: t('status.ffmpegBody') }
          : null;

  if (!notice) return null;

  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3.5 text-sm',
        notice.tone === 'danger'
          ? 'border-danger/35 bg-danger-soft/60 text-danger'
          : 'border-warning/35 bg-warning-soft/60 text-warning',
        className,
      )}
    >
      <span aria-hidden className="mt-0.5 shrink-0 [&>svg]:size-4.5">
        {notice.icon}
      </span>
      <div className="min-w-0">
        <p className="font-semibold leading-snug">{notice.title}</p>
        <p className="mt-0.5 leading-relaxed text-muted">{notice.body}</p>
      </div>
    </div>
  );
}
