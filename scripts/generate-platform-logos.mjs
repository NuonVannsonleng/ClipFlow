#!/usr/bin/env node
/**
 * Emits `web/lib/platform-logos.ts` from the `simple-icons` package so the app
 * ships the official brand marks rather than hand-drawn approximations.
 *
 *   node scripts/generate-platform-logos.mjs
 *
 * Only the handful of marks ClipFlow actually shows are inlined, so the app
 * does not carry the full icon set at runtime.
 *
 * Brands that have asked to be removed from simple-icons (LinkedIn, for one)
 * are deliberately absent: PlatformIcon falls back to a neutral monogram for
 * them, which respects the request instead of working around it.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const simpleIcons = require('simple-icons');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outFile = path.join(root, 'web', 'lib', 'platform-logos.ts');

/** ClipFlow platform id -> simple-icons export name. */
const MAP = {
  youtube: 'siYoutube',
  tiktok: 'siTiktok',
  facebook: 'siFacebook',
  instagram: 'siInstagram',
  twitter: 'siX',
  reddit: 'siReddit',
  pinterest: 'siPinterest',
  vimeo: 'siVimeo',
  twitch: 'siTwitch',
  dailymotion: 'siDailymotion',
  soundcloud: 'siSoundcloud',
};

/** The dark theme's card surface (--cf-surface), for contrast checks. */
const DARK_SURFACE = '17171C';

const toRgb = (hex) => [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));

/** WCAG relative luminance. */
function luminance(hex) {
  const channels = toRgb(hex).map((byte) => {
    const value = byte / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

function toHsl([r, g, b]) {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return [0, 0, l];
  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let h;
  if (max === rn) h = ((gn - bn) / delta + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / delta + 2) / 6;
  else h = ((rn - gn) / delta + 4) / 6;
  return [h, s, l];
}

function hslToHex([h, s, l]) {
  const hue = (p, q, t) => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };
  let r;
  let g;
  let b;
  if (s === 0) {
    r = l;
    g = l;
    b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue(p, q, h + 1 / 3);
    g = hue(p, q, h);
    b = hue(p, q, h - 1 / 3);
  }
  return [r, g, b]
    .map((channel) => Math.round(channel * 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/**
 * Keeps the brand hue on dark backgrounds, raising lightness only as far as
 * legibility requires. A mark with no hue at all (X, TikTok) has nothing to
 * preserve, so it becomes near-white.
 */
function darkVariant(hex) {
  if (contrast(hex, DARK_SURFACE) >= 3) return `#${hex}`;
  const [h, s, l] = toHsl(toRgb(hex));
  if (s < 0.15) return '#F2F2F5';
  for (let lightness = l; lightness <= 0.85; lightness += 0.02) {
    const candidate = hslToHex([h, s, lightness]);
    if (contrast(candidate, DARK_SURFACE) >= 3) return `#${candidate}`;
  }
  return '#F2F2F5';
}

const entries = [];
const missing = [];

for (const [id, exportName] of Object.entries(MAP)) {
  const icon = simpleIcons[exportName];
  if (!icon) {
    missing.push(id);
    continue;
  }
  const hex = `#${icon.hex}`;
  // Near-black marks (X, TikTok, Dailymotion) vanish on a dark background.
  const onDark = darkVariant(icon.hex);
  entries.push({ id, title: icon.title, hex, onDark, path: icon.path });
}

const body = `// GENERATED FILE - do not edit by hand.
// Regenerate with: node scripts/generate-platform-logos.mjs
//
// Brand marks come from the simple-icons project. Each logo remains the
// trademark of its owner and is used here only to identify that platform,
// which is nominative use - it does not imply any affiliation or endorsement.

export interface PlatformLogo {
  /** Official brand name, as recorded by simple-icons. */
  title: string;
  /** Brand colour for light backgrounds. */
  hex: string;
  /** Readable substitute when the brand colour is too dark for dark mode. */
  onDark: string;
  /** Single SVG path, drawn in a 24x24 viewBox. */
  path: string;
}

export const PLATFORM_LOGOS: Record<string, PlatformLogo> = {
${entries
  .map(
    (entry) =>
      `  ${entry.id}: {\n    title: ${JSON.stringify(entry.title)},\n    hex: '${entry.hex}',\n    onDark: '${entry.onDark}',\n    path: ${JSON.stringify(entry.path)},\n  },`,
  )
  .join('\n')}
};
`;

await fs.writeFile(outFile, body, 'utf8');

process.stdout.write(`wrote ${path.relative(root, outFile)} with ${entries.length} marks\n`);
for (const entry of entries) {
  process.stdout.write(`  ${entry.id.padEnd(12)} ${entry.hex}${entry.hex === entry.onDark ? '' : ` -> ${entry.onDark} on dark`}\n`);
}
if (missing.length > 0) {
  process.stdout.write(`\nnot in simple-icons (monogram fallback): ${missing.join(', ')}\n`);
}
