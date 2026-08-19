import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { AppError, isAppError } from '../../core/errors.js';
import type { MediaInfo } from '../../core/types.js';
import { analysisCache } from '../../services/media/cache.js';
import { getCapabilities } from '../../services/media/capabilities.js';
import { mediaProvider } from '../../services/media/provider.js';
import { validateUrl } from '../../services/url/validator.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { analyzeLimiter } from '../middleware/rateLimit.js';

export const analyzeRouter = Router();

const analyzeSchema = z.object({ url: z.string().min(1).max(2048) });
const batchSchema = z.object({ urls: z.array(z.string().min(1).max(2048)).min(1) });

async function analyzeOne(rawUrl: string): Promise<MediaInfo> {
  const validated = await validateUrl(rawUrl);

  const cached = analysisCache.get(validated.sourceId);
  if (cached) return cached;

  const info = await mediaProvider.analyze(validated.url, validated.platform);
  analysisCache.set(info);
  return info;
}

analyzeRouter.post(
  '/analyze',
  analyzeLimiter,
  asyncHandler(async (req, res) => {
    const { url } = analyzeSchema.parse(req.body);
    const info = await analyzeOne(url);
    res.json({ ...info, capabilities: await getCapabilities() });
  }),
);

/** Batch analysis for the multi-URL screen: one bad URL must not sink the rest. */
analyzeRouter.post(
  '/analyze/batch',
  analyzeLimiter,
  asyncHandler(async (req, res) => {
    const { urls } = batchSchema.parse(req.body);
    if (urls.length > env.maxBatchUrls) {
      throw new AppError('BAD_REQUEST', `Up to ${env.maxBatchUrls} URLs can be processed at once.`);
    }

    const results = await Promise.all(
      urls.map(async (url) => {
        try {
          return { url, ok: true as const, info: await analyzeOne(url) };
        } catch (error) {
          const appError = isAppError(error) ? error : new AppError('PROCESSING_FAILED');
          return {
            url,
            ok: false as const,
            error: { code: appError.code, message: appError.message },
          };
        }
      }),
    );

    res.json({ results, capabilities: await getCapabilities() });
  }),
);
