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

export type PlatformCapability = 'video' | 'audio' | 'public-only';

export interface PlatformDescriptor {
  id: PlatformId;
  name: string;
  /** Hostnames (without leading dots) that identify the platform. */
  hosts: string[];
  capabilities: PlatformCapability[];
  /** `supported` platforms are attempted; `limited` ones often refuse. */
  status: 'supported' | 'limited';
  /** Shown in the UI so we never over-promise what a platform allows. */
  note?: string;
  color: string;
}

export interface MediaFormat {
  /** Opaque id the client sends back to /api/process. */
  id: string;
  kind: MediaKind;
  /** Container the user will receive, e.g. mp4, webm, mp3. */
  container: string;
  /** e.g. "1080p"; undefined for audio-only. */
  quality?: string;
  height?: number;
  fps?: number;
  /** Bitrate in kbps for audio formats. */
  audioBitrate?: number;
  /** Bytes; exact when the source reports it, estimated otherwise. */
  filesize?: number;
  filesizeIsApproximate: boolean;
  /** True when the format needs a server-side mux/convert step (ffmpeg). */
  requiresProcessing: boolean;
  videoCodec?: string;
  audioCodec?: string;
  label: string;
}

export interface MediaInfo {
  /** Stable hash of the source URL — used to correlate analyse -> process. */
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
  /** Capabilities that were unavailable, so the UI can explain gaps. */
  limitations: string[];
  analyzedAt: string;
}

export type JobState =
  | 'queued'
  | 'analyzing'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired';

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
  sessionId: string;
  state: JobState;
  stage: JobStage;
  /** 0..100 when the tool reports real progress, null when indeterminate. */
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
  /** Formats that can actually be produced right now. */
  canMux: boolean;
  canConvertAudio: boolean;
}
