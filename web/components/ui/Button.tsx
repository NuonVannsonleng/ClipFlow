'use client';

import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-fg shadow-[0_6px_20px_-6px_var(--cf-primary)] hover:bg-primary-hover disabled:hover:bg-primary',
  secondary:
    'bg-elevated text-fg border border-line hover:border-line-strong hover:bg-sunken shadow-xs',
  outline: 'border border-line-strong text-fg hover:bg-sunken',
  ghost: 'text-muted hover:text-fg hover:bg-sunken',
  danger: 'bg-danger text-white hover:brightness-110 shadow-[0_6px_20px_-8px_var(--cf-danger)]',
  success: 'bg-success text-white hover:brightness-110 shadow-[0_6px_20px_-8px_var(--cf-success)]',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-[0.8125rem] gap-1.5 rounded-sm',
  md: 'h-11 px-5 text-sm gap-2 rounded-md',
  lg: 'h-12 px-6 text-[0.9375rem] gap-2 rounded-md',
  xl: 'h-14 px-8 text-base gap-2.5 rounded-lg',
  icon: 'h-10 w-10 rounded-md',
};

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  children?: ReactNode;
}

/**
 * The lift-on-hover is deliberately small (1px) and disabled when the user
 * asks for reduced motion.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    leadingIcon,
    trailingIcon,
    className,
    disabled,
    children,
    ...props
  },
  ref,
) {
  const reduceMotion = useReducedMotion();
  const isDisabled = disabled || loading;

  return (
    <motion.button
      ref={ref}
      type="button"
      disabled={isDisabled}
      aria-busy={loading || undefined}
      whileHover={isDisabled || reduceMotion ? undefined : { y: -1 }}
      whileTap={isDisabled || reduceMotion ? undefined : { y: 0, scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 480, damping: 30 }}
      className={cn(
        // A button label never wraps: it either fits or the row stacks.
        'relative inline-flex select-none items-center justify-center whitespace-nowrap font-medium',
        'transition-[background-color,border-color,color,box-shadow,filter] duration-200',
        'disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 aria-hidden className="size-4 animate-spin" />
      ) : (
        leadingIcon && <span aria-hidden className="shrink-0">{leadingIcon}</span>
      )}
      {children}
      {trailingIcon && !loading && <span aria-hidden className="shrink-0">{trailingIcon}</span>}
    </motion.button>
  );
});
