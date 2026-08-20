import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express, type RequestHandler } from 'express';
import helmetImport from 'helmet';
import { env } from './config/env.js';
import { AppError } from './core/errors.js';
import { logger } from './core/logger.js';
import { errorHandler, notFound } from './http/middleware/errorHandler.js';
import { generalLimiter } from './http/middleware/rateLimit.js';
import { session } from './http/middleware/session.js';
import { analyzeRouter } from './http/routes/analyze.js';
import { downloadRouter } from './http/routes/download.js';
import { historyRouter } from './http/routes/history.js';
import { jobRouter } from './http/routes/job.js';
import { metaRouter } from './http/routes/meta.js';
import { processRouter } from './http/routes/process.js';

/**
 * helmet publishes separate CJS and ESM type shapes. Which one a build host
 * resolves depends on its install layout, and when it picks the CJS one the
 * callable sits on `.default` instead of on the import itself — enough to fail
 * the build on a clean install even though it compiles locally. Normalising
 * both shapes here keeps `tsc` independent of the host.
 */
type HelmetFactory = (options?: Record<string, unknown>) => RequestHandler;

const helmet: HelmetFactory =
  typeof helmetImport === 'function'
    ? (helmetImport as unknown as HelmetFactory)
    : ((helmetImport as { default: unknown }).default as HelmetFactory);

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      // The API only ever returns JSON or an attachment; a strict CSP here
      // costs nothing and blocks any accidental HTML rendering.
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: 'same-site' },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        // A misconfigured CORS_ORIGINS rejects every request from the real
        // frontend, and the browser only sees a generic 400. Naming the
        // rejected origin and the current allow-list makes that a one-look
        // diagnosis in the server logs instead of a guessing game.
        logger.warn(
          `CORS rejected origin ${origin}. CORS_ORIGINS currently allows: ` +
            `${env.corsOrigins.join(', ') || '(nothing)'}`,
        );
        callback(new AppError('BAD_REQUEST', 'Origin not allowed.'));
      },
      credentials: true,
      exposedHeaders: ['X-Expires-At', 'Content-Disposition'],
    }),
  );

  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());
  app.use(session);
  app.use(generalLimiter);

  app.use('/api', analyzeRouter);
  app.use('/api', processRouter);
  app.use('/api', jobRouter);
  app.use('/api', downloadRouter);
  app.use('/api', historyRouter);
  app.use('/api', metaRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
