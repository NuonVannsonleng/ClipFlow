import { env } from '../../config/env.js';
import { logger } from '../../core/logger.js';
import { MemoryQueue } from './memoryQueue.js';

export type JobHandler = (jobId: string, signal: AbortSignal) => Promise<void>;

export interface JobQueue {
  readonly kind: 'memory' | 'redis';
  add(jobId: string): Promise<void>;
  cancel(jobId: string): Promise<void>;
  close(): Promise<void>;
}

let queue: JobQueue | undefined;

/**
 * In-memory by default. Setting REDIS_URL swaps in BullMQ, which survives a
 * restart and spreads work across workers.
 */
export async function createQueue(handler: JobHandler): Promise<JobQueue> {
  if (queue) return queue;

  if (env.redisUrl) {
    try {
      const { BullQueue } = await import('./bullQueue.js');
      queue = await BullQueue.create(handler);
      logger.info('job queue: BullMQ (redis)');
      return queue;
    } catch (error) {
      logger.warn(
        'BullMQ is unavailable, falling back to the in-memory queue',
        (error as Error).message,
      );
    }
  }

  queue = new MemoryQueue(handler, env.maxConcurrentJobs);
  logger.info(`job queue: in-memory (concurrency ${env.maxConcurrentJobs})`);
  return queue;
}

export function getQueue(): JobQueue {
  if (!queue) throw new Error('Job queue has not been created yet.');
  return queue;
}
