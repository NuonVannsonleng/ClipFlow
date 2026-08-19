'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Download, ListChecks, Loader2, Play, Plus, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PlatformIcon } from '@/components/PlatformIcon';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge, Progress } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { ApiError, api, resolveDownloadUrl, subscribeToJob } from '@/lib/api';
import { historyStore } from '@/lib/history';
import { useI18n } from '@/lib/i18n';
import { checkUrl } from '@/lib/platforms';
import type { ApiErrorCode, Job, MediaInfo, PlatformId } from '@/lib/types';
import { cn, truncate } from '@/lib/utils';
import { UrlInput } from './UrlInput';

type ItemState = 'pending' | 'checking' | 'ready' | 'queued' | 'processing' | 'done' | 'failed';

interface BatchItem {
  id: string;
  url: string;
  platform: PlatformId;
  state: ItemState;
  info?: MediaInfo;
  job?: Job;
  errorCode?: ApiErrorCode;
}

type Output = 'mp4' | 'webm' | 'mp3' | 'm4a';

const MAX_URLS = 10;

/** Maps the single output choice onto the best format each source offers. */
function resolveFormatId(info: MediaInfo, output: Output): string | undefined {
  if (output === 'mp4' || output === 'webm') {
    const match = info.formats.find(
      (format) => format.kind === 'video' && format.container === output,
    );
    return (match ?? info.formats.find((format) => format.kind === 'video'))?.id;
  }
  const match = info.formats.find((format) => format.kind === 'audio' && format.container === output);
  return (match ?? info.formats.find((format) => format.kind === 'audio'))?.id;
}

