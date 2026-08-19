import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../../config/env.js';

const COOKIE = 'cf_sid';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      sessionId: string;
    }
  }
}

/**
 * An anonymous, opaque id so a browser only ever sees its own jobs and
 * downloads. No account, no personal data, no tracking across sessions.
 */
export function session(req: Request, res: Response, next: NextFunction): void {
  const existing = req.cookies?.[COOKIE];
  const sessionId = typeof existing === 'string' && UUID.test(existing) ? existing : crypto.randomUUID();

  if (sessionId !== existing) {
    res.cookie(COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  req.sessionId = sessionId;
  next();
}
