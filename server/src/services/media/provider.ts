import { env } from '../../config/env.js';
import { AppError } from '../../core/errors.js';
import type { MediaInfo, PlatformDescriptor } from '../../core/types.js';
import { getCapabilities } from './capabilities.js';
import { analyzeWithMock, downloadWithMock } from './mock.js';
import { analyzeWithYtdlp, downloadWithYtdlp } from './ytdlp.js';

export interface ProgressUpdate {
  percent: number | null;
  stage: 'fetching-media' | 'processing';
}

/**
 * Single seam between the HTTP layer and whichever media backend is active.
 * Nothing above this file knows that yt-dlp exists.
 */
export const mediaProvider = {
  async analyze(url: string, platform: PlatformDescriptor): Promise<MediaInfo> {
    if (env.provider === 'mock') return analyzeWithMock(url, platform);

    const capabilities = await getCapabilities();
    if (!capabilities.ytdlp) {
      throw new AppError(
        'TOOLS_UNAVAILABLE',
        'The media service is not available on this server right now.',
      );
    }
    return analyzeWithYtdlp({ url, platform });
  },

  async download(input: {
    url: string;
    formatId: string;
    workDir: string;
    signal?: AbortSignal;
    onProgress: (update: ProgressUpdate) => void;
  }): Promise<{ filePath: string; filesize: number }> {
    if (env.provider === 'mock') {
      return downloadWithMock({
        formatId: input.formatId,
        workDir: input.workDir,
        signal: input.signal,
        onProgress: input.onProgress,
      });
    }
    return downloadWithYtdlp(input);
  },
};
