import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env.js';
import { AppError } from '../../core/errors.js';
import { logger } from '../../core/logger.js';
import type { MediaInfo, PlatformDescriptor } from '../../core/types.js';
import { sourceIdFor } from '../url/validator.js';
import { getCapabilities, resolveTools } from './capabilities.js';
import { buildFormats, parseFormatId, selectorFor, type RawFormat } from './formats.js';

const PROGRESS_PREFIX = '@@CF@@';

/**
 * Markers we look for in tool output. Everything else collapses to a generic
 * PROCESSING_FAILED so raw tool text never reaches the client.
 */
const ERROR_MARKERS: { pattern: RegExp; code: ConstructorParameters<typeof AppError>[0] }[] = [
  { pattern: /private video|this video is private|login required|requires authentication|account.*cookies|not authorized/i, code: 'PRIVATE_CONTENT' },
  { pattern: /drm|protected content|widevine|fairplay/i, code: 'PLATFORM_RESTRICTED' },
  // YouTube's bot/age verification challenge, not an actual privacy restriction
  // on the video — triggered by the request itself (e.g. datacenter IPs), not
  // by the uploader's settings.
  { pattern: /sign in to confirm/i, code: 'PLATFORM_RESTRICTED' },
  { pattern: /unsupported url|no video formats|is not a valid url/i, code: 'UNSUPPORTED_PLATFORM' },
  { pattern: /video unavailable|removed by the uploader|does not exist|404|has been terminated|no longer available/i, code: 'NOT_FOUND' },
  { pattern: /geo.?restrict|not available in your country|blocked in your country/i, code: 'PLATFORM_RESTRICTED' },
  // The platform served metadata but refused the media itself. Reported as a
  // restriction rather than retried through another route.
  { pattern: /http error 40[13]|unable to download video data|forbidden|unauthorized|failed to fetch.*token/i, code: 'PLATFORM_RESTRICTED' },
  { pattern: /rate.?limit|too many requests|429/i, code: 'RATE_LIMITED' },
  { pattern: /timed out|timeout|connection reset|failed to resolve|network is unreachable/i, code: 'NETWORK_ERROR' },
  { pattern: /file is larger than max-filesize/i, code: 'FILE_TOO_LARGE' },
];

/**
 * `--ffmpeg-location` is only safe to pass a resolved filesystem path: yt-dlp
 * treats the value as a literal path rather than a PATH lookup, so a bare
 * command name like "ffmpeg" makes it report the tool as missing even though
 * it works fine on PATH.
 */
export function shouldPassFfmpegLocation(ffmpeg: string | null): ffmpeg is string {
  return Boolean(ffmpeg) && ffmpeg!.includes(path.sep);
}

export function classify(output: string): AppError {
  for (const { pattern, code } of ERROR_MARKERS) {
    if (pattern.test(output)) {
      return new AppError(code);
    }
  }
  return new AppError('PROCESSING_FAILED');
}

function killTree(child: ChildProcessWithoutNullStreams) {
  if (child.pid === undefined || child.killed) return;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
  } else {
    child.kill('SIGKILL');
  }
}

interface RunOptions {
  args: string[];
  timeoutMs: number;
  signal?: AbortSignal;
  onStdoutLine?: (line: string) => void;
  onStderrLine?: (line: string) => void;
  collectStdout?: boolean;
}

