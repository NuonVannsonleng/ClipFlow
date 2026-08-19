'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Clock, ImageOff, RotateCcw, User } from 'lucide-react';
import { useState } from 'react';
import { PlatformIcon } from '@/components/PlatformIcon';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/lib/i18n';
import type { MediaInfo, MediaKind } from '@/lib/types';
import { formatDuration } from '@/lib/utils';
import { DownloadButton, type DownloadButtonState } from './DownloadButton';
import { FormatSelector } from './FormatSelector';
import { LegalNotice } from './LegalNotice';

export function VideoCard({
  info,
  kind,
  onKindChange,
  selectedId,
  onSelect,
  onDownload,
  onReset,
  downloadState = 'default',
}: {
  info: MediaInfo;
  kind: MediaKind;
  onKindChange: (kind: MediaKind) => void;
  selectedId: string | undefined;
  onSelect: (formatId: string) => void;
  onDownload: () => void;
  onReset: () => void;
  /** Drives the download button's five states (see DownloadButton). */
  downloadState?: DownloadButtonState;
}) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const [thumbFailed, setThumbFailed] = useState(false);

  const selected = info.formats.find((format) => format.id === selectedId);
  const showThumb = Boolean(info.thumbnail) && !thumbFailed;

  return (
    <motion.article
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-xl border border-line bg-surface shadow-md"
    >
      <div className="grid gap-0 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="relative aspect-video w-full overflow-hidden bg-sunken md:aspect-auto md:min-h-full">
          {showThumb ? (
            // Thumbnails are served straight from the source CDN; no referrer is sent.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={info.thumbnail}
              alt={t('video.thumbnailAlt', { title: info.title })}
              referrerPolicy="no-referrer"
              loading="lazy"
              onError={() => setThumbFailed(true)}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full min-h-40 flex-col items-center justify-center gap-2 text-subtle">
              <ImageOff aria-hidden className="size-7" />
              <span className="text-xs">{t('video.noThumbnail')}</span>
            </div>
          )}

          {info.durationSeconds !== undefined && (
            <span className="absolute bottom-3 right-3 rounded-md bg-[hsl(240_30%_6%/0.78)] px-2 py-1 text-xs font-medium tabular-nums text-white backdrop-blur-sm">
              {formatDuration(info.durationSeconds)}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-5 p-5 sm:p-6">
          <header className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <PlatformIcon platform={info.platform} size="md" />
              <div className="min-w-0">
                <h3 className="text-pretty text-lg font-semibold leading-snug tracking-tight">
                  {info.title}
                </h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-muted">
                  <span className="font-medium">{info.platformName}</span>
                  {info.uploader && (
                    <span className="inline-flex items-center gap-1">
                      <User aria-hidden className="size-3.5" />
                      {info.uploader}
                    </span>
                  )}
                  {info.durationSeconds !== undefined && (
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Clock aria-hidden className="size-3.5" />
                      {formatDuration(info.durationSeconds)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </header>

          <FormatSelector
            formats={info.formats}
            kind={kind}
            onKindChange={onKindChange}
            selectedId={selectedId}
            onSelect={onSelect}
          />

          <div className="mt-auto flex flex-col gap-3 pt-1">
            <div className="flex flex-col gap-2 sm:flex-row">
              <DownloadButton
                state={downloadState}
                format={selected?.container.toUpperCase()}
                disabled={!selected}
                onClick={onDownload}
                className="min-w-0 sm:flex-1"
              />
              {/* shrink-0 keeps this at its natural width; the primary button
                  absorbs the leftover space instead of squeezing this one. */}
              <Button
                size="lg"
                variant="secondary"
                onClick={onReset}
                leadingIcon={<RotateCcw className="size-4" />}
                className="shrink-0"
              >
                {t('video.analyzeAnother')}
              </Button>
            </div>
            <LegalNotice />
          </div>
        </div>
      </div>
    </motion.article>
  );
}
