import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { AppError, isAppError } from '../../core/errors.js';
import type { Job } from '../../core/types.js';
import { analysisCache } from '../../services/media/cache.js';
import { parseFormatId } from '../../services/media/formats.js';
import { getQueue } from '../../services/jobs/queue.js';
import { jobStore, toPublicJob } from '../../services/jobs/store.js';
import { validateUrl } from '../../services/url/validator.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { processLimiter } from '../middleware/rateLimit.js';

export const processRouter = Router();

const itemSchema = z.object({
  url: z.string().min(1).max(2048),
  formatId: z.string().min(1).max(64),
});
const batchSchema = z.object({ items: z.array(itemSchema).min(1) });

const MAX_ACTIVE_PER_SESSION = 5;

async function queueJob(sessionId: string, rawUrl: string, formatId: string): Promise<Job> {
  // Reject an unknown format shape before anything is spawned.
  parseFormatId(formatId);

  const validated = await validateUrl(rawUrl);
  const cached = analysisCache.get(validated.sourceId);

  if (cached && !cached.formats.some((format) => format.id === formatId)) {
    throw new AppError('BAD_REQUEST', 'That format is not available for this video.');
  }

  if (jobStore.countActiveForSession(sessionId) >= MAX_ACTIVE_PER_SESSION) {
    throw new AppError('RATE_LIMITED', 'You already have several downloads in progress.');
  }

  const job = jobStore.create({
    sessionId,
    sourceUrl: validated.url,
    platform: validated.platform.id,
    formatId,
    title: cached?.title,
    thumbnail: cached?.thumbnail,
  });

  await getQueue().add(job.id);
  return job;
}

processRouter.post(
  '/process',
  processLimiter,
  asyncHandler(async (req, res) => {
    const { url, formatId } = itemSchema.parse(req.body);
    const job = await queueJob(req.sessionId, url, formatId);
    res.status(202).json({ job: toPublicJob(job) });
  }),
);

processRouter.post(
  '/process/batch',
  processLimiter,
  asyncHandler(async (req, res) => {
    const { items } = batchSchema.parse(req.body);
    if (items.length > env.maxBatchUrls) {
      throw new AppError('BAD_REQUEST', `Up to ${env.maxBatchUrls} URLs can be processed at once.`);
    }

    const results = [];
    for (const item of items) {
      try {
        const job = await queueJob(req.sessionId, item.url, item.formatId);
        results.push({ url: item.url, ok: true as const, job: toPublicJob(job) });
      } catch (error) {
        const appError = isAppError(error) ? error : new AppError('PROCESSING_FAILED');
        results.push({
          url: item.url,
          ok: false as const,
          error: { code: appError.code, message: appError.message },
        });
      }
    }

    res.status(202).json({ results });
  }),
);
