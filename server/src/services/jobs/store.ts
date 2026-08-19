import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import { env } from '../../config/env.js';
import { AppError } from '../../core/errors.js';
import type { Job, JobStage, JobState, PlatformId } from '../../core/types.js';

export interface CreateJobInput {
  sessionId: string;
  sourceUrl: string;
  platform: PlatformId;
  formatId: string;
  title?: string;
  thumbnail?: string;
}

export type JobPatch = Partial<Pick<Job, 'state' | 'stage' | 'progress' | 'result' | 'error' | 'title' | 'thumbnail'>>;

const MAX_JOBS = 500;
const JOB_RETENTION_MS = 6 * 60 * 60 * 1000;

class JobStore extends EventEmitter {
  private readonly jobs = new Map<string, Job>();

  create(input: CreateJobInput): Job {
    const now = new Date().toISOString();
    const job: Job = {
      id: crypto.randomUUID(),
      sessionId: input.sessionId,
      state: 'queued',
      stage: 'queued',
      progress: null,
      sourceUrl: input.sourceUrl,
      platform: input.platform,
      title: input.title,
      thumbnail: input.thumbnail,
      formatId: input.formatId,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(job.id, job);
    this.trim();
    this.emit('job', job);
    return job;
  }

  get(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  require(id: string, sessionId?: string): Job {
    const job = this.jobs.get(id);
    if (!job) throw new AppError('NOT_FOUND', 'That job could not be found.');
    if (sessionId && job.sessionId !== sessionId) {
      // Do not reveal that the job exists for somebody else.
      throw new AppError('NOT_FOUND', 'That job could not be found.');
    }
    return job;
  }

  update(id: string, patch: JobPatch): Job | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;

    // A finished job is immutable, apart from completed -> expired. Progress
    // events are throttled, so a trailing one can arrive after completion and
    // would otherwise rewrite `ready` back to `processing`.
    if (['completed', 'failed', 'expired'].includes(job.state)) {
      const isExpiry = job.state === 'completed' && patch.state === 'expired';
      if (!isExpiry) return job;
    }
    Object.assign(job, patch, { updatedAt: new Date().toISOString() });
    this.emit('job', job);
    return job;
  }

  setStage(id: string, stage: JobStage, state?: JobState, progress?: number | null): Job | undefined {
    return this.update(id, { stage, ...(state ? { state } : {}), progress: progress ?? null });
  }

  listForSession(sessionId: string): Job[] {
    return [...this.jobs.values()]
      .filter((job) => job.sessionId === sessionId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  remove(id: string, sessionId?: string): Job {
    const job = this.require(id, sessionId);
    this.jobs.delete(id);
    this.emit('job', { ...job, state: 'expired' as JobState });
    return job;
  }

  removeSession(sessionId: string): string[] {
    const ids: string[] = [];
    for (const [id, job] of this.jobs) {
      if (job.sessionId === sessionId) {
        this.jobs.delete(id);
        ids.push(id);
      }
    }
    return ids;
  }

  /** Marks completed jobs whose file TTL has passed as `expired`. */
  expireStale(): void {
    const now = Date.now();
    for (const job of this.jobs.values()) {
      if (job.state === 'completed' && job.result) {
        if (new Date(job.result.expiresAt).getTime() <= now) {
          this.update(job.id, { state: 'expired', stage: 'ready', progress: null });
        }
      }
      if (now - new Date(job.createdAt).getTime() > JOB_RETENTION_MS) {
        this.jobs.delete(job.id);
      }
    }
  }

  countActiveForSession(sessionId: string): number {
    return [...this.jobs.values()].filter(
      (job) => job.sessionId === sessionId && ['queued', 'analyzing', 'processing'].includes(job.state),
    ).length;
  }

  private trim(): void {
    if (this.jobs.size <= MAX_JOBS) return;
    const ordered = [...this.jobs.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const job of ordered) {
      if (this.jobs.size <= MAX_JOBS) break;
      if (['completed', 'failed', 'expired'].includes(job.state)) this.jobs.delete(job.id);
    }
  }
}

export const jobStore = new JobStore();

/** Strips server-internal fields before a job crosses the API boundary. */
export function toPublicJob(job: Job): Omit<Job, 'sessionId'> {
  const { sessionId: _sessionId, ...rest } = job;
  return rest;
}

export const jobTtlMs = env.fileTtlMs;
