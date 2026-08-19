import fs from 'node:fs';
import { Router } from 'express';
import { AppError } from '../../core/errors.js';
import { getFile } from '../../services/storage/tempStore.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const downloadRouter = Router();

const CONTENT_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  opus: 'audio/ogg',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Streams a temporary file. The id is an opaque UUID resolved through the
 * store, so there is no user-controlled path anywhere in this handler, and
 * the response is always an attachment - never something the browser runs.
 */
downloadRouter.get(
  '/download/:id',
  asyncHandler(async (req, res) => {
    const fileId = req.params.id as string;
    if (!UUID.test(fileId)) throw new AppError('NOT_FOUND', 'That download is no longer available.');

    const record = getFile(fileId);
    if (record.sessionId !== req.sessionId) {
      throw new AppError('NOT_FOUND', 'That download is no longer available.');
    }

    if (!fs.existsSync(record.filePath)) {
      throw new AppError('EXPIRED', 'That file has already been cleaned up.');
    }

    const extension = record.container.toLowerCase();
    res.setHeader('Content-Type', CONTENT_TYPES[extension] ?? 'application/octet-stream');
    res.setHeader('Content-Length', String(record.filesize));
    res.setHeader('Content-Disposition', `attachment; filename="${record.filename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Expires-At', new Date(record.expiresAt).toISOString());

    const stream = fs.createReadStream(record.filePath);
    stream.on('error', () => {
      if (!res.headersSent) {
        const error = new AppError('EXPIRED', 'That file is no longer available.');
        res.status(error.status).json(error.toJSON());
      } else {
        res.destroy();
      }
    });
    stream.pipe(res);
  }),
);

/** Metadata for the success screen, without starting the transfer. */
downloadRouter.get(
  '/download/:id/info',
  asyncHandler(async (req, res) => {
    const fileId = req.params.id as string;
    if (!UUID.test(fileId)) throw new AppError('NOT_FOUND', 'That download is no longer available.');
    const record = getFile(fileId);
    if (record.sessionId !== req.sessionId) {
      throw new AppError('NOT_FOUND', 'That download is no longer available.');
    }
    res.json({
      fileId: record.fileId,
      filename: record.filename,
      container: record.container,
      filesize: record.filesize,
      expiresAt: new Date(record.expiresAt).toISOString(),
    });
  }),
);
