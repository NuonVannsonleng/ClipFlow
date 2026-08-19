'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ApiError, api, subscribeToJob } from '@/lib/api';
import { historyStore } from '@/lib/history';
import { useI18n } from '@/lib/i18n';
import { checkUrl } from '@/lib/platforms';
import { useSettings } from '@/lib/settings';
import type { ApiErrorCode, Job, MediaFormat, MediaInfo, MediaKind } from '@/lib/types';
import { cn } from '@/lib/utils';
import { AnalyzeStages, type AnalyzeStage } from './AnalyzeStages';
import { stateForJob } from './DownloadButton';
import { ErrorPanel } from './ErrorPanel';
import { ProgressPanel } from './ProgressPanel';
import { SuccessPanel } from './SuccessPanel';
import { UrlInput } from './UrlInput';
import { VideoCard } from './VideoCard';

type Phase = 'idle' | 'analyzing' | 'ready' | 'working' | 'done' | 'error';

/**
 * Chooses the initial format from the user's preferences, falling back to the
 * best thing the source actually offers.
 */
function pickDefaultFormat(
  formats: MediaFormat[],
  preference: { container: string; quality: string; lastId?: string },
): MediaFormat | undefined {
  if (preference.lastId) {
    const remembered = formats.find((format) => format.id === preference.lastId);
    if (remembered) return remembered;
  }

  const videos = formats.filter((format) => format.kind === 'video');
  const pool = videos.length > 0 ? videos : formats;
  const preferredContainer = pool.filter((format) => format.container === preference.container);
  const candidates = preferredContainer.length > 0 ? preferredContainer : pool;

  if (preference.quality !== 'highest') {
    const exact = candidates.find((format) => format.quality === `${preference.quality}p`);
    if (exact) return exact;
  }
  return candidates[0];
}

