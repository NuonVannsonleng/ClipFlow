import Link from 'next/link';
import { cn } from '@/lib/utils';

/** The ClipFlow mark: a play triangle flowing out of a rounded clip shape. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={cn('size-8', className)}>
      <defs>
        <linearGradient id="cf-logo-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--cf-primary)" />
          <stop offset="1" stopColor="var(--cf-accent)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#cf-logo-gradient)" />
      <path d="M13 10.6c0-.85.93-1.37 1.65-.93l7.3 4.4a1.1 1.1 0 0 1 0 1.86l-7.3 4.4A1.1 1.1 0 0 1 13 19.4v-8.8Z" fill="white" />
      <path
        d="M9.4 12.8h1.9M8.2 16h3.1M9.4 19.2h1.9"
        stroke="white"
        strokeOpacity="0.85"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn('group inline-flex items-center gap-2.5 rounded-md', className)}
      aria-label="ClipFlow home"
    >
      <LogoMark className="size-8 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]" />
      <span className="text-[1.0625rem] font-semibold tracking-tight">ClipFlow</span>
    </Link>
  );
}