async function runYtdlp({
  args,
  timeoutMs,
  signal,
  onStdoutLine,
  onStderrLine,
  collectStdout = false,
}: RunOptions): Promise<{ stdout: string; stderr: string }> {
  const tools = await resolveTools();
  if (!tools.ytdlp) {
    throw new AppError('TOOLS_UNAVAILABLE', 'Media tooling is not installed on this server.');
  }

  return new Promise((resolve, reject) => {
    const child = spawn(tools.ytdlp as string, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    let stdoutBuffer = '';
    let stderrBuffer = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      killTree(child);
      reject(new AppError('TIMEOUT', 'The media service took too long to respond.'));
    }, timeoutMs);

    const onAbort = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      killTree(child);
      reject(new AppError('PROCESSING_FAILED', 'The job was cancelled.'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    const pump = (chunk: string, buffer: string, sink?: (line: string) => void): string => {
      if (!sink) return '';
      const combined = buffer + chunk;
      const lines = combined.split(/\r?\n/);
      const remainder = lines.pop() ?? '';
      for (const line of lines) if (line) sink(line);
      return remainder;
    };

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      if (collectStdout) stdout += chunk;
      stdoutBuffer = pump(chunk, stdoutBuffer, onStdoutLine);
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      // Keep only the tail: enough to classify, small enough to stay cheap.
      stderr = (stderr + chunk).slice(-8000);
      stderrBuffer = pump(chunk, stderrBuffer, onStderrLine);
    });

    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      logger.error('yt-dlp spawn failed', error.message);
      reject(new AppError('TOOLS_UNAVAILABLE', 'Media tooling could not be started.'));
    });

    child.on('close', (code, killSignal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      // A child killed by a signal we did not send is almost always the
      // kernel's OOM killer reclaiming the largest process, which leaves no
      // message in stderr at all. Reporting that as a generic failure sends
      // people hunting through their code for a bug that is really a memory
      // limit, so it gets its own log line and error code.
      if (killSignal === 'SIGKILL' && !signal?.aborted) {
        logger.error(
          'yt-dlp was killed by the system (SIGKILL). This is almost always the ' +
            'host running out of memory. Lower MAX_CONCURRENT_JOBS or give the ' +
            'service more RAM.',
        );
        reject(new AppError('PROCESSING_FAILED', 'The server ran out of resources for that download.'));
        return;
      }

      logger.warn(
        `yt-dlp exited with code=${code} signal=${killSignal ?? 'none'}`,
        stderr.slice(-800) || '(no stderr output)',
      );
      reject(classify(stderr));
    });
  });
}

/**
 * Baseline arguments. Notably absent: anything that would supply credentials,
 * cookies, or work around a platform's access controls.
 */
function baseArgs(): string[] {
  return [
    '--no-playlist',
    '--no-warnings',
    '--no-progress',
    '--ignore-config',
    // yt-dlp needs a JS engine to read some players; we already ship Node.
    '--js-runtimes',
    'node',
    '--socket-timeout',
    '15',
    '--retries',
    '2',
    '--fragment-retries',
    '2',
    // Anonymous client surface selection (no auth/cookies involved) — the
    // default web client is disproportionately hit by YouTube's IP-reputation
    // bot-check on datacenter hosts; android/ios clients are not. Keep `web`
    // as a fallback so formats the mobile clients don't expose are still
    // available.
    '--extractor-args',
    'youtube:player_client=android,web',
  ];
}

export interface AnalyzeInput {
  url: string;
  platform: PlatformDescriptor;
}

export async function analyzeWithYtdlp({ url, platform }: AnalyzeInput): Promise<MediaInfo> {
  const capabilities = await getCapabilities();
  const { stdout } = await runYtdlp({
    args: [...baseArgs(), '--dump-single-json', '--skip-download', url],
    timeoutMs: env.analyzeTimeoutMs,
    collectStdout: true,
  });

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(stdout) as Record<string, unknown>;
  } catch {
    throw new AppError('PROCESSING_FAILED', 'The media service returned an unreadable response.');
  }

  if (payload['_type'] === 'playlist') {
    const entries = (payload['entries'] as Record<string, unknown>[] | undefined) ?? [];
    const first = entries[0];
    if (!first) throw new AppError('NOT_FOUND', 'No video was found at that URL.');
    payload = first;
  }

  if (payload['is_live'] === true) {
    throw new AppError('PLATFORM_RESTRICTED', 'Live streams are not processed.');
  }

  const raw = (payload['formats'] as RawFormat[] | undefined) ?? [];
  const durationValue = payload['duration'];
  const durationSeconds = typeof durationValue === 'number' ? Math.round(durationValue) : undefined;

  const { formats, limitations } = buildFormats({
    raw,
    durationSeconds,
    capabilities,
    audioOnly: platform.capabilities.length === 2 && platform.capabilities.includes('audio') && !platform.capabilities.includes('video'),
  });

  const thumbnail = typeof payload['thumbnail'] === 'string' ? (payload['thumbnail'] as string) : undefined;

  return {
    sourceId: sourceIdFor(url),
    sourceUrl: url,
    platform: platform.id,
    platformName: platform.name,
    title: (payload['title'] as string | undefined)?.trim() || 'Untitled media',
    uploader: (payload['uploader'] as string | undefined) ?? (payload['channel'] as string | undefined),
    thumbnail,
    durationSeconds,
    isLive: false,
    formats,
    limitations,
    analyzedAt: new Date().toISOString(),
  };
}

