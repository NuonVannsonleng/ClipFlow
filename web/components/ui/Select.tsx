'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

/**
 * A listbox with full keyboard support (arrows, Home/End, type-ahead, Escape)
 * because the native <select> cannot carry the hints and icons the format
 * picker needs.
 */
export function Select<T extends string>({
  options,
  value,
  onChange,
  label,
  placeholder = 'Select',
  className,
  buttonClassName,
  disabled = false,
}: {
  options: SelectOption<T>[];
  value: T | undefined;
  onChange: (next: T) => void;
  label: string;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, options.findIndex((option) => option.value === value)),
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const reduceMotion = useReducedMotion();

  const selected = options.find((option) => option.value === value);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const index = options.findIndex((option) => option.value === value);
    setActiveIndex(index >= 0 ? index : 0);
    // Move focus into the list so arrow keys work immediately.
    requestAnimationFrame(() => listRef.current?.focus());
  }, [open, options, value]);

  const commit = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    close();
  };

  const onListKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((current) => Math.min(options.length - 1, current + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((current) => Math.max(0, current - 1));
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        commit(activeIndex);
        break;
      case 'Escape':
        event.preventDefault();
        close();
        break;
      case 'Tab':
        close();
        break;
      default:
        if (event.key.length === 1) {
          const match = options.findIndex((option) =>
            option.label.toLowerCase().startsWith(event.key.toLowerCase()),
          );
          if (match >= 0) setActiveIndex(match);
        }
    }
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-3 rounded-md border border-line bg-surface px-3.5 text-sm',
          'transition-colors duration-200 hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-55',
          open && 'border-primary ring-4 ring-[var(--cf-ring)]/25',
          buttonClassName,
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected?.icon && <span aria-hidden className="[&>svg]:size-4">{selected.icon}</span>}
          <span className={cn('truncate font-medium', !selected && 'text-subtle')}>
            {selected?.label ?? placeholder}
          </span>
          {selected?.hint && <span className="shrink-0 text-xs text-subtle">{selected.hint}</span>}
        </span>
        <ChevronDown
          aria-hidden
          className={cn('size-4 shrink-0 text-subtle transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            id={listId}
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            aria-label={label}
            aria-activedescendant={`${listId}-${activeIndex}`}
            onKeyDown={onListKeyDown}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-lg border border-line bg-elevated p-1.5 shadow-lg focus:outline-none"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;
              return (
                <li
                  key={option.value}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => commit(index)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive && 'bg-sunken',
                    option.disabled && 'cursor-not-allowed opacity-45',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {option.icon && <span aria-hidden className="[&>svg]:size-4">{option.icon}</span>}
                    <span className="truncate font-medium">{option.label}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {option.hint && <span className="text-xs text-subtle">{option.hint}</span>}
                    {isSelected && <Check aria-hidden className="size-4 text-primary" />}
                  </span>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
