import { describe, expect, it } from 'vitest';
import { AppError } from '../../core/errors.js';
import { parseUrl } from './validator.js';

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    if (error instanceof AppError) return error.code;
    throw error;
  }
  throw new Error('expected parseUrl to throw');
}

describe('parseUrl', () => {
  it('rejects an empty URL', () => {
    expect(codeOf(() => parseUrl(''))).toBe('INVALID_URL');
    expect(codeOf(() => parseUrl('   '))).toBe('INVALID_URL');
  });

  it('rejects a URL that is too long', () => {
    const long = `https://youtube.com/watch?v=${'a'.repeat(2048)}`;
    expect(codeOf(() => parseUrl(long))).toBe('INVALID_URL');
  });

  it('rejects an unparsable scheme', () => {
    expect(codeOf(() => parseUrl('javascript:alert(1)'))).toBe('INVALID_URL');
  });

  it('treats a non-http(s) scheme as part of the hostname rather than the protocol', () => {
    // No `https://` prefix is recognised, so the whole string is coerced into
    // the host portion of an `https://` URL - it does not reach a real
    // youtube.com host, so it is correctly rejected, just via a different code.
    expect(codeOf(() => parseUrl('ftp://youtube.com/video'))).toBe('UNSUPPORTED_PLATFORM');
  });

  it('rejects URLs with embedded credentials', () => {
    expect(codeOf(() => parseUrl('https://user:pass@youtube.com/watch?v=1'))).toBe('INVALID_URL');
  });

  it('rejects non-standard ports', () => {
    expect(codeOf(() => parseUrl('https://youtube.com:8443/watch?v=1'))).toBe('INVALID_URL');
  });

  it('accepts standard ports', () => {
    expect(() => parseUrl('https://youtube.com:443/watch?v=1')).not.toThrow();
  });

  it('raises UNSUPPORTED_PLATFORM for an unknown host', () => {
    expect(codeOf(() => parseUrl('https://example.com/video'))).toBe('UNSUPPORTED_PLATFORM');
  });

  it('strips tracking query params while keeping the allowlisted ones', () => {
    const { url } = parseUrl(
      'https://www.youtube.com/watch?v=abc123&list=PL1&utm_source=twitter&si=xyz',
    );
    expect(url.searchParams.get('v')).toBe('abc123');
    expect(url.searchParams.get('list')).toBe('PL1');
    expect(url.searchParams.has('utm_source')).toBe(false);
    expect(url.searchParams.has('si')).toBe(false);
  });

  it('strips the URL fragment', () => {
    const { url } = parseUrl('https://www.youtube.com/watch?v=abc123#t=30s');
    expect(url.hash).toBe('');
  });

  it('detects the platform for a supported host', () => {
    const { platform } = parseUrl('https://www.youtube.com/watch?v=abc123');
    expect(platform.id).toBe('youtube');
  });
});
