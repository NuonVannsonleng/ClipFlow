import { describe, expect, it } from 'vitest';
import { AppError } from '../../core/errors.js';
import { assertPublicHost, isPrivateAddress } from './ssrf.js';

describe('isPrivateAddress', () => {
  it('flags loopback addresses', () => {
    expect(isPrivateAddress('127.0.0.1')).toBe(true);
    expect(isPrivateAddress('::1')).toBe(true);
  });

  it('flags RFC1918 private ranges', () => {
    expect(isPrivateAddress('10.0.0.1')).toBe(true);
    expect(isPrivateAddress('172.16.0.1')).toBe(true);
    expect(isPrivateAddress('172.31.255.255')).toBe(true);
    expect(isPrivateAddress('192.168.1.1')).toBe(true);
  });

  it('does not flag addresses just outside the 172.16/12 range', () => {
    expect(isPrivateAddress('172.15.255.255')).toBe(false);
    expect(isPrivateAddress('172.32.0.0')).toBe(false);
  });

  it('flags link-local addresses', () => {
    expect(isPrivateAddress('169.254.1.1')).toBe(true);
    expect(isPrivateAddress('fe80::1')).toBe(true);
  });

  it('flags CGNAT addresses', () => {
    expect(isPrivateAddress('100.64.0.1')).toBe(true);
    expect(isPrivateAddress('100.127.255.255')).toBe(true);
  });

  it('does not flag addresses just outside the CGNAT range', () => {
    expect(isPrivateAddress('100.63.255.255')).toBe(false);
    expect(isPrivateAddress('100.128.0.0')).toBe(false);
  });

  it('flags IPv4-mapped IPv6 private addresses', () => {
    expect(isPrivateAddress('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivateAddress('::ffff:10.0.0.5')).toBe(true);
    expect(isPrivateAddress('::ffff:192.168.0.1')).toBe(true);
  });

  it('does not flag ordinary public addresses', () => {
    expect(isPrivateAddress('8.8.8.8')).toBe(false);
    expect(isPrivateAddress('1.1.1.1')).toBe(false);
    expect(isPrivateAddress('::ffff:8.8.8.8')).toBe(false);
  });

  it('treats unparsable strings as private (fail closed)', () => {
    expect(isPrivateAddress('not-an-ip')).toBe(true);
  });
});

describe('assertPublicHost', () => {
  it('rejects localhost and its subdomains', async () => {
    await expect(assertPublicHost('localhost')).rejects.toThrow(AppError);
    await expect(assertPublicHost('foo.localhost')).rejects.toThrow(AppError);
  });

  it('rejects .local and .internal hostnames', async () => {
    await expect(assertPublicHost('printer.local')).rejects.toThrow(AppError);
    await expect(assertPublicHost('service.internal')).rejects.toThrow(AppError);
  });

  it('rejects a literal private IPv4 address without a DNS lookup', async () => {
    await expect(assertPublicHost('127.0.0.1')).rejects.toThrow(AppError);
    await expect(assertPublicHost('10.0.0.1')).rejects.toThrow(AppError);
  });

  it('resolves for a literal public IPv4 address without a DNS lookup', async () => {
    await expect(assertPublicHost('8.8.8.8')).resolves.toBeUndefined();
  });
});
