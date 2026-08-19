import { Router } from 'express';
import { env } from '../../config/env.js';
import { getCapabilities } from '../../services/media/capabilities.js';
import { PLATFORMS } from '../../services/url/platforms.js';
import { stats } from '../../services/storage/tempStore.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const metaRouter = Router();

/**
 * The platform list the UI renders. Capabilities come from the same registry
 * the backend uses, so the site can never advertise support it does not have.
 */
metaRouter.get(
  '/platforms',
  asyncHandler(async (_req, res) => {
    const capabilities = await getCapabilities();
    res.json({
      platforms: PLATFORMS.map((platform) => ({
        id: platform.id,
        name: platform.name,
        capabilities: platform.capabilities,
        status: capabilities.provider === 'unavailable' ? 'limited' : platform.status,
        note: platform.note,
        color: platform.color,
        hosts: platform.hosts,
      })),
      capabilities,
    });
  }),
);

metaRouter.get(
  '/capabilities',
  asyncHandler(async (_req, res) => {
    res.json({
      capabilities: await getCapabilities(),
      limits: {
        maxFilesizeMb: env.maxFilesizeMb,
        maxBatchUrls: env.maxBatchUrls,
        fileTtlMs: env.fileTtlMs,
      },
    });
  }),
);

metaRouter.get(
  '/health',
  asyncHandler(async (_req, res) => {
    const capabilities = await getCapabilities();
    res.json({
      status: capabilities.provider === 'unavailable' ? 'degraded' : 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      storage: stats(),
      capabilities,
    });
  }),
);
