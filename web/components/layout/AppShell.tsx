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
 * Next's own scroll handling can run before the incoming page has laid
 * out — the previous, possibly far taller, document may still be what the
 * browser measures against. Landing on a short page such as /downloader
 * then leaves you partway down it, and a cross-route link like /#pricing
 * never reaches its section. Mounting with the new page is the first
 * moment its real offsets exist, so scroll restoration happens here
 * rather than eagerly during the route change.
 *
 * Rendered inside the keyed inner div, so it remounts once per navigation.
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
    // <main id="main"> stays a single, unkeyed element for the life of the
    // app: it is both the skip-link's target and the page's only "main"
    // landmark, so it must never be duplicated. The pathname-keyed animation
    // lives on an *inner* div instead - keying the landmark itself briefly
    // produced two elements sharing id="main" (invalid HTML, and two live
    // main landmarks mid-navigation), and independently confused popLayout's
    // exit bookkeeping into animating two copies of the incoming page against
    // each other rather than a clean outgoing/incoming crossfade.
    //
    // popLayout still overlaps the crossfade instead of serialising it -
    // mode="wait" left a real blank gap between pages, worse than the
    // animation duration alone once a first-time route visit's compile cost
    // in dev landed inside that same window.
    <main id="main" className="relative flex-1">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={pathname}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <RouteScroll skipTop={firstRender.current} />
          {children}
        </motion.div>
      </AnimatePresence>
    </main>
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
