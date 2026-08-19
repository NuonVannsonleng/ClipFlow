import crypto from 'node:crypto';
import { AppError } from '../../core/errors.js';
import type { PlatformDescriptor } from '../../core/types.js';
import { detectPlatform } from './platforms.js';
import { assertPublicHost } from './ssrf.js';

export interface ValidatedUrl {
  /** Normalised URL that is safe to hand to the media tooling. */
  url: string;
  hostname: string;
  platform: PlatformDescriptor;
  sourceId: string;
}

const MAX_URL_LENGTH = 2048;

/** Cheap, synchronous checks — used by the client-side detector too. */
export function parseUrl(rawUrl: string): { url: URL; platform: PlatformDescriptor } {
  const trimmed = rawUrl.trim();
  if (!trimmed) throw new AppError('INVALID_URL', 'Enter a video URL.');
  if (trimmed.length > MAX_URL_LENGTH) throw new AppError('INVALID_URL', 'That URL is too long.');

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    throw new AppError('INVALID_URL', 'That does not look like a valid URL.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new AppError('INVALID_URL', 'Only http and https URLs are supported.');
  }
  if (url.username || url.password) {
    throw new AppError('INVALID_URL', 'URLs with embedded credentials are not accepted.');
  }
  if (url.port && !['80', '443', ''].includes(url.port)) {
    throw new AppError('INVALID_URL', 'Only standard web ports are supported.');
  }

  const platform = detectPlatform(url.hostname);
  if (!platform) {
    throw new AppError('UNSUPPORTED_PLATFORM', 'That platform is not supported.', {
      hostname: url.hostname,
    });
  }

  // Strip tracking noise but keep the identifying query parameters.
  const keep = new Set(['v', 'list', 'id', 'video_id', 'story_fbid', 'p', 'clip', 't', 'time_continue']);
  for (const key of [...url.searchParams.keys()]) {
    if (!keep.has(key)) url.searchParams.delete(key);
  }
  url.hash = '';

  return { url, platform };
}

export const sourceIdFor = (url: string): string =>
  crypto.createHash('sha256').update(url).digest('hex').slice(0, 24);

/** Full validation, including the DNS/SSRF check. */
export async function validateUrl(rawUrl: string): Promise<ValidatedUrl> {
  const { url, platform } = parseUrl(rawUrl);
  await assertPublicHost(url.hostname);
  const normalized = url.toString();
  return {
    url: normalized,
    hostname: url.hostname,
    platform,
    sourceId: sourceIdFor(normalized),
  };
}
