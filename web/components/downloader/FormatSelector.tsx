'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { AudioLines, Film, Info } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Select } from '@/components/ui/Select';
import { Badge, Segmented } from '@/components/ui/primitives';
import { useI18n } from '@/lib/i18n';
import type { MediaFormat, MediaKind } from '@/lib/types';
import { cn, formatBytes } from '@/lib/utils';

interface FormatSelectorProps {
  formats: MediaFormat[];
  kind: MediaKind;
  onKindChange: (kind: MediaKind) => void;
  selectedId: string | undefined;
  onSelect: (formatId: string) => void;
}

/**
 * Renders only what the API returned. Containers and qualities that the source
 * does not provide simply never appear, so nothing here can promise a
 * download the backend cannot produce.
 */
export function FormatSelector({
  formats,
  kind,
  onKindChange,
  selectedId,
  onSelect,
}: FormatSelectorProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();

  const videoFormats = useMemo(() => formats.filter((format) => format.kind === 'video'), [formats]);
  const audioFormats = useMemo(() => formats.filter((format) => format.kind === 'audio'), [formats]);
  const pool = kind === 'video' ? videoFormats : audioFormats;

  const containers = useMemo(
    () => [...new Set(pool.map((format) => format.container))],
    [pool],
  );

  const selected = formats.find((format) => format.id === selectedId);
  const activeContainer = selected?.container ?? containers[0];

  const variants = useMemo(
    () => pool.filter((format) => format.container === activeContainer),
    [pool, activeContainer],
  );

  // Keep the selection valid whenever the pool changes (tab switch, new video).
  useEffect(() => {
    if (selected && pool.some((format) => format.id === selected.id)) return;
    const fallback = pool[0];
    if (fallback) onSelect(fallback.id);
  }, [pool, selected, onSelect]);

  const changeContainer = (container: string) => {
    const sameQuality = pool.find(
      (format) => format.container === container && format.quality === selected?.quality,
    );
    const next = sameQuality ?? pool.find((format) => format.container === container);
    if (next) onSelect(next.id);
  };

  const tabs = [
    ...(videoFormats.length > 0
      ? [{ value: 'video' as const, label: t('common.video'), icon: <Film /> }]
      : []),
    ...(audioFormats.length > 0
      ? [{ value: 'audio' as const, label: t('common.audio'), icon: <AudioLines /> }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-5">
      {tabs.length > 1 && (
        <Segmented
          options={tabs}
          value={kind}
          onChange={(next) => onKindChange(next)}
          ariaLabel={t('video.format')}
          className="max-w-xs"
        />
      )}

      {pool.length === 0 ? (
        <p className="rounded-md border border-line bg-sunken px-4 py-3 text-sm text-muted">
          {kind === 'video' ? t('video.noVideoFormats') : t('video.noAudioFormats')}
        </p>
      ) : (
        <>
          <fieldset className="flex flex-col gap-3">
            <legend className="text-[0.8125rem] font-semibold uppercase tracking-[0.1em] text-subtle">
              {kind === 'video' ? t('video.availableQuality') : t('video.audioQuality')}
            </legend>
            <div className="flex flex-wrap gap-2">
              {variants.map((format) => {
                const active = format.id === selectedId;
                return (
                  <button
                    key={format.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onSelect(format.id)}
                    className={cn(
                      'relative isolate rounded-md border px-4 py-2.5 text-left transition-colors duration-200',
                      active
                        ? 'border-primary/60 text-fg'
                        : 'border-line text-muted hover:border-line-strong hover:text-fg',
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="format-chip"
                        transition={
                          reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 34 }
                        }
                        className="absolute inset-0 -z-10 rounded-md bg-primary-soft"
                      />
                    )}
                    <span className="block text-sm font-semibold leading-tight">{format.label}</span>
                    <span className="mt-0.5 block text-xs text-subtle">
                      {format.kind === 'video'
                        ? [format.fps && format.fps >= 50 ? `${Math.round(format.fps)}fps` : null, formatBytes(format.filesize, format.filesizeIsApproximate)]
                            .filter(Boolean)
                            .join(' · ')
                        : [format.audioBitrate ? `${format.audioBitrate} kbps` : null, formatBytes(format.filesize, true)]
                            .filter(Boolean)
                            .join(' · ')}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {containers.length > 1 && (
            <div className="flex flex-col gap-2">
              <span className="text-[0.8125rem] font-semibold uppercase tracking-[0.1em] text-subtle">
                {t('video.format')}
              </span>
              <Select
                label={t('video.format')}
                className="max-w-[13rem]"
                value={activeContainer}
                onChange={changeContainer}
                options={containers.map((container) => ({
                  value: container,
                  label: container.toUpperCase(),
                }))}
              />
            </div>
          )}

          {selected && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={selected.requiresProcessing ? 'warning' : 'success'} icon={<Info />}>
                {selected.requiresProcessing ? t('video.needsProcessing') : t('video.readyImmediately')}
              </Badge>
              {selected.filesize !== undefined && selected.filesizeIsApproximate && (
                <span className="text-xs text-subtle">
                  {t('video.sizeApprox')}: {formatBytes(selected.filesize, true)}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
