/** Mirrors the API contract in `server/src/core/types.ts`. */

export type PlatformId =
  | 'youtube'
  | 'facebook'
  | 'tiktok'
  | 'instagram'
  | 'twitter'
  | 'reddit'
  | 'pinterest'
  | 'vimeo'
  | 'twitch'
  | 'dailymotion'
  | 'linkedin'
  | 'soundcloud'
  | 'generic';

export type MediaKind = 'video' | 'audio';

export interface PlatformDescriptor {
  id: PlatformId;
  name: string;
  hosts: string[];
  capabilities: ('video' | 'audio' | 'public-only')[];
  status: 'supported' | 'limited';
  note?: string;
  color: string;
}

export interface MediaFormat {
  id: string;
  kind: MediaKind;
  container: string;
  quality?: string;
  height?: number;
  fps?: number;
  audioBitrate?: number;
  filesize?: number;
  filesizeIsApproximate: boolean;
  requiresProcessing: boolean;
  videoCodec?: string;
  audioCodec?: string;
  label: string;
}

export interface MediaInfo {
  sourceId: string;
  sourceUrl: string;
  platform: PlatformId;
  platformName: string;
  title: string;
  uploader?: string;
  thumbnail?: string;
  durationSeconds?: number;
  isLive: boolean;
  formats: MediaFormat[];
  limitations: string[];
  analyzedAt: string;
}

export type JobState = 'queued' | 'analyzing' | 'processing' | 'completed' | 'failed' | 'expired';

export type JobStage =
  | 'queued'
  | 'checking-url'
  | 'detecting-platform'
  | 'retrieving-info'
  | 'preparing-options'
  | 'fetching-media'
  | 'processing'
  | 'preparing-file'
  | 'ready';

export interface JobResult {
  fileId: string;
  filename: string;
  container: string;
  quality?: string;
  kind: MediaKind;
  filesize: number;
  downloadUrl: string;
  expiresAt: string;
}

export interface Job {
  id: string;
  state: JobState;
  stage: JobStage;
  progress: number | null;
  sourceUrl: string;
  platform: PlatformId;
  title?: string;
  thumbnail?: string;
  formatId: string;
  createdAt: string;
  updatedAt: string;
  result?: JobResult;
  error?: { code: string; message: string };
}

export interface Capabilities {
  ytdlp: boolean;
  ffmpeg: boolean;
  ffprobe: boolean;
  provider: 'ytdlp' | 'mock' | 'unavailable';
  queue: 'memory' | 'redis';
  canMux: boolean;
  canConvertAudio: boolean;
}

export type ApiErrorCode =
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

export interface HistoryEntry {
  id: string;
  jobId: string;
  fileId?: string;
  title: string;
  platform: PlatformId;
  thumbnail?: string;
  sourceUrl: string;
  container: string;
  quality?: string;
  kind: MediaKind;
  filesize?: number;
  downloadUrl?: string;
  expiresAt?: string;
  createdAt: string;
}
