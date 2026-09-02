import { describe, expect, it } from 'vitest';
import { classify } from './ytdlp.js';

describe('classify', () => {
  it.each([
    ['ERROR: Private video. Sign in if you have access to this video.', 'PRIVATE_CONTENT'],
    ['ERROR: This video is only available to Music Premium members', 'PROCESSING_FAILED'],
    ['ERROR: Sign in to confirm your age', 'PRIVATE_CONTENT'],
    ['ERROR: This video is DRM protected', 'PLATFORM_RESTRICTED'],
    ['ERROR: Unsupported URL: https://example.com/foo', 'UNSUPPORTED_PLATFORM'],
    ['ERROR: [youtube] abc123: Video unavailable', 'NOT_FOUND'],
    ['ERROR: This video has been removed by the uploader', 'NOT_FOUND'],
    ['ERROR: This video is not available in your country', 'PLATFORM_RESTRICTED'],
    ['ERROR: unable to download video data: HTTP Error 403: Forbidden', 'PLATFORM_RESTRICTED'],
    ['ERROR: HTTP Error 401: Unauthorized', 'PLATFORM_RESTRICTED'],
    ['ERROR: HTTP Error 429: Too Many Requests', 'RATE_LIMITED'],
    ['ERROR: We are being rate limited by the platform', 'RATE_LIMITED'],
    ['ERROR: [download] Got error: The read operation timed out', 'NETWORK_ERROR'],
    ['ERROR: <urlopen error [Errno 11001] getaddrinfo failed: failed to resolve>', 'NETWORK_ERROR'],
    ['ERROR: File is larger than max-filesize (1024.0MiB > 100.0MiB)', 'FILE_TOO_LARGE'],
    ['ERROR: Something completely unexpected happened', 'PROCESSING_FAILED'],
  ] as const)('maps %j to %s', (output, code) => {
    expect(classify(output).code).toBe(code);
  });
});
