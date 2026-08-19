/**
 * Every failure the API can return maps to one of these codes. The frontend
 * turns the code into a localised, human message — raw output from yt-dlp,
 * ffmpeg or the network is never forwarded to the client.
 */
export type ErrorCode =
  | 'INVALID_URL'
  | 'UNSUPPORTED_PLATFORM'
  | 'PRIVATE_CONTENT'
  | 'PLATFORM_RESTRICTED'
  | 'NOT_FOUND'
  | 'PROCESSING_FAILED'
  | 'TOOLS_UNAVAILABLE'
  | 'FILE_TOO_LARGE'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'EXPIRED'
  | 'BAD_REQUEST'
  | 'NETWORK_ERROR'
  | 'INTERNAL';

const statusByCode: Record<ErrorCode, number> = {
  INVALID_URL: 400,
  UNSUPPORTED_PLATFORM: 422,
  PRIVATE_CONTENT: 403,
  PLATFORM_RESTRICTED: 451,
  NOT_FOUND: 404,
  PROCESSING_FAILED: 502,
  TOOLS_UNAVAILABLE: 503,
  FILE_TOO_LARGE: 413,
  TIMEOUT: 504,
  RATE_LIMITED: 429,
  EXPIRED: 410,
  BAD_REQUEST: 400,
  NETWORK_ERROR: 502,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  /** Safe extra context for the client (never contains tool output). */
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message?: string, details?: Record<string, unknown>) {
    super(message ?? code);
    this.name = 'AppError';
    this.code = code;
    this.status = statusByCode[code];
    this.details = details;
  }

  toJSON() {
    return { error: { code: this.code, message: this.message, ...(this.details ?? {}) } };
  }
}

export const isAppError = (value: unknown): value is AppError => value instanceof AppError;
