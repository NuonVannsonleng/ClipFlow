import type { PlatformDescriptor, PlatformId } from './types';

/**
 * Mirrors `server/src/services/url/platforms.ts` so the input can show
 * "YouTube detected" the instant a URL is pasted, without a round trip. The
 * server stays the authority: /api/platforms is fetched on the platforms page
 * and whenever a URL is actually analysed.
 */
export const PLATFORMS: (PlatformDescriptor & { monogram: string })[] = [
  { id: 'youtube', name: 'YouTube', monogram: 'YT', color: '#FF0033', status: 'supported', capabilities: ['video', 'audio', 'public-only'], hosts: ['youtube.com', 'youtu.be', 'm.youtube.com', 'music.youtube.com'] },
  { id: 'tiktok', name: 'TikTok', monogram: 'TT', color: '#00C4CC', status: 'supported', capabilities: ['video', 'public-only'], hosts: ['tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'] },
  { id: 'facebook', name: 'Facebook', monogram: 'FB', color: '#0866FF', status: 'limited', capabilities: ['video', 'public-only'], hosts: ['facebook.com', 'fb.watch', 'm.facebook.com'] },
  { id: 'instagram', name: 'Instagram', monogram: 'IG', color: '#E1306C', status: 'limited', capabilities: ['video', 'public-only'], hosts: ['instagram.com'] },
  { id: 'twitter', name: 'X / Twitter', monogram: 'X', color: '#1D9BF0', status: 'limited', capabilities: ['video', 'public-only'], hosts: ['x.com', 'twitter.com', 'mobile.twitter.com'] },
  { id: 'reddit', name: 'Reddit', monogram: 'RD', color: '#FF4500', status: 'supported', capabilities: ['video', 'audio', 'public-only'], hosts: ['reddit.com', 'v.redd.it', 'redd.it', 'old.reddit.com'] },
  { id: 'pinterest', name: 'Pinterest', monogram: 'PI', color: '#E60023', status: 'limited', capabilities: ['video', 'public-only'], hosts: ['pinterest.com', 'pin.it'] },
  { id: 'vimeo', name: 'Vimeo', monogram: 'VM', color: '#1AB7EA', status: 'supported', capabilities: ['video', 'audio', 'public-only'], hosts: ['vimeo.com', 'player.vimeo.com'] },
  { id: 'twitch', name: 'Twitch', monogram: 'TW', color: '#9146FF', status: 'supported', capabilities: ['video', 'audio', 'public-only'], hosts: ['twitch.tv', 'clips.twitch.tv'] },
  { id: 'dailymotion', name: 'Dailymotion', monogram: 'DM', color: '#0EA5E9', status: 'supported', capabilities: ['video', 'audio', 'public-only'], hosts: ['dailymotion.com', 'dai.ly'] },
  { id: 'linkedin', name: 'LinkedIn', monogram: 'IN', color: '#0A66C2', status: 'limited', capabilities: ['video', 'public-only'], hosts: ['linkedin.com'] },
  { id: 'soundcloud', name: 'SoundCloud', monogram: 'SC', color: '#FF5500', status: 'supported', capabilities: ['audio', 'public-only'], hosts: ['soundcloud.com'] },
];

const byId = new Map(PLATFORMS.map((platform) => [platform.id, platform]));

export const getPlatformMeta = (id: PlatformId) => byId.get(id);

export const platformColor = (id: PlatformId): string => byId.get(id)?.color ?? '#7C7CF0';

export const platformMonogram = (id: PlatformId): string =>
  byId.get(id)?.monogram ?? id.slice(0, 2).toUpperCase();

export const platformLabel = (id: PlatformId): string => byId.get(id)?.name ?? 'Unknown';

export type UrlCheck =
  | { status: 'empty' }
  | { status: 'invalid' }
  | { status: 'unsupported'; hostname: string }
  | { status: 'detected'; platform: PlatformId; name: string };

/** Same normalisation rules as the server, minus the DNS lookup. */
export function checkUrl(rawInput: string): UrlCheck {
  const trimmed = rawInput.trim();
  if (!trimmed) return { status: 'empty' };

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return { status: 'invalid' };
  }

  if (!/^https?:$/.test(url.protocol) || !url.hostname.includes('.')) {
    return { status: 'invalid' };
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const match = PLATFORMS.find((platform) =>
    platform.hosts.some((known) => {
      const bare = known.replace(/^www\./, '');
      return host === bare || host.endsWith(`.${bare}`);
    }),
  );

  if (!match) return { status: 'unsupported', hostname: url.hostname };
  return { status: 'detected', platform: match.id, name: match.name };
}
