import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env.js';
import { AppError } from '../../core/errors.js';
import { logger } from '../../core/logger.js';

export interface StoredFile {
  fileId: string;
  jobId: string;
  sessionId: string;
  /** Absolute path inside the temp directory. */
  filePath: string;
  /** Name the browser will save it as. */
  filename: string;
  container: string;
  filesize: number;
  createdAt: number;
  expiresAt: number;
}

const files = new Map<string, StoredFile>();

export const workDirFor = (jobId: string): string => path.join(env.tmpDir, jobId);

/**
 * Produces a filename that is safe on every OS and safe to put in a
 * Content-Disposition header: ASCII, no separators, no control characters.
 */
export function safeFilename(title: string, container: string): string {
  const base = title
    .normalize('NFKD')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[^\w\s.-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80);
  const safeBase = base || 'clipflow-media';
  const safeExt = container.replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase() || 'bin';
  return `${safeBase}.${safeExt}`;
}

export async function ensureTmpDir(): Promise<void> {
  await fs.mkdir(env.tmpDir, { recursive: true });
}

export async function registerFile(input: {
  jobId: string;
  sessionId: string;
  filePath: string;
  filename: string;
  container: string;
  filesize: number;
}): Promise<StoredFile> {
  const resolved = path.resolve(input.filePath);
  // Defence in depth: never serve anything outside the temp directory.
  if (!resolved.startsWith(path.resolve(env.tmpDir) + path.sep)) {
    throw new AppError('INTERNAL', 'Refusing to register a file outside temporary storage.');
  }

  const now = Date.now();
  const record: StoredFile = {
    fileId: crypto.randomUUID(),
    jobId: input.jobId,
    sessionId: input.sessionId,
    filePath: resolved,
    filename: input.filename,
    container: input.container,
    filesize: input.filesize,
    createdAt: now,
    expiresAt: now + env.fileTtlMs,
  };
  files.set(record.fileId, record);
  return record;
}

export function getFile(fileId: string): StoredFile {
  const record = files.get(fileId);
  if (!record) throw new AppError('NOT_FOUND', 'That download is no longer available.');
  if (record.expiresAt <= Date.now()) {
    throw new AppError('EXPIRED', 'That download link has expired.');
  }
  return record;
}

export function listFilesForJob(jobId: string): StoredFile[] {
  return [...files.values()].filter((file) => file.jobId === jobId);
}

export async function removeJobFiles(jobId: string): Promise<void> {
  for (const [fileId, record] of files) {
    if (record.jobId === jobId) files.delete(fileId);
  }
  await fs.rm(workDirFor(jobId), { recursive: true, force: true }).catch(() => undefined);
}

/** Deletes expired records plus any stale directory left behind by a crash. */
export async function sweep(): Promise<number> {
  const now = Date.now();
  let removed = 0;

  for (const [fileId, record] of files) {
    if (record.expiresAt <= now) {
      files.delete(fileId);
      removed += 1;
    }
  }

  const live = new Set([...files.values()].map((record) => record.jobId));
  let entries: string[] = [];
  try {
    entries = await fs.readdir(env.tmpDir);
  } catch {
    return removed;
  }

  for (const entry of entries) {
    if (live.has(entry)) continue;
    const dir = path.join(env.tmpDir, entry);
    try {
      const stat = await fs.stat(dir);
      if (now - stat.mtimeMs > env.fileTtlMs) {
        await fs.rm(dir, { recursive: true, force: true });
        removed += 1;
      }
    } catch {
      // Directory vanished underneath us; nothing to do.
    }
  }

  if (removed > 0) logger.debug(`temp sweep removed ${removed} item(s)`);
  return removed;
}

export function stats(): { files: number; bytes: number } {
  let bytes = 0;
  for (const record of files.values()) bytes += record.filesize;
  return { files: files.size, bytes };
}
