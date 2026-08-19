import { env } from '../../config/env.js';
import { AppError, isAppError } from '../../core/errors.js';
import { logger } from '../../core/logger.js';
import type { JobResult } from '../../core/types.js';
import { analysisCache } from '../media/cache.js';
import { mediaProvider } from '../media/provider.js';
import { registerFile, safeFilename, workDirFor } from '../storage/tempStore.js';
import { validateUrl } from '../url/validator.js';
import { jobStore } from '../jobs/store.js';

/** Throttles progress writes so an SSE stream is not flooded. */
function throttle<T extends unknown[]>(fn: (...args: T) => void, ms: number) {
  let last = 0;
  let pending: T | undefined;
  let timer: NodeJS.Timeout | undefined;
  return (...args: T) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
      return;
    }
    pending = args;
    timer ??= setTimeout(
      () => {
        timer = undefined;
        last = Date.now();
        if (pending) fn(...pending);
        pending = undefined;
      },
      ms - (now - last),
    );
  };
}

/**
 * Runs one download job end to end. Every failure is converted into an
 * AppError code before it is stored on the job, so the client only ever sees
 * a code it can translate.
 */
export async function runJob(jobId: string, signal: AbortSignal): Promise<void> {
  const job = jobStore.get(jobId);
  if (!job) return;
  if (job.state !== 'queued') return;

  try {
    jobStore.update(jobId, { state: 'analyzing', stage: 'retrieving-info', progress: null });

    // Re-validate: the URL was checked at /api/process time, but DNS can move.
    const validated = await validateUrl(job.sourceUrl);

    let info = analysisCache.get(validated.sourceId);
    if (!info) {
      info = await mediaProvider.analyze(validated.url, validated.platform);
      analysisCache.set(info);
    }

    const format = info.formats.find((candidate) => candidate.id === job.formatId);
    if (!format) {
      throw new AppError('BAD_REQUEST', 'That format is no longer available for this video.');
    }

    jobStore.update(jobId, {
      state: 'processing',
      stage: 'fetching-media',
      progress: null,
      title: info.title,
      thumbnail: info.thumbnail,
    });

    const emit = throttle((percent: number | null, stage: 'fetching-media' | 'processing') => {
      jobStore.update(jobId, { stage, progress: percent });
    }, 400);

    const { filePath, filesize } = await mediaProvider.download({
      url: validated.url,
      formatId: job.formatId,
      workDir: workDirFor(jobId),
      signal,
      onProgress: ({ percent, stage }) => emit(percent, stage),
    });

    jobStore.update(jobId, { stage: 'preparing-file', progress: null });

    const filename = safeFilename(info.title, format.container);
    const stored = await registerFile({
      jobId,
      sessionId: job.sessionId,
      filePath,
      filename,
      container: format.container,
      filesize,
    });

    const result: JobResult = {
      fileId: stored.fileId,
      filename: stored.filename,
      container: format.container,
      quality: format.quality,
      kind: format.kind,
      filesize,
      downloadUrl: `${env.publicApiUrl.replace(/\/$/, '')}/api/download/${stored.fileId}`,
      expiresAt: new Date(stored.expiresAt).toISOString(),
    };

    jobStore.update(jobId, { state: 'completed', stage: 'ready', progress: 100, result });
    logger.info(`job ${jobId} completed (${format.id}, ${filesize} bytes)`);
  } catch (error) {
    const appError = isAppError(error)
      ? error
      : signal.aborted
        ? new AppError('PROCESSING_FAILED', 'The job was cancelled.')
        : new AppError('PROCESSING_FAILED');

    logger.warn(`job ${jobId} failed: ${appError.code}`);
    jobStore.update(jobId, {
      state: 'failed',
      progress: null,
      error: { code: appError.code, message: appError.message },
    });
  }
}
