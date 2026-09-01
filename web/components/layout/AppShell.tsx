'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';
import { Providers } from '@/app/providers';
import { useI18n } from '@/lib/i18n';
import { Footer } from './Footer';
import { Header } from './Header';

function SkipLink() {
  const { t } = useI18n();
  return (
    <a
      href="#main"
      className="skip-link rounded-md border border-line bg-elevated px-4 py-2 text-sm font-medium shadow-md"
    >
      {t('nav.skipToContent')}
    </a>
  );
}

/**
 * Restores scroll as the incoming page mounts.
 *
 * `mode="wait"` holds the new page back until the old one has animated out,
 * so Next's own scroll handling runs while the previous — possibly far
 * taller — document is still on screen. Landing on a short page such as
 * /downloader then leaves you partway down it, and a cross-route link like
 * /#pricing never reaches its section. Mounting with the new page is the
 * first moment the real offsets exist.
 *
 * Rendered inside the keyed <main>, so it remounts once per navigation.
 */
function RouteScroll({ skipTop }: { skipTop: boolean }) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const hash = window.location.hash;

    if (hash.length > 1) {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target) {
        // A frame so the entering page has been laid out before measuring.
        const frame = requestAnimationFrame(() =>
          target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }),
        );
        return () => cancelAnimationFrame(frame);
      }
    }

    // Never fight the browser's own restoration on the very first paint.
    if (!skipTop) window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    return undefined;
  }, [skipTop, reduceMotion]);

  return null;
}

function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const firstRender = useRef(true);

  useEffect(() => {
    firstRender.current = false;
  }, []);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.main
        key={pathname}
        id="main"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1"
      >
        <RouteScroll skipTop={firstRender.current} />
        {children}
      </motion.main>
    </AnimatePresence>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <div className="flex min-h-dvh flex-col">
        <SkipLink />
        <Header />
        <PageTransition>{children}</PageTransition>
        <Footer />
      </div>
    </Providers>
  );
}