export function DownloaderPanel({
  initialUrl = '',
  autoFocus = false,
  compact = false,
  className,
}: {
  initialUrl?: string;
  autoFocus?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const { settings, update } = useSettings();
  const reduceMotion = useReducedMotion();

  const [url, setUrl] = useState(initialUrl);
  const [phase, setPhase] = useState<Phase>('idle');
  const [stage, setStage] = useState<AnalyzeStage>('retrieving-info');
  const [info, setInfo] = useState<MediaInfo | null>(null);
  const [kind, setKind] = useState<MediaKind>('video');
  const [selectedId, setSelectedId] = useState<string>();
  const [job, setJob] = useState<Job | null>(null);
  const [errorCode, setErrorCode] = useState<ApiErrorCode>('PROCESSING_FAILED');
  const [errorDetail, setErrorDetail] = useState<string>();

  const abortRef = useRef<AbortController | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      unsubscribeRef.current?.();
    },
    [],
  );

  const fail = useCallback((code: ApiErrorCode, detail?: string) => {
    setErrorCode(code);
    setErrorDetail(detail);
    setPhase('error');
  }, []);

  const analyze = useCallback(async () => {
    const check = checkUrl(url);
    if (check.status === 'empty' || check.status === 'invalid') {
      fail('INVALID_URL');
      return;
    }
    if (check.status === 'unsupported') {
      fail('UNSUPPORTED_PLATFORM', check.hostname);
      return;
    }

    // Steps 1 and 2 of the stage list just completed locally: the URL parsed
    // and the platform was recognised. The request covers step 3.
    setStage('retrieving-info');
    setPhase('analyzing');
    setInfo(null);
    setJob(null);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await api.analyze(url, controller.signal);
      setStage('preparing-options');

      const hasVideo = response.formats.some((format) => format.kind === 'video');
      const nextKind: MediaKind = hasVideo ? 'video' : 'audio';
      const initial = pickDefaultFormat(
        response.formats.filter((format) => format.kind === nextKind),
        {
          container: settings.defaultFormat,
          quality: settings.defaultQuality,
          lastId: settings.rememberLast ? settings.lastFormatId : undefined,
        },
      );

      setInfo(response);
      setKind(nextKind);
      setSelectedId(initial?.id);
      setPhase('ready');
    } catch (error) {
      if (controller.signal.aborted) return;
      const apiError = error instanceof ApiError ? error : new ApiError('INTERNAL', '');
      fail(apiError.code, apiError.hostname);
    }
  }, [url, fail, settings.defaultFormat, settings.defaultQuality, settings.rememberLast, settings.lastFormatId]);

  const startDownload = useCallback(async () => {
    if (!info || !selectedId) return;
    const format = info.formats.find((item) => item.id === selectedId);
    if (!format) return;

    if (settings.rememberLast) update({ lastFormatId: selectedId });
    setPhase('working');

    try {
      const { job: created } = await api.process(info.sourceUrl, selectedId);
      setJob(created);

      unsubscribeRef.current?.();
      unsubscribeRef.current = subscribeToJob(
        created.id,
        (updated) => {
          setJob(updated);
          if (updated.state === 'completed' && updated.result) {
            setPhase('done');
            historyStore.add({
              id: `${updated.id}`,
              jobId: updated.id,
              fileId: updated.result.fileId,
              title: updated.title ?? info.title,
              platform: info.platform,
              thumbnail: info.thumbnail,
              sourceUrl: info.sourceUrl,
              container: updated.result.container,
              quality: updated.result.quality,
              kind: updated.result.kind,
              filesize: updated.result.filesize,
              downloadUrl: updated.result.downloadUrl,
              expiresAt: updated.result.expiresAt,
              createdAt: new Date().toISOString(),
            });
          }
          if (updated.state === 'failed') {
            fail((updated.error?.code as ApiErrorCode) ?? 'PROCESSING_FAILED');
          }
          if (updated.state === 'expired') fail('EXPIRED');
        },
        (error) => fail(error.code),
      );
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError('INTERNAL', '');
      fail(apiError.code);
    }
  }, [info, selectedId, settings.rememberLast, update, fail]);

  const cancelJob = useCallback(async () => {
    if (!job) return;
    unsubscribeRef.current?.();
    try {
      await api.cancelJob(job.id);
    } catch {
      /* the job may already have finished; nothing to report */
    }
    setJob(null);
    setPhase(info ? 'ready' : 'idle');
  }, [job, info]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    unsubscribeRef.current?.();
    setUrl('');
    setInfo(null);
    setJob(null);
    setSelectedId(undefined);
    setPhase('idle');
  }, []);

  const retry = useCallback(() => {
    if (info && selectedId) {
      void startDownload();
      return;
    }
    void analyze();
  }, [info, selectedId, analyze, startDownload]);

  const showInput = phase === 'idle' || phase === 'error' || (phase === 'ready' && !compact);
  const canAnalyze = checkUrl(url).status === 'detected';

  return (
    <div className={cn('flex w-full flex-col gap-6', className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        {showInput && (
          <motion.div
            key="input"
            layout={!reduceMotion}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-4"
          >
            <UrlInput
              value={url}
              onChange={(next) => {
                setUrl(next);
                if (phase === 'error') setPhase('idle');
              }}
              onSubmit={() => void analyze()}
              autoFocus={autoFocus}
              size={compact ? 'md' : 'lg'}
            />
            <div className="flex flex-col items-center gap-3">
              <Button
                size={compact ? 'lg' : 'xl'}
                onClick={() => void analyze()}
                disabled={!canAnalyze}
                leadingIcon={<Search className="size-4.5" />}
                className="w-full sm:w-auto sm:min-w-56"
              >
                {t('hero.analyze')}
              </Button>
              {!compact && <p className="text-center text-xs text-subtle">{t('hero.hint')}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        {phase === 'analyzing' && <AnalyzeStages key="stages" current={stage} />}

        {(phase === 'ready' || phase === 'working') && info && (
          // The card stays put while the job runs, so the download button can
          // walk through Preparing -> Processing beside the live progress.
          <motion.div key="card" layout={!reduceMotion} className="flex flex-col gap-6">
            <VideoCard
              info={info}
              kind={kind}
              onKindChange={setKind}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onDownload={() => void startDownload()}
              onReset={reset}
              downloadState={stateForJob(job)}
            />
            {phase === 'working' && job && (
              <ProgressPanel job={job} onCancel={() => void cancelJob()} />
            )}
          </motion.div>
        )}

        {phase === 'done' && job?.result && (
          <SuccessPanel
            key="success"
            result={job.result}
            title={job.title ?? info?.title}
            thumbnail={info?.thumbnail}
            onAnother={reset}
          />
        )}

        {phase === 'error' && (
          <ErrorPanel
            key="error"
            code={errorCode}
            detail={errorDetail}
            onRetry={retry}
            onBack={() => setPhase(info ? 'ready' : 'idle')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
