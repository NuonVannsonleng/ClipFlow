import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './core/logger.js';
import { logCapabilities } from './services/media/capabilities.js';
import { createQueue } from './services/jobs/queue.js';
import { runJob } from './services/processing/processor.js';
import { startCleanup, stopCleanup } from './services/storage/cleanup.js';

async function main(): Promise<void> {
  await startCleanup();
  await logCapabilities();
  await createQueue(runJob);

  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info(`ClipFlow API listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    server.close(() => {
      void stopCleanup().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => logger.error('unhandled rejection', reason));
}

void main().catch((error: unknown) => {
  logger.error('failed to start', error instanceof Error ? error.stack : error);
  process.exit(1);
});
