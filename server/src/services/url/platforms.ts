import type { PlatformDescriptor, PlatformId } from '../../core/types.js';

/**
 * The registry is deliberately conservative: `status: 'limited'` marks
 * platforms that frequently refuse anonymous access, so the UI can say so up
 * front instead of promising support we cannot deliver.
 */
export const PLATFORMS: PlatformDescriptor[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    hosts: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'music.youtube.com'],
    capabilities: ['video', 'audio', 'public-only'],
    status: 'supported',
    color: '#FF0033',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    hosts: ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com', 'm.tiktok.com'],
    capabilities: ['video', 'public-only'],
    status: 'supported',
    color: '#25F4EE',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    hosts: ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.watch', 'web.facebook.com'],
    capabilities: ['video', 'public-only'],
    status: 'limited',
    note: 'Only posts that are public without a login.',
    color: '#0866FF',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    hosts: ['instagram.com', 'www.instagram.com', 'ddinstagram.com'],
    capabilities: ['video', 'public-only'],
    status: 'limited',
    note: 'Instagram often requires a session; public reels may still fail.',
    color: '#E1306C',
  },
  {
    id: 'twitter',
    name: 'X / Twitter',
    hosts: ['twitter.com', 'www.twitter.com', 'x.com', 'www.x.com', 'mobile.twitter.com'],
    capabilities: ['video', 'public-only'],
    status: 'limited',
    note: 'Public posts only; age-restricted posts are not processed.',
    color: '#1D9BF0',
  },
  {
    id: 'reddit',
    name: 'Reddit',
    hosts: ['reddit.com', 'www.reddit.com', 'old.reddit.com', 'v.redd.it', 'redd.it'],
    capabilities: ['video', 'audio', 'public-only'],
    status: 'supported',
    note: 'Reddit stores video and audio separately — merging needs FFmpeg.',
    color: '#FF4500',
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    hosts: ['pinterest.com', 'www.pinterest.com', 'pin.it', 'pinterest.ca', 'pinterest.co.uk'],
    capabilities: ['video', 'public-only'],
    status: 'limited',
    color: '#E60023',
  },
  {
    id: 'vimeo',
    name: 'Vimeo',
    hosts: ['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'],
    capabilities: ['video', 'audio', 'public-only'],
    status: 'supported',
    note: 'Password-protected and private videos are not processed.',
    color: '#1AB7EA',
  },
  {
    id: 'twitch',
    name: 'Twitch',
    hosts: ['twitch.tv', 'www.twitch.tv', 'clips.twitch.tv', 'm.twitch.tv'],
    capabilities: ['video', 'audio', 'public-only'],
    status: 'supported',
    note: 'Clips and past broadcasts. Live streams are not processed.',
    color: '#9146FF',
  },
  {
    id: 'dailymotion',
    name: 'Dailymotion',
    hosts: ['dailymotion.com', 'www.dailymotion.com', 'dai.ly'],
    capabilities: ['video', 'audio', 'public-only'],
    status: 'supported',
    color: '#0EA5E9',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    hosts: ['linkedin.com', 'www.linkedin.com'],
    capabilities: ['video', 'public-only'],
    status: 'limited',
    note: 'Only posts that are viewable while signed out.',
    color: '#0A66C2',
  },
  {
    id: 'soundcloud',
    name: 'SoundCloud',
    hosts: ['soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com'],
    capabilities: ['audio', 'public-only'],
    status: 'supported',
    note: 'Only tracks the artist has made publicly downloadable/streamable.',
    color: '#FF5500',
  },
];

const byHost = new Map<string, PlatformDescriptor>();
for (const platform of PLATFORMS) {
  for (const host of platform.hosts) byHost.set(host.toLowerCase(), platform);
}

export function detectPlatform(hostname: string): PlatformDescriptor | undefined {
  const host = hostname.toLowerCase().replace(/^\.+/, '');
  const direct = byHost.get(host);
  if (direct) return direct;
  // Match subdomains such as `www.m.youtube.com` without matching `youtube.com.evil.tld`.
  for (const [knownHost, platform] of byHost) {
    if (host.endsWith(`.${knownHost}`)) return platform;
  }
  return undefined;
}

export function getPlatform(id: PlatformId): PlatformDescriptor | undefined {
  return PLATFORMS.find((platform) => platform.id === id);
}

export const platformName = (id: PlatformId): string => getPlatform(id)?.name ?? 'Unknown';
