import dns from 'node:dns/promises';
import net from 'node:net';
import { env } from '../../config/env.js';
import { AppError } from '../../core/errors.js';

/** RFC1918 / loopback / link-local / CGNAT / unique-local ranges. */
function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;
  const [a = 0, b = 0] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;            // link-local
  if (a === 172 && b >= 16 && b <= 31) return true;   // private
  if (a === 192 && b === 168) return true;            // private
  if (a === 192 && b === 0) return true;              // IETF protocol assignments
  if (a === 100 && b >= 64 && b <= 127) return true;  // CGNAT
  if (a >= 224) return true;                          // multicast + reserved
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const address = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (address === '::' || address === '::1') return true;
  if (address.startsWith('fe80')) return true;               // link-local
  if (/^f[cd]/.test(address)) return true;                   // unique local
  if (address.startsWith('ff')) return true;                 // multicast
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) return isPrivateIpv4(mapped[1]);
  return false;
}

export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateIpv4(ip);
  if (net.isIPv6(ip)) return isPrivateIpv6(ip);
  return true;
}

/**
 * Resolves the hostname and rejects anything that points at the server's own
 * network. Called before a URL is ever handed to the media tooling.
 */
export async function assertPublicHost(hostname: string): Promise<void> {
  if (env.allowPrivateAddresses) return;

  const host = hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new AppError('INVALID_URL', 'The URL points to a private network address.');
  }

  if (net.isIP(host) !== 0) {
    if (isPrivateAddress(host)) {
      throw new AppError('INVALID_URL', 'The URL points to a private network address.');
    }
    return;
  }

  let records: { address: string }[];
  try {
    records = await dns.lookup(host, { all: true, verbatim: true });
  } catch {
    throw new AppError('NETWORK_ERROR', 'The host in that URL could not be resolved.');
  }

  if (records.length === 0) {
    throw new AppError('NETWORK_ERROR', 'The host in that URL could not be resolved.');
  }
  if (records.some((record) => isPrivateAddress(record.address))) {
    throw new AppError('INVALID_URL', 'The URL points to a private network address.');
  }
}
