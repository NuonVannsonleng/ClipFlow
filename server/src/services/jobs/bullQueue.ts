import { env } from '../../config/env.js';
import { logger } from '../../core/logger.js';
import type { JobHandler, JobQueue } from './queue.js';

/**
 * BullMQ driver, used when REDIS_URL is set. The worker runs in this process,
 * so job *state* still lives in the in-memory store; running several API
 * instances additionally needs a shared job store (see README).
 */
export class BullQueue implements JobQueue {
  readonly kind = 'redis' as const;

  private constructor(
    // Typed loosely so bullmq stays an optional dependency.
    private readonly queue: {
      add: (name: string, data: never, opts?: never) => Promise<unknown>;
      close: () => Promise<void>;
    },
    private readonly worker: { close: () => Promise<void> },
    private readonly controllers: Map<string, AbortController>,
  ) {}

  static async create(handler: JobHandler): Promise<JobQueue> {
    const { Queue, Worker } = (await import('bullmq')) as typeof import('bullmq');
    const connection = { url: env.redisUrl };
    const controllers = new Map<string, AbortController>();

    const queue = new Queue('clipflow-jobs', {
      connection,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: { age: 3600, count: 200 },
        removeOnFail: { age: 3600, count: 200 },
      },
    });

    const worker = new Worker(
      'clipflow-jobs',
      async (bullJob) => {
        const jobId = (bullJob.data as { jobId: string }).jobId;
        const controller = new AbortController();
        controllers.set(jobId, controller);
        try {
          await handler(jobId, controller.signal);
        } finally {
          controllers.delete(jobId);
        }
      },
      { connection, concurrency: env.maxConcurrentJobs },
    );

    worker.on('failed', (_job, error) => logger.warn('bullmq job failed', error?.message));
    await queue.waitUntilReady();

    return new BullQueue(queue, worker, controllers);
  }

  async add(jobId: string): Promise<void> {
    await this.queue.add('process', { jobId } as never, { jobId } as never);
  }

  async cancel(jobId: string): Promise<void> {
    this.controllers.get(jobId)?.abort();
  }

  async close(): Promise<void> {
    for (const controller of this.controllers.values()) controller.abort();
    await this.worker.close();
    await this.queue.close();
  }
}