export function BatchPanel() {
  const { t } = useI18n();
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();

  const [draft, setDraft] = useState('');
  const [items, setItems] = useState<BatchItem[]>([]);
  const [output, setOutput] = useState<Output>('mp4');
  const [busy, setBusy] = useState(false);
  const unsubscribers = useRef<(() => void)[]>([]);

  useEffect(
    () => () => {
      unsubscribers.current.forEach((stop) => stop());
    },
    [],
  );

  const patch = useCallback((id: string, changes: Partial<BatchItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  }, []);

  const addUrl = () => {
    const check = checkUrl(draft);
    if (check.status !== 'detected') return;
    if (items.length >= MAX_URLS) {
      toast(t('batch.limit', { max: MAX_URLS }), { tone: 'warning' });
      return;
    }
    const normalized = draft.trim();
    if (items.some((item) => item.url === normalized)) {
      toast(t('batch.duplicate'), { tone: 'warning' });
      return;
    }
    setItems((current) => [
      ...current,
      {
        id: `${Date.now()}-${current.length}`,
        url: normalized,
        platform: check.platform,
        state: 'pending',
      },
    ]);
    setDraft('');
  };

  const checkAll = async () => {
    const pending = items.filter((item) => item.state === 'pending');
    if (pending.length === 0) return;
    setBusy(true);
    pending.forEach((item) => patch(item.id, { state: 'checking' }));

    try {
      const { results } = await api.analyzeBatch(pending.map((item) => item.url));
      for (const result of results) {
        const target = pending.find((item) => item.url === result.url);
        if (!target) continue;
        if (result.ok) patch(target.id, { state: 'ready', info: result.info });
        else patch(target.id, { state: 'failed', errorCode: result.error.code });
      }
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError('INTERNAL', '');
      pending.forEach((item) => patch(item.id, { state: 'failed', errorCode: apiError.code }));
    } finally {
      setBusy(false);
    }
  };

  const processAll = async () => {
    const ready = items.filter((item) => item.state === 'ready' && item.info);
    if (ready.length === 0) return;
    setBusy(true);

    const payload = ready
      .map((item) => ({ item, formatId: resolveFormatId(item.info as MediaInfo, output) }))
      .filter((entry): entry is { item: BatchItem; formatId: string } => Boolean(entry.formatId));

    payload.forEach((entry) => patch(entry.item.id, { state: 'queued' }));

    try {
      const { results } = await api.processBatch(
        payload.map((entry) => ({ url: entry.item.url, formatId: entry.formatId })),
      );

      for (const result of results) {
        const entry = payload.find((candidate) => candidate.item.url === result.url);
        if (!entry) continue;
        if (!result.ok) {
          patch(entry.item.id, { state: 'failed', errorCode: result.error.code });
          continue;
        }

        patch(entry.item.id, { state: 'processing', job: result.job });
        const stop = subscribeToJob(
          result.job.id,
          (job) => {
            patch(entry.item.id, {
              job,
              state: job.state === 'completed' ? 'done' : job.state === 'failed' ? 'failed' : 'processing',
              errorCode: job.error?.code as ApiErrorCode | undefined,
            });
            if (job.state === 'completed' && job.result && entry.item.info) {
              historyStore.add({
                id: job.id,
                jobId: job.id,
                fileId: job.result.fileId,
                title: entry.item.info.title,
                platform: entry.item.platform,
                thumbnail: entry.item.info.thumbnail,
                sourceUrl: entry.item.url,
                container: job.result.container,
                quality: job.result.quality,
                kind: job.result.kind,
                filesize: job.result.filesize,
                downloadUrl: job.result.downloadUrl,
                expiresAt: job.result.expiresAt,
                createdAt: new Date().toISOString(),
              });
            }
          },
          (error) => patch(entry.item.id, { state: 'failed', errorCode: error.code }),
        );
        unsubscribers.current.push(stop);
      }
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError('INTERNAL', '');
      payload.forEach((entry) => patch(entry.item.id, { state: 'failed', errorCode: apiError.code }));
    } finally {
      setBusy(false);
    }
  };

  const readyCount = items.filter((item) => item.state === 'ready').length;
  const pendingCount = items.filter((item) => item.state === 'pending').length;
  const doneItems = items.filter((item) => item.state === 'done' && item.job?.result);

  const stateLabel: Record<ItemState, string> = {
    pending: t('batch.stateWaiting'),
    checking: t('batch.stateChecking'),
    ready: t('batch.stateReady'),
    queued: t('batch.stateWaiting'),
    processing: t('batch.stateProcessing'),
    done: t('batch.stateDone'),
    failed: t('batch.stateFailed'),
  };

  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-7">
      <header className="flex flex-col gap-1.5">
        <h2 className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight">
          <ListChecks aria-hidden className="size-5 text-primary" />
          {t('batch.title')}
        </h2>
        <p className="text-sm leading-relaxed text-muted">{t('batch.subtitle')}</p>
      </header>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start">
        <UrlInput
          value={draft}
          onChange={setDraft}
          onSubmit={addUrl}
          size="md"
          placeholder={t('batch.placeholder')}
          className="flex-1"
        />
        <Button
          variant="secondary"
          size="md"
          onClick={addUrl}
          disabled={checkUrl(draft).status !== 'detected'}
          leadingIcon={<Plus className="size-4" />}
          className="sm:mt-0"
        >
          {t('batch.add')}
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-line px-4 py-8 text-center text-sm text-subtle">
          {t('batch.empty')}
        </p>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-muted">
              {items.length === 1 ? t('batch.addedOne') : t('batch.added', { count: items.length })}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                unsubscribers.current.forEach((stop) => stop());
                unsubscribers.current = [];
                setItems([]);
              }}
              leadingIcon={<Trash2 className="size-4" />}
            >
              {t('batch.clearAll')}
            </Button>
          </div>

          <ul className="mt-2 flex flex-col divide-y divide-[var(--cf-border)] rounded-lg border border-line">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.li
                  key={item.id}
                  layout={!reduceMotion}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 px-3.5 py-3"
                >
                  <PlatformIcon platform={item.platform} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.info?.title ?? truncate(item.url, 60)}
                    </p>
                    {item.state === 'processing' && item.job ? (
                      <Progress
                        value={item.job.progress}
                        label={stateLabel[item.state]}
                        className="mt-2 h-1.5"
                      />
                    ) : (
                      <p className="mt-0.5 truncate text-xs text-subtle">
                        {item.state === 'failed' && item.errorCode
                          ? t(`errors.${item.errorCode}`)
                          : truncate(item.url, 70)}
                      </p>
                    )}
                  </div>

                  <Badge
                    tone={
                      item.state === 'done'
                        ? 'success'
                        : item.state === 'failed'
                          ? 'danger'
                          : item.state === 'ready'
                            ? 'primary'
                            : 'neutral'
                    }
                    icon={
                      item.state === 'done' ? (
                        <Check />
                      ) : item.state === 'checking' || item.state === 'processing' ? (
                        <Loader2 className="animate-spin" />
                      ) : undefined
                    }
                  >
                    {stateLabel[item.state]}
                  </Badge>

                  {item.state === 'done' && item.job?.result ? (
                    <a
                      href={resolveDownloadUrl(item.job.result.downloadUrl)}
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-line text-muted transition-colors hover:border-line-strong hover:text-fg"
                      aria-label={`${t('success.download')}: ${item.info?.title ?? item.url}`}
                    >
                      <Download className="size-4" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}
                      aria-label={`${t('batch.remove')}: ${item.url}`}
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-subtle transition-colors hover:bg-sunken hover:text-fg"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-1.5">
              <span className="text-[0.8125rem] font-semibold uppercase tracking-[0.1em] text-subtle">
                {t('batch.output')}
              </span>
              <Select<Output>
                label={t('batch.output')}
                className="w-40"
                value={output}
                onChange={setOutput}
                options={[
                  { value: 'mp4', label: 'MP4', hint: t('common.video') },
                  { value: 'webm', label: 'WEBM', hint: t('common.video') },
                  { value: 'mp3', label: 'MP3', hint: t('common.audio') },
                  { value: 'm4a', label: 'M4A', hint: t('common.audio') },
                ]}
              />
            </div>

            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => void checkAll()}
                disabled={pendingCount === 0 || busy}
                loading={busy && pendingCount > 0}
                leadingIcon={<ListChecks className="size-4" />}
              >
                {t('batch.analyzeAll')}
              </Button>
              <Button
                size="lg"
                onClick={() => void processAll()}
                disabled={readyCount === 0 || busy}
                leadingIcon={<Play className="size-4" />}
              >
                {t('batch.processAll')}
              </Button>
            </div>
          </div>

          {doneItems.length > 0 && (
            <p className={cn('mt-4 text-sm text-muted')}>
              {t('batch.downloadAll')}: {doneItems.length}
            </p>
          )}
        </>
      )}
    </section>
  );
}
