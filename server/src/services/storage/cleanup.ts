import fs from 'node:fs/promises';
import { env } from '../../config/env.js';
import { logger } from '../../core/logger.js';
import { jobStore } from '../jobs/store.js';
import { ensureTmpDir, sweep } from './tempStore.js';

const SWEEP_INTERVAL_MS = 60_000;
let timer: NodeJS.Timeout | undefined;

/**
 * Temporary files are the only thing ClipFlow keeps on disk, and they are not
 * kept for long: a sweeper expires records past their TTL, marks the matching
 * jobs `expired`, and removes anything left behind by a crash.
 */
export async function startCleanup(): Promise<void> {
  await fs.rm(env.tmpDir, { recursive: true, force: true }).catch(() => undefined);
  await ensureTmpDir();
  logger.info(`temporary storage ready at ${env.tmpDir} (TTL ${Math.round(env.fileTtlMs / 60000)}m)`);

  timer = setInterval(() => {
    void (async () => {
      try {
        await sweep();
        jobStore.expireStale();
      } catch (error) {
        logger.warn('cleanup sweep failed', (error as Error).message);
      }
    })();
  }, SWEEP_INTERVAL_MS);
  timer.unref?.();
}

export async function stopCleanup(): Promise<void> {
  if (timer) clearInterval(timer);
  await fs.rm(env.tmpDir, { recursive: true, force: true }).catch(() => undefined);
}
