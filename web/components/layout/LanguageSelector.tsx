'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Globe } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { LANGUAGES, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** Switching writes to settings state, so every string re-renders in place. */
export function LanguageSelector({ className }: { className?: string }) {
  const { language, setLanguage, t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const active = LANGUAGES.find((item) => item.id === language);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('nav.language')}
        className="inline-flex h-10 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-sm font-medium text-muted transition-colors duration-200 hover:border-line-strong hover:text-fg"
      >
        <Globe aria-hidden className="size-4" />
        <span className="uppercase">{language}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label={t('nav.language')}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-lg border border-line bg-elevated p-1.5 shadow-lg"
          >
            {LANGUAGES.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={item.id === language}
                  onClick={() => {
                    setLanguage(item.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-sunken"
                >
                  <span className="font-medium">{item.native}</span>
                  {item.id === language && <Check aria-hidden className="size-4 text-primary" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
