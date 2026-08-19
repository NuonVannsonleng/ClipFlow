import { AppError } from '../../core/errors.js';
import type { Capabilities, MediaFormat } from '../../core/types.js';

export interface RawFormat {
  format_id?: string;
  ext?: string;
  vcodec?: string;
  acodec?: string;
  height?: number | null;
  width?: number | null;
  fps?: number | null;
  filesize?: number | null;
  filesize_approx?: number | null;
  tbr?: number | null;
  abr?: number | null;
  vbr?: number | null;
  protocol?: string;
  format_note?: string;
}

const LADDER = [2160, 1440, 1080, 720, 480, 360, 240, 144] as const;
const VIDEO_CONTAINERS = ['mp4', 'webm'] as const;
const AUDIO_CONTAINERS = ['mp3', 'm4a', 'wav', 'opus'] as const;

export type VideoContainer = (typeof VIDEO_CONTAINERS)[number];
export type AudioContainer = (typeof AUDIO_CONTAINERS)[number];

/** `video:1080:mp4` or `audio:mp3:best` are the only shapes /api/process accepts. */
const FORMAT_ID_PATTERN =
  /^(video:(?:144|240|360|480|720|1080|1440|2160):(?:mp4|webm)|audio:(?:mp3|m4a|wav|opus):(?:best|high|standard))$/;

export type FormatSelection =
  | { kind: 'video'; height: number; container: VideoContainer }
  | { kind: 'audio'; container: AudioContainer; tier: 'best' | 'high' | 'standard' };

export function parseFormatId(formatId: string): FormatSelection {
  if (!FORMAT_ID_PATTERN.test(formatId)) {
    throw new AppError('BAD_REQUEST', 'Unknown format selection.');
  }
  const parts = formatId.split(':');
  if (parts[0] === 'video') {
    return { kind: 'video', height: Number(parts[1]), container: parts[2] as VideoContainer };
  }
  return {
    kind: 'audio',
    container: parts[1] as AudioContainer,
    tier: parts[2] as 'best' | 'high' | 'standard',
  };
}

const hasVideo = (format: RawFormat) => Boolean(format.vcodec) && format.vcodec !== 'none';
const hasAudio = (format: RawFormat) => Boolean(format.acodec) && format.acodec !== 'none';

function sizeOf(format: RawFormat, durationSeconds?: number): { bytes?: number; approx: boolean } {
  if (format.filesize) return { bytes: format.filesize, approx: false };
  if (format.filesize_approx) return { bytes: format.filesize_approx, approx: true };
  if (format.tbr && durationSeconds) {
    return { bytes: Math.round((format.tbr * 1000 * durationSeconds) / 8), approx: true };
  }
  return { approx: true };
}

function bestBy<T>(items: T[], score: (item: T) => number): T | undefined {
  let best: T | undefined;
  let bestScore = -Infinity;
  for (const item of items) {
    const value = score(item);
    if (value > bestScore) {
      best = item;
      bestScore = value;
    }
  }
  return best;
}

export interface BuildFormatsInput {
  raw: RawFormat[];
  durationSeconds?: number;
  capabilities: Pick<Capabilities, 'canMux' | 'canConvertAudio'>;
  /** Platforms flagged audio-only (e.g. SoundCloud) skip the video ladder. */
  audioOnly?: boolean;
}

/**
 * Turns yt-dlp's raw format table into the short, honest list the UI shows.
 * A quality only appears when the source actually provides it *and* this
 * server can produce it with the tools it currently has.
 */
