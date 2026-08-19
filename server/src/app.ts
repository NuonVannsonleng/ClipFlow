import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { AppError } from './core/errors.js';
import { errorHandler, notFound } from './http/middleware/errorHandler.js';
import { generalLimiter } from './http/middleware/rateLimit.js';
import { session } from './http/middleware/session.js';
import { analyzeRouter } from './http/routes/analyze.js';
import { downloadRouter } from './http/routes/download.js';
import { historyRouter } from './http/routes/history.js';
import { jobRouter } from './http/routes/job.js';
import { metaRouter } from './http/routes/meta.js';
import { processRouter } from './http/routes/process.js';

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
