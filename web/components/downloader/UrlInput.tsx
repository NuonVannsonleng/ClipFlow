'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, CheckCircle2, ClipboardPaste, Link2, X } from 'lucide-react';
import { forwardRef, useId, useMemo, type KeyboardEvent } from 'react';
import { PlatformIcon } from '@/components/PlatformIcon';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/lib/i18n';
import { checkUrl } from '@/lib/platforms';
import { cn } from '@/lib/utils';

export interface UrlInputProps {
  value: string;
  onChange: (next: string) => void;
  onSubmit?: () => void;
  disabled?: boolean;
  /** Error text from the last analyse attempt, shown under the field. */
  errorText?: string;
  size?: 'md' | 'lg';
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

/**
 * The single most important control on the site: paste, validate, and detect
 * the platform locally so feedback is immediate, with no request needed.
 */
export const UrlInput = forwardRef<HTMLInputElement, UrlInputProps>(function UrlInput(
  { value, onChange, onSubmit, disabled = false, errorText, size = 'lg', placeholder, autoFocus, className },
  ref,
) {
  const { t } = useI18n();
  const { toast } = useToast();
  const inputId = useId();
  const statusId = useId();
  const reduceMotion = useReducedMotion();

  const check = useMemo(() => checkUrl(value), [value]);
  const showInvalid = value.trim().length > 3 && (check.status === 'invalid' || check.status === 'unsupported');

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onChange(text.trim());
    } catch {
      toast(t('url.pasteFailed'), { tone: 'warning' });
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSubmit?.();
    }
    if (event.key === 'Escape' && value) {
      event.preventDefault();
      onChange('');
    }
  };

  const statusMessage =
    errorText ??
    (check.status === 'unsupported'
      ? t('url.unsupported', { host: check.hostname })
      : check.status === 'invalid' && showInvalid
        ? t('url.invalid')
        : check.status === 'detected'
          ? t('url.detected', { platform: check.name })
          : undefined);

  const tone = errorText || showInvalid ? 'error' : check.status === 'detected' ? 'ok' : 'idle';

  return (
    <div className={cn('w-full', className)}>
      <label htmlFor={inputId} className="sr-only">
        {t('url.label')}
      </label>

      <div
        className={cn(
          'group relative flex items-center gap-2 rounded-lg border bg-surface pl-3.5 pr-2 transition-[border-color,box-shadow] duration-200',
          size === 'lg' ? 'h-16 sm:h-[4.25rem]' : 'h-12',
          // Focus reads as a ring plus a soft outward glow, so the field feels
          // lit rather than merely outlined.
          'shadow-sm focus-within:border-primary focus-within:ring-4 focus-within:ring-[var(--cf-ring)]/25',
          'focus-within:shadow-[0_10px_36px_-12px_var(--cf-primary)]',
          tone === 'error' ? 'border-danger/60' : 'border-line',
          disabled && 'opacity-60',
        )}
      >
        <span aria-hidden className="shrink-0 text-subtle">
          <Link2 className={size === 'lg' ? 'size-5' : 'size-4'} />
        </span>

        <input
          id={inputId}
          ref={ref}
          type="url"
          inputMode="url"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- the URL field is the page's primary task
          autoFocus={autoFocus}
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? t('hero.placeholder')}
          aria-describedby={statusMessage ? statusId : undefined}
          aria-invalid={tone === 'error' || undefined}
          className={cn(
            'min-w-0 flex-1 bg-transparent text-fg placeholder:text-subtle focus:outline-none',
            size === 'lg' ? 'text-[0.9375rem] sm:text-base' : 'text-sm',
          )}
        />

        <AnimatePresence initial={false} mode="popLayout">
          {check.status === 'detected' && (
            <motion.span
              key={check.platform}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8, x: 6 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8, x: 6 }}
              transition={{ type: 'spring', stiffness: 520, damping: 30 }}
              className="hidden shrink-0 sm:block"
            >
              <PlatformIcon platform={check.platform} size="sm" />
            </motion.span>
          )}
        </AnimatePresence>

        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            disabled={disabled}
            aria-label={t('url.clearInput')}
            className="shrink-0 rounded-md p-1.5 text-subtle transition-colors hover:bg-sunken hover:text-fg"
          >
            <X className="size-4" />
          </button>
        )}

        <button
          type="button"
          onClick={handlePaste}
          disabled={disabled}
          aria-label={t('url.pasteFromClipboard')}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line bg-sunken font-medium text-muted',
            'transition-colors duration-200 hover:border-line-strong hover:text-fg',
            size === 'lg' ? 'h-10 px-3 text-sm' : 'h-8 px-2.5 text-xs',
          )}
        >
          <ClipboardPaste aria-hidden className="size-4" />
          <span className="hidden sm:inline">{t('common.paste')}</span>
        </button>
      </div>

      {/* Status text is a live region so detection is announced, not just shown. */}
      <div id={statusId} aria-live="polite" className="min-h-[1.5rem] px-1 pt-2">
        <AnimatePresence mode="wait" initial={false}>
          {statusMessage && (
            <motion.p
              key={statusMessage}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              className={cn(
                'inline-flex items-center gap-1.5 text-[0.8125rem] font-medium',
                tone === 'error' ? 'text-danger' : 'text-success',
              )}
            >
              {tone === 'error' ? (
                <AlertCircle aria-hidden className="size-4" />
              ) : (
                <CheckCircle2 aria-hidden className="size-4" />
              )}
              {statusMessage}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});