export interface DownloadInput {
  url: string;
  formatId: string;
  workDir: string;
  signal?: AbortSignal;
  onProgress: (update: { percent: number | null; stage: 'fetching-media' | 'processing' }) => void;
}

export interface DownloadOutput {
  filePath: string;
  filesize: number;
}

export async function downloadWithYtdlp({
  url,
  formatId,
  workDir,
  signal,
  onProgress,
}: DownloadInput): Promise<DownloadOutput> {
  const selection = parseFormatId(formatId);
  const tools = await resolveTools();
  await fs.mkdir(workDir, { recursive: true });

  const args = [
    ...baseArgs(),
    '--restrict-filenames',
    '--no-mtime',
    '--max-filesize',
    `${env.maxFilesizeMb}m`,
    '--newline',
    '--progress',
    '--progress-template',
    `download:${PROGRESS_PREFIX}%(progress.downloaded_bytes)s|%(progress.total_bytes)s|%(progress.total_bytes_estimate)s`,
    '-f',
    selectorFor(selection),
    '-o',
    path.join(workDir, '%(title).100B.%(ext)s'),
  ];

  if (shouldPassFfmpegLocation(tools.ffmpeg)) {
    args.push('--ffmpeg-location', tools.ffmpeg);
  }

  if (selection.kind === 'video') {
    if (tools.ffmpeg) args.push('--merge-output-format', selection.container);
  } else {
    if (!tools.ffmpeg) {
      throw new AppError('TOOLS_UNAVAILABLE', 'Audio conversion requires FFmpeg on the server.');
    }
    args.push('-x', '--audio-format', selection.container);
    if (selection.tier === 'high') args.push('--audio-quality', '2');
    if (selection.tier === 'standard') args.push('--audio-quality', '5');
  }

  args.push(url);

  let sawPostProcess = false;

  await runYtdlp({
    args,
    timeoutMs: env.jobTimeoutMs,
    signal,
    onStdoutLine: (line) => {
      if (line.startsWith(PROGRESS_PREFIX)) {
        const [downloaded, total, estimate] = line.slice(PROGRESS_PREFIX.length).split('|');
        const done = Number(downloaded);
        const size = Number(total) || Number(estimate);
        const percent =
          Number.isFinite(done) && Number.isFinite(size) && size > 0
            ? Math.min(99, Math.round((done / size) * 100))
            : null;
        onProgress({ percent, stage: 'fetching-media' });
        return;
      }
      if (/\[(Merger|ExtractAudio|VideoConvertor|FixupM3u8|Fixup)/i.test(line)) {
        sawPostProcess = true;
        // FFmpeg muxing gives no reliable percentage: report indeterminate.
        onProgress({ percent: null, stage: 'processing' });
      }
    },
  });

  if (sawPostProcess) onProgress({ percent: null, stage: 'processing' });

  const produced = await pickOutputFile(workDir);
  const stat = await fs.stat(produced);
  if (stat.size <= 0) throw new AppError('PROCESSING_FAILED', 'The produced file was empty.');
  if (stat.size > env.maxFilesizeMb * 1024 * 1024) {
    await fs.rm(produced, { force: true });
    throw new AppError('FILE_TOO_LARGE', 'The resulting file exceeds the server limit.');
  }

  return { filePath: produced, filesize: stat.size };
}

const INTERMEDIATE = /\.(part|ytdl|temp|f\d+\.[a-z0-9]+)$/i;

async function pickOutputFile(workDir: string): Promise<string> {
  const entries = await fs.readdir(workDir, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && !INTERMEDIATE.test(entry.name));
  if (files.length === 0) {
    throw new AppError('PROCESSING_FAILED', 'No output file was produced.');
  }
  // With a merge step yt-dlp leaves the source streams behind; the final file
  // is the largest remaining non-intermediate one.
  const sized = await Promise.all(
    files.map(async (entry) => {
      const full = path.join(workDir, entry.name);
      const stat = await fs.stat(full);
      return { full, size: stat.size };
    }),
  );
  sized.sort((a, b) => b.size - a.size);
  return sized[0]!.full;
}
