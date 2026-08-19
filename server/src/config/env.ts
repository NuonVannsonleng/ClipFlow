import 'dotenv/config';
import path from 'node:path';

function str(key: string, fallback = ''): string {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
}

function int(key: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[key] ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(key: string, fallback = false): boolean {
  const value = process.env[key];
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function list(key: string, fallback: string[]): string[] {
  const value = str(key);
  if (!value) return fallback;
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

const rootDir = path.resolve(process.cwd());

export type MediaProviderMode = 'auto' | 'ytdlp' | 'mock';
const providerMode = str('MEDIA_PROVIDER', 'auto') as MediaProviderMode;

export const env = {
  nodeEnv: str('NODE_ENV', 'development'),
  isProduction: str('NODE_ENV', 'development') === 'production',
  port: int('PORT', 4000),
  corsOrigins: list('CORS_ORIGINS', ['http://localhost:3000']),
  publicApiUrl: str('PUBLIC_API_URL', `http://localhost:${int('PORT', 4000)}`),

  provider: (['auto', 'ytdlp', 'mock'] as const).includes(providerMode) ? providerMode : 'auto',
  ytdlpPath: str('YTDLP_PATH'),
  ffmpegPath: str('FFMPEG_PATH'),
  ffprobePath: str('FFPROBE_PATH'),

  maxFilesizeMb: int('MAX_FILESIZE_MB', 1024),
  jobTimeoutMs: int('JOB_TIMEOUT_MS', 10 * 60 * 1000),
  analyzeTimeoutMs: int('ANALYZE_TIMEOUT_MS', 45_000),
  maxConcurrentJobs: int('MAX_CONCURRENT_JOBS', 2),
  maxBatchUrls: int('MAX_BATCH_URLS', 10),
  fileTtlMs: int('FILE_TTL_MS', 30 * 60 * 1000),

  rateLimitWindowMs: int('RATE_LIMIT_WINDOW_MS', 60_000),
  rateLimitAnalyze: int('RATE_LIMIT_ANALYZE', 20),
  rateLimitProcess: int('RATE_LIMIT_PROCESS', 10),

  tmpDir: path.resolve(rootDir, str('TMP_DIR', '.tmp')),
  binDir: path.resolve(rootDir, 'bin'),

  redisUrl: str('REDIS_URL'),
  allowPrivateAddresses: bool('ALLOW_PRIVATE_ADDRESSES', false),
} as const;
