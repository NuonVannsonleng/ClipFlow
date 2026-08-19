import { logger } from '../../core/logger.js';
import type { JobHandler, JobQueue } from './queue.js';

/**
 * A small FIFO with a concurrency cap. Enough for a single instance; set
 * REDIS_URL to get BullMQ instead.
 */
export class MemoryQueue implements JobQueue {
  readonly kind = 'memory' as const;

  private readonly pending: string[] = [];
  private readonly running = new Map<string, AbortController>();
  private closed = false;

  constructor(
    private readonly handler: JobHandler,
    private readonly concurrency: number,
  ) {}

  async add(jobId: string): Promise<void> {
    if (this.closed) return;
    this.pending.push(jobId);
    this.drain();
  }

  async cancel(jobId: string): Promise<void> {
    const index = this.pending.indexOf(jobId);
    if (index >= 0) this.pending.splice(index, 1);
    this.running.get(jobId)?.abort();
  }

  async close(): Promise<void> {
    this.closed = true;
    this.pending.length = 0;
    for (const controller of this.running.values()) controller.abort();
  }

  private drain(): void {
    while (!this.closed && this.running.size < this.concurrency && this.pending.length > 0) {
      const jobId = this.pending.shift();
      if (!jobId) break;
      const controller = new AbortController();
      this.running.set(jobId, controller);

      void this.handler(jobId, controller.signal)
        .catch((error: unknown) => {
          logger.error(`job ${jobId} handler threw`, (error as Error).message);
        })
        .finally(() => {
          this.running.delete(jobId);
          this.drain();
        });
    }
  }
}
