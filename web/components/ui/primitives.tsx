'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useRef, type HTMLAttributes, type MouseEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/* --------------------------------------------------------------- Card ---- */

export function Card({
  className,
  interactive = false,
  spotlight = false,
  onMouseMove,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
  /**
   * A soft radial glow that follows the cursor, tinted with the brand hue.
   * Pure CSS after the initial move — a mousemove handler only writes two
   * custom properties, so there is no per-frame React render. Implies
   * `interactive`. Skips the cursor tracking under reduced motion, but keeps
   * the plain hover lift so the card still responds to touch.
   */
  spotlight?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (event: MouseEvent<HTMLDivElement>) => {
    onMouseMove?.(event);
    if (reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    ref.current.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
    ref.current.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={spotlight ? handleMove : onMouseMove}
      className={cn(
        'relative rounded-xl border border-line bg-surface shadow-sm',
        (interactive || spotlight) &&
          'group transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md',
        spotlight && 'overflow-hidden',
        className,
      )}
      {...props}
    >
      {spotlight && !reduceMotion && (
        // Absolutely positioned, so it never becomes a flex/grid item and
        // cannot disturb a caller's own `flex flex-col gap-*` on the card.
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              'radial-gradient(420px circle at var(--spot-x, 50%) var(--spot-y, 50%), color-mix(in srgb, var(--cf-primary) 14%, transparent), transparent 72%)',
          }}
        />
      )}
      {children}
    </div>
  );
}

/* -------------------------------------------------------------- Badge ---- */

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'accent';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-sunken text-muted border-line',
  primary: 'bg-primary-soft text-primary border-transparent',
  success: 'bg-success-soft text-success border-transparent',
  warning: 'bg-warning-soft text-warning border-transparent',
  danger: 'bg-danger-soft text-danger border-transparent',
  accent: 'bg-accent-soft text-accent border-transparent',
};

export function Badge({
  tone = 'neutral',
  className,
  icon,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium leading-none',
        BADGE_TONES[tone],
        className,
      )}
    >
      {icon && <span aria-hidden className="[&>svg]:size-3.5">{icon}</span>}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------ Progress ---- */

export function Progress({
  value,
  label,
  className,
}: {
  /** 0-100, or null for an indeterminate bar. */
  value: number | null;
  label?: string;
  className?: string;
}) {
  const indeterminate = value === null;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round(value)}
      aria-valuetext={indeterminate ? label : `${Math.round(value)}%`}
      aria-label={label}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-sunken', className)}
    >
      {indeterminate ? (
        <div className="cf-indeterminate absolute inset-y-0 left-0 w-full rounded-full bg-gradient-to-r from-primary/40 via-primary to-accent" />
      ) : (
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(2, Math.min(100, value))}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 24 }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------- Spinner ---- */

export function Dots({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} aria-hidden>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="size-2 rounded-full bg-primary"
          style={{ animation: `cf-pulse-dot 1.2s ${index * 0.16}s ease-in-out infinite` }}
        />
      ))}
    </span>
  );
}

/* ------------------------------------------------------------ Skeleton ---- */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('cf-shimmer relative overflow-hidden rounded-md bg-sunken', className)} />
  );
}

/* -------------------------------------------------------------- Switch ---- */

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  id: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <label htmlFor={id} className={cn('block text-sm font-medium', disabled && 'opacity-60')}>
          {label}
        </label>
        {description && <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors duration-200',
          checked ? 'border-transparent bg-primary' : 'border-line-strong bg-sunken',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <motion.span
          layout={!reduceMotion}
          transition={{ type: 'spring', stiffness: 500, damping: 34 }}
          className={cn(
            'absolute top-1/2 size-4.5 -translate-y-1/2 rounded-full bg-white shadow-sm',
            checked ? 'left-[calc(100%-1.375rem)]' : 'left-1',
          )}
        />
      </button>
    </div>
  );
}

/* --------------------------------------------------------- Segmented ---- */

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
  className,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex w-full items-center gap-1 rounded-lg border border-line bg-sunken p-1',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex flex-1 items-center justify-center gap-1.5 rounded-md font-medium transition-colors duration-200',
              size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3 text-[0.8125rem]',
              active ? 'text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {active && (
              <motion.span
                layoutId={`segmented-${ariaLabel}`}
                transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                className="absolute inset-0 rounded-md border border-line bg-surface shadow-xs"
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5 [&>svg]:size-3.5">
              {option.icon}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------ Checkbox ---- */

export function CheckPill({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-5 items-center justify-center rounded-full border transition-colors',
        checked ? 'border-transparent bg-primary text-primary-fg' : 'border-line-strong text-transparent',
        className,
      )}
    >
      <Check className="size-3" strokeWidth={3} />
    </span>
  );
}

/* --------------------------------------------------------- Section head -- */

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'center' | 'left';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        align === 'center' ? 'items-center text-center' : 'items-start text-left',
        className,
      )}
    >
      {eyebrow && (
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          {eyebrow}
        </span>
      )}
      <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {subtitle && (
        <p className={cn('text-pretty text-[0.9375rem] leading-relaxed text-muted', align === 'center' && 'max-w-2xl')}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
