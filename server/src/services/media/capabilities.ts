import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { env } from '../../config/env.js';
import { logger } from '../../core/logger.js';
import type { Capabilities } from '../../core/types.js';

const run = promisify(execFile);
const isWindows = process.platform === 'win32';

function candidatesFor(name: string, override: string): string[] {
  const list: string[] = [];
  if (override) list.push(override);
  const exeName = isWindows ? `${name}.exe` : name;
  list.push(path.join(env.binDir, exeName));
  list.push(name);
  return list;
}

/**
 * yt-dlp is a Python zipapp that unpacks itself on every invocation, so it can
 * take several seconds to answer on a small or throttled host — far longer
 * than the native FFmpeg binaries. Each tool is asked with the flag it
 * actually supports, so a probe never pays to spawn the process twice.
 */
const VERSION_FLAG: Record<string, string> = {
  'yt-dlp': '--version',
  ffmpeg: '-version',
  ffprobe: '-version',
};

const PROBE_TIMEOUT_MS = 30_000;

async function probe(name: string, override: string): Promise<string | null> {
  const flag = VERSION_FLAG[name] ?? '--version';
  for (const candidate of candidatesFor(name, override)) {
    if (candidate.includes(path.sep) && !fs.existsSync(candidate)) continue;
    try {
      await run(candidate, [flag], { timeout: PROBE_TIMEOUT_MS, windowsHide: true });
      return candidate;
    } catch (error) {
      logger.debug(`tool probe failed for ${candidate}`, (error as Error).message);
    }
  }
  return null;
}

export interface ResolvedTools {
  ytdlp: string | null;
  ffmpeg: string | null;
  ffprobe: string | null;
}

let cached: ResolvedTools | null = null;
let cachedAt = 0;
let inFlight: Promise<ResolvedTools> | null = null;

/**
 * A binary that was found does not disappear, so a good result is held for a
 * long time. A failed probe is retried sooner, because on a constrained host
 * it usually means the machine was momentarily too busy rather than that the
 * tool is missing — re-probing every minute is what made the API flap between
 * "ready" and TOOLS_UNAVAILABLE.
 */
const CACHE_MS_FOUND = 30 * 60 * 1000;
const CACHE_MS_MISSING = 30_000;

export async function resolveTools(force = false): Promise<ResolvedTools> {
  if (!force && cached) {
    const ttl = cached.ytdlp ? CACHE_MS_FOUND : CACHE_MS_MISSING;
    if (Date.now() - cachedAt < ttl) return cached;
  }

  // Concurrent requests must not each spawn their own probe: on a small
  // instance that is exactly the memory spike that makes probes time out.
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const [ytdlp, ffmpeg, ffprobe] = await Promise.all([
        probe('yt-dlp', env.ytdlpPath),
        probe('ffmpeg', env.ffmpegPath),
        probe('ffprobe', env.ffprobePath),
      ]);
      cached = { ytdlp, ffmpeg, ffprobe };
      cachedAt = Date.now();
      return cached;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export async function getCapabilities(): Promise<Capabilities> {
  const tools = await resolveTools();
  const provider =
    env.provider === 'mock' ? 'mock' : tools.ytdlp ? 'ytdlp' : 'unavailable';
  return {
    ytdlp: Boolean(tools.ytdlp),
    ffmpeg: Boolean(tools.ffmpeg),
    ffprobe: Boolean(tools.ffprobe),
    provider,
    queue: env.redisUrl ? 'redis' : 'memory',
    canMux: env.provider === 'mock' ? true : Boolean(tools.ffmpeg),
    canConvertAudio: env.provider === 'mock' ? true : Boolean(tools.ffmpeg),
  };
}

export async function logCapabilities(): Promise<void> {
  const capabilities = await getCapabilities();
  logger.info('media capabilities', capabilities);
  if (capabilities.provider === 'unavailable') {
    logger.warn(
      'yt-dlp was not found. /api/analyze will return TOOLS_UNAVAILABLE. ' +
        'Run `npm run setup:tools` or set MEDIA_PROVIDER=mock for UI development.',
    );
  } else if (capabilities.provider === 'ytdlp' && !capabilities.ffmpeg) {
    logger.warn('FFmpeg was not found. Only pre-muxed formats will be offered.');
  }
}
