import fs from 'node:fs/promises';
import path from 'node:path';
import type { MediaInfo, PlatformDescriptor } from '../../core/types.js';
import { sourceIdFor } from '../url/validator.js';
import { buildFormats, parseFormatId, type RawFormat } from './formats.js';

/**
 * Offline provider for UI development (MEDIA_PROVIDER=mock). It is never used
 * by accident: `auto` falls back to a TOOLS_UNAVAILABLE error rather than
 * quietly serving invented data, and the API advertises `provider: "mock"`
 * so the frontend can show a development banner.
 */

const SAMPLE_RAW: RawFormat[] = [
  { format_id: '18', ext: 'mp4', vcodec: 'avc1.42001E', acodec: 'mp4a.40.2', height: 360, fps: 30, filesize: 12_400_000, tbr: 620 },
  { format_id: '137', ext: 'mp4', vcodec: 'avc1.640028', acodec: 'none', height: 1080, fps: 30, filesize: 78_500_000, tbr: 3900 },
  { format_id: '136', ext: 'mp4', vcodec: 'avc1.4d401f', acodec: 'none', height: 720, fps: 30, filesize: 41_200_000, tbr: 2050 },
  { format_id: '135', ext: 'mp4', vcodec: 'avc1.4d401e', acodec: 'none', height: 480, fps: 30, filesize: 22_100_000, tbr: 1100 },
  { format_id: '248', ext: 'webm', vcodec: 'vp9', acodec: 'none', height: 1080, fps: 30, filesize: 66_800_000, tbr: 3300 },
  { format_id: '247', ext: 'webm', vcodec: 'vp9', acodec: 'none', height: 720, fps: 30, filesize: 33_900_000, tbr: 1690 },
  { format_id: '140', ext: 'm4a', vcodec: 'none', acodec: 'mp4a.40.2', abr: 128, filesize: 8_300_000 },
  { format_id: '251', ext: 'webm', vcodec: 'none', acodec: 'opus', abr: 160, filesize: 10_100_000 },
  { format_id: '249', ext: 'webm', vcodec: 'none', acodec: 'opus', abr: 50, filesize: 3_200_000 },
];

export function analyzeWithMock(url: string, platform: PlatformDescriptor): MediaInfo {
  const durationSeconds = 522;
  const { formats, limitations } = buildFormats({
    raw: SAMPLE_RAW,
    durationSeconds,
    capabilities: { canMux: true, canConvertAudio: true },
    audioOnly: platform.id === 'soundcloud',
  });

  return {
    sourceId: sourceIdFor(url),
    sourceUrl: url,
    platform: platform.id,
    platformName: platform.name,
    title: `Sample ${platform.name} media (mock provider)`,
    uploader: 'ClipFlow Demo',
    thumbnail: undefined,
    durationSeconds,
    isLive: false,
    formats,
    limitations: [...limitations, 'MOCK_PROVIDER'],
    analyzedAt: new Date().toISOString(),
  };
}

export interface MockDownloadInput {
  formatId: string;
  workDir: string;
  signal?: AbortSignal;
  onProgress: (update: { percent: number | null; stage: 'fetching-media' | 'processing' }) => void;
}

export async function downloadWithMock({
  formatId,
  workDir,
  signal,
  onProgress,
}: MockDownloadInput): Promise<{ filePath: string; filesize: number }> {
  const selection = parseFormatId(formatId);
  await fs.mkdir(workDir, { recursive: true });

  for (let percent = 0; percent <= 100; percent += 10) {
    if (signal?.aborted) throw new Error('cancelled');
    onProgress({ percent: Math.min(99, percent), stage: 'fetching-media' });
    await new Promise((resolve) => setTimeout(resolve, 220));
  }
  onProgress({ percent: null, stage: 'processing' });
  await new Promise((resolve) => setTimeout(resolve, 600));

  const container = selection.kind === 'video' ? selection.container : selection.container;
  const filePath = path.join(workDir, `clipflow-sample.${container}`);
  const body = Buffer.from(
    'ClipFlow mock provider placeholder file.\n' +
      'Set MEDIA_PROVIDER=auto and install yt-dlp to produce real media.\n',
    'utf8',
  );
  await fs.writeFile(filePath, body);
  return { filePath, filesize: body.byteLength };
}
