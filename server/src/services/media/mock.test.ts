import { describe, expect, it } from 'vitest';
import { getPlatform } from '../url/platforms.js';
import { analyzeWithMock } from './mock.js';

describe('analyzeWithMock', () => {
  it('produces both video and audio formats for a platform with both capabilities', () => {
    const youtube = getPlatform('youtube')!;
    const info = analyzeWithMock('https://youtube.com/watch?v=abc', youtube);

    expect(info.formats.some((format) => format.kind === 'video')).toBe(true);
    expect(info.formats.some((format) => format.kind === 'audio')).toBe(true);
    expect(info.platform).toBe('youtube');
    expect(info.sourceUrl).toBe('https://youtube.com/watch?v=abc');
  });

  it('produces audio-only output for soundcloud', () => {
    const soundcloud = getPlatform('soundcloud')!;
    const info = analyzeWithMock('https://soundcloud.com/artist/track', soundcloud);

    expect(info.formats.length).toBeGreaterThan(0);
    expect(info.formats.every((format) => format.kind === 'audio')).toBe(true);
  });
});
