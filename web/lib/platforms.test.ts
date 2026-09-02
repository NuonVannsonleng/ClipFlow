import { describe, expect, it } from 'vitest';
import { checkUrl } from './platforms';

describe('checkUrl', () => {
  it('returns empty for blank input', () => {
    expect(checkUrl('')).toEqual({ status: 'empty' });
    expect(checkUrl('   ')).toEqual({ status: 'empty' });
  });

  it('returns invalid for unparsable input', () => {
    expect(checkUrl('not a url')).toEqual({ status: 'invalid' });
  });

  it('returns unsupported for a valid but unknown host', () => {
    const result = checkUrl('https://example.com/video');
    expect(result.status).toBe('unsupported');
    if (result.status === 'unsupported') {
      expect(result.hostname).toBe('example.com');
    }
  });

  it('detects youtube.com/watch URLs', () => {
    const result = checkUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(result).toEqual({ status: 'detected', platform: 'youtube', name: 'YouTube' });
  });

  it('detects youtu.be short URLs', () => {
    const result = checkUrl('https://youtu.be/dQw4w9WgXcQ');
    expect(result).toEqual({ status: 'detected', platform: 'youtube', name: 'YouTube' });
  });

  it('detects tiktok.com URLs', () => {
    const result = checkUrl('https://www.tiktok.com/@user/video/1234567890');
    expect(result).toEqual({ status: 'detected', platform: 'tiktok', name: 'TikTok' });
  });
});
