import { describe, expect, it } from 'vitest';
import { PLATFORMS, detectPlatform } from './platforms.js';

describe('detectPlatform', () => {
  it('resolves every registered platform by its primary host', () => {
    for (const platform of PLATFORMS) {
      const primaryHost = platform.hosts[0]!;
      expect(detectPlatform(primaryHost)?.id).toBe(platform.id);
    }
  });

  it('matches subdomains of a known host', () => {
    expect(detectPlatform('m.youtube.com')?.id).toBe('youtube');
    expect(detectPlatform('www.m.youtube.com')?.id).toBe('youtube');
  });

  it('is case-insensitive', () => {
    expect(detectPlatform('YouTube.com')?.id).toBe('youtube');
  });

  it('does not match a lookalike host with the known host as a suffix of a longer label', () => {
    expect(detectPlatform('youtube.com.evil.tld')).toBeUndefined();
    expect(detectPlatform('evilyoutube.com')).toBeUndefined();
    expect(detectPlatform('notyoutube.com')).toBeUndefined();
  });

  it('returns undefined for an unknown host', () => {
    expect(detectPlatform('example.com')).toBeUndefined();
  });
});
