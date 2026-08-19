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

async function probe(name: string, override: string): Promise<string | null> {
  for (const candidate of candidatesFor(name, override)) {
    if (candidate.includes(path.sep) && !fs.existsSync(candidate)) continue;
    try {
      await run(candidate, ['-version'], { timeout: 10_000, windowsHide: true });
      return candidate;
    } catch (error) {
      // yt-dlp uses --version, ffmpeg uses -version; try the other spelling.
      try {
        await run(candidate, ['--version'], { timeout: 10_000, windowsHide: true });
        return candidate;
      } catch {
        logger.debug(`tool probe failed for ${candidate}`, (error as Error).message);
      }
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
const CACHE_MS = 60_000;

export async function resolveTools(force = false): Promise<ResolvedTools> {
  if (!force && cached && Date.now() - cachedAt < CACHE_MS) return cached;
  const [ytdlp, ffmpeg, ffprobe] = await Promise.all([
    probe('yt-dlp', env.ytdlpPath),
    probe('ffmpeg', env.ffmpegPath),
    probe('ffprobe', env.ffprobePath),
  ]);
  cached = { ytdlp, ffmpeg, ffprobe };
  cachedAt = Date.now();
  return cached;
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