export function buildFormats({
  raw,
  durationSeconds,
  capabilities,
  audioOnly = false,
}: BuildFormatsInput): { formats: MediaFormat[]; limitations: string[] } {
  const limitations: string[] = [];
  const usable = raw.filter(
    (format) => format.protocol !== 'mhtml' && (hasVideo(format) || hasAudio(format)),
  );

  const audioStreams = usable.filter((format) => hasAudio(format) && !hasVideo(format));
  const videoStreams = usable.filter((format) => hasVideo(format));
  const progressive = usable.filter((format) => hasVideo(format) && hasAudio(format));

  const bestAudio = bestBy(audioStreams, (format) => format.abr ?? format.tbr ?? 0);
  const formats: MediaFormat[] = [];

  if (!audioOnly) {
    const availableHeights = new Set(
      videoStreams.map((format) => format.height ?? 0).filter((height) => height > 0),
    );

    for (const rung of LADDER) {
      // Treat a stream as "this rung" when it lands within 10% of the label.
      const matches = [...availableHeights].filter(
        (height) => Math.abs(height - rung) <= Math.max(24, rung * 0.1),
      );
      if (matches.length === 0) continue;
      const height = Math.max(...matches);

      for (const container of VIDEO_CONTAINERS) {
        const progressiveMatch = progressive.find(
          (format) => format.height === height && format.ext === container,
        );

        if (progressiveMatch) {
          const size = sizeOf(progressiveMatch, durationSeconds);
          formats.push({
            id: `video:${rung}:${container}`,
            kind: 'video',
            container,
            quality: `${rung}p`,
            height,
            fps: progressiveMatch.fps ?? undefined,
            filesize: size.bytes,
            filesizeIsApproximate: size.approx,
            requiresProcessing: false,
            videoCodec: progressiveMatch.vcodec ?? undefined,
            audioCodec: progressiveMatch.acodec ?? undefined,
            label: `${rung}p`,
          });
          continue;
        }

        // No ready-made file: producing this needs a server-side merge.
        if (!capabilities.canMux) continue;
        const atHeight = videoStreams.filter(
          (format) => format.height === height && !hasAudio(format),
        );
        // Prefer a stream already in the target container so the merge stays a
        // remux rather than a re-encode.
        const preferred = atHeight.filter((format) => format.ext === container);
        const videoOnly = bestBy(
          preferred.length > 0 ? preferred : atHeight,
          (format) => format.tbr ?? format.vbr ?? 0,
        );
        const preferredAudioExt = container === 'mp4' ? 'm4a' : 'webm';
        const audioPick =
          bestBy(
            audioStreams.filter((format) => format.ext === preferredAudioExt),
            (format) => format.abr ?? format.tbr ?? 0,
          ) ?? bestAudio;
        if (!videoOnly || !audioPick) continue;

        const videoSize = sizeOf(videoOnly, durationSeconds);
        const audioSize = sizeOf(audioPick, durationSeconds);
        const bytes =
          videoSize.bytes !== undefined && audioSize.bytes !== undefined
            ? videoSize.bytes + audioSize.bytes
            : undefined;

        formats.push({
          id: `video:${rung}:${container}`,
          kind: 'video',
          container,
          quality: `${rung}p`,
          height,
          fps: videoOnly.fps ?? undefined,
          filesize: bytes,
          filesizeIsApproximate: true,
          requiresProcessing: true,
          videoCodec: videoOnly.vcodec ?? undefined,
          audioCodec: audioPick.acodec ?? undefined,
          label: `${rung}p`,
        });
      }
    }

    if (videoStreams.length > 0 && formats.length === 0 && !capabilities.canMux) {
      limitations.push('FFMPEG_MISSING_VIDEO');
    }
  }

  if (audioStreams.length > 0) {
    const tiers: { tier: 'best' | 'high' | 'standard'; ceiling: number }[] = [
      { tier: 'best', ceiling: Number.POSITIVE_INFINITY },
      { tier: 'high', ceiling: 192 },
      { tier: 'standard', ceiling: 128 },
    ];

    for (const container of AUDIO_CONTAINERS) {
      const nativeMatch = audioStreams.find((format) => format.ext === container);
      const needsConversion = !nativeMatch || container === 'mp3' || container === 'wav';
      if (needsConversion && !capabilities.canConvertAudio) continue;

      for (const { tier, ceiling } of tiers) {
        // Only offer the extra tiers when the source really has that variety.
        if (tier !== 'best' && audioStreams.length < 2) continue;

        const source =
          tier === 'best'
            ? bestAudio
            : (bestBy(
                audioStreams.filter((format) => (format.abr ?? format.tbr ?? 0) <= ceiling),
                (format) => format.abr ?? format.tbr ?? 0,
              ) ?? undefined);
        if (!source) continue;

        const abr = Math.round(source.abr ?? source.tbr ?? 0) || undefined;
        const size = sizeOf(source, durationSeconds);

        formats.push({
          id: `audio:${container}:${tier}`,
          kind: 'audio',
          container,
          audioBitrate: abr,
          // WAV is uncompressed, so the source size tells us nothing useful.
          filesize: container === 'wav' ? undefined : size.bytes,
          filesizeIsApproximate: true,
          requiresProcessing: needsConversion,
          audioCodec: source.acodec ?? undefined,
          label: tier === 'best' ? 'Best available' : tier === 'high' ? 'High quality' : 'Standard',
        });
      }
    }

    if (!capabilities.canConvertAudio) limitations.push('FFMPEG_MISSING_AUDIO');
  }

  // De-duplicate on id, keeping the first (highest quality) entry.
  const seen = new Set<string>();
  const deduped = formats.filter((format) => {
    if (seen.has(format.id)) return false;
    seen.add(format.id);
    return true;
  });

  if (deduped.length === 0) {
    throw new AppError('PROCESSING_FAILED', 'No downloadable media was found at that URL.');
  }

  return { formats: deduped, limitations: [...new Set(limitations)] };
}

/** Builds the yt-dlp format selector for a validated selection. */
export function selectorFor(selection: FormatSelection): string {
  if (selection.kind === 'video') {
    const ceiling = Math.round(selection.height * 1.1);
    if (selection.container === 'mp4') {
      // The UI sells MP4 as "plays everywhere", so ask for H.264 + AAC first.
      // yt-dlp's own default prefers newer codecs and would hand back AV1,
      // which many players and older devices cannot decode.
      return [
        `bestvideo[height<=${ceiling}][ext=mp4][vcodec^=avc1]+bestaudio[ext=m4a]`,
        `bestvideo[height<=${ceiling}][ext=mp4]+bestaudio[ext=m4a]`,
        `bestvideo[height<=${ceiling}]+bestaudio`,
        `best[height<=${ceiling}][ext=mp4]`,
        `best[height<=${ceiling}]`,
      ].join('/');
    }
    return [
      `bestvideo[height<=${ceiling}][ext=webm]+bestaudio[ext=webm]`,
      `bestvideo[height<=${ceiling}]+bestaudio`,
      `best[height<=${ceiling}]`,
    ].join('/');
  }

  const byTier: Record<string, string> = {
    best: 'bestaudio/best',
    high: 'bestaudio[abr<=192]/bestaudio/best',
    standard: 'bestaudio[abr<=128]/bestaudio/best',
  };
  return byTier[selection.tier] ?? 'bestaudio/best';
}

export const humanFilesize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 || unit === 0 ? 0 : 1)} ${units[unit]}`;
};
