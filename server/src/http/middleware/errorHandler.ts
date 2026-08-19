import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError, isAppError } from '../../core/errors.js';
import { logger } from '../../core/logger.js';

export const asyncHandler =
  <T extends Request>(handler: (req: T, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: T, res: Response, next: NextFunction): void => {
    void handler(req, res, next).catch(next);
  };

export function notFound(_req: Request, res: Response): void {
  const error = new AppError('NOT_FOUND', 'That endpoint does not exist.');
  res.status(error.status).json(error.toJSON());
}

/**
 * The single place errors become responses. Anything unrecognised is logged
 * server-side and reported as a generic INTERNAL code — raw stack traces and
 * tool output never leave the process.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (isAppError(error)) {
    res.status(error.status).json(error.toJSON());
    return;
  }

  if (error instanceof ZodError) {
    const wrapped = new AppError('BAD_REQUEST', 'The request was not valid.');
    res.status(wrapped.status).json(wrapped.toJSON());
    return;
  }

  logger.error('unhandled error', error instanceof Error ? error.stack : error);
  const fallback = new AppError('INTERNAL', 'Something went wrong on our side.');
  res.status(fallback.status).json(fallback.toJSON());
}
