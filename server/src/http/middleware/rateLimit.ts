import rateLimit, { type Options } from 'express-rate-limit';
import { env } from '../../config/env.js';
import { AppError } from '../../core/errors.js';

const shared: Partial<Options> = {
  windowMs: env.rateLimitWindowMs,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    const error = new AppError('RATE_LIMITED', 'Too many requests. Please wait a moment.');
    res.status(error.status).json(error.toJSON());
  },
};

/** Per-IP budgets. Analysis is cheap; processing spawns real work. */
export const analyzeLimiter = rateLimit({ ...shared, limit: env.rateLimitAnalyze });
export const processLimiter = rateLimit({ ...shared, limit: env.rateLimitProcess });
export const generalLimiter = rateLimit({ ...shared, limit: 240 });
