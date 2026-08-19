'use client';

import { platformColor, platformMonogram } from '@/lib/platforms';
import { PLATFORM_LOGOS } from '@/lib/platform-logos';
import type { PlatformId } from '@/lib/types';
import { cn } from '@/lib/utils';

const SIZES = {
  sm: { tile: 'size-7 rounded-[0.5rem]', glyph: 'size-3.5', text: 'text-[0.6875rem]' },
  md: { tile: 'size-10 rounded-[0.7rem]', glyph: 'size-5', text: 'text-[0.8125rem]' },
  lg: { tile: 'size-14 rounded-[0.95rem]', glyph: 'size-7', text: 'text-base' },
} as const;

/**
 * Renders each platform's own mark, tinted onto a soft tile of its brand
 * colour. Marks are used purely to identify the platform — nominative use, no
 * affiliation implied — and are never recoloured beyond the lightness needed
 * to stay legible in dark mode.
 *
 * Platforms with no mark available (LinkedIn asked to be removed from the
 * icon set) fall back to a neutral monogram rather than an imitation.
 */
export function PlatformIcon({
  platform,
  size = 'md',
  className,
}: {
  platform: PlatformId;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const logo = PLATFORM_LOGOS[platform];
  const dimensions = SIZES[size];
  const tint = logo?.hex ?? platformColor(platform);
  const tintOnDark = logo?.onDark ?? platformColor(platform);

  // Decorative: every place this appears already shows the platform name as
  // text, so announcing the mark too would just repeat it.
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        'border border-[color-mix(in_srgb,var(--tint)_26%,transparent)]',
        'bg-[color-mix(in_srgb,var(--tint)_13%,transparent)]',
        'text-[var(--tint)] dark:text-[var(--tint-dark)]',
        'dark:border-[color-mix(in_srgb,var(--tint-dark)_24%,transparent)]',
        'dark:bg-[color-mix(in_srgb,var(--tint-dark)_12%,transparent)]',
        dimensions.tile,
        className,
      )}
      style={{ ['--tint' as string]: tint, ['--tint-dark' as string]: tintOnDark }}
    >
      {logo ? (
        <svg viewBox="0 0 24 24" fill="currentColor" className={dimensions.glyph}>
          <path d={logo.path} />
        </svg>
      ) : (
        <span className={cn('font-semibold tracking-tight', dimensions.text)}>
          {platformMonogram(platform)}
        </span>
      )}
    </span>
  );
}
