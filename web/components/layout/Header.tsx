'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, History, Menu, Settings as SettingsIcon, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { LanguageSelector } from './LanguageSelector';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

interface NavItem {
  href: string;
  labelKey: string;
}

const NAV: NavItem[] = [
  { href: '/', labelKey: 'nav.home' },
  { href: '/downloader', labelKey: 'nav.downloader' },
  { href: '/platforms', labelKey: 'nav.platformsShort' },
  { href: '/#features', labelKey: 'nav.features' },
  { href: '/#faq', labelKey: 'nav.faq' },
];

export function Header() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu on navigation and lock the page behind it.
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href.split('#')[0] ?? href) && href !== '/';

  return (
    <header
      className={cn(
        'sticky top-0 z-[70] w-full border-b transition-[background-color,border-color,box-shadow] duration-300',
        scrolled ? 'glass border-line shadow-xs' : 'border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={cn(
                'relative rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200',
                isActive(item.href) ? 'text-fg' : 'text-muted hover:text-fg',
              )}
            >
              {isActive(item.href) && (
                <motion.span
                  layoutId="nav-active"
                  transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-md bg-sunken"
                />
              )}
              <span className="relative z-10">{t(item.labelKey)}</span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/history"
            aria-label={t('nav.history')}
            title={t('nav.history')}
            className="hidden size-10 items-center justify-center rounded-md border border-line bg-surface text-muted transition-colors duration-200 hover:border-line-strong hover:text-fg sm:inline-flex"
          >
            <History className="size-4.5" />
          </Link>
          <Link
            href="/settings"
            aria-label={t('nav.settings')}
            title={t('nav.settings')}
            className="hidden size-10 items-center justify-center rounded-md border border-line bg-surface text-muted transition-colors duration-200 hover:border-line-strong hover:text-fg sm:inline-flex"
          >
            <SettingsIcon className="size-4.5" />
          </Link>
          <LanguageSelector className="hidden sm:block" />
          <ThemeToggle />

          <Link href="/downloader" className="hidden lg:block">
            <Button size="md" trailingIcon={<ArrowRight className="size-4" />} tabIndex={-1}>
              {t('nav.start')}
            </Button>
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            aria-expanded={menuOpen}
            className="inline-flex size-10 items-center justify-center rounded-md border border-line bg-surface text-muted transition-colors hover:text-fg lg:hidden"
          >
            {menuOpen ? <X className="size-4.5" /> : <Menu className="size-4.5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 top-16 z-40 bg-[hsl(240_30%_6%/0.4)] lg:hidden"
            />
            <motion.nav
              aria-label="Mobile"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-0 top-16 z-50 border-b border-line bg-elevated p-4 shadow-lg lg:hidden"
            >
              <ul className="flex flex-col gap-1">
                {[...NAV, { href: '/history', labelKey: 'nav.history' }, { href: '/settings', labelKey: 'nav.settings' }].map(
                  (item, index) => (
                    <motion.li
                      key={item.href}
                      initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: reduceMotion ? 0 : 0.03 * index, duration: 0.2 }}
                    >
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center justify-between rounded-md px-3.5 py-3 text-[0.9375rem] font-medium transition-colors',
                          isActive(item.href) ? 'bg-sunken text-fg' : 'text-muted hover:bg-sunken hover:text-fg',
                        )}
                      >
                        {t(item.labelKey)}
                        <ArrowRight aria-hidden className="size-4 opacity-40" />
                      </Link>
                    </motion.li>
                  ),
                )}
              </ul>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
                <LanguageSelector />
                <Link href="/downloader" className="flex-1">
                  <Button fullWidth trailingIcon={<ArrowRight className="size-4" />}>
                    {t('nav.start')}
                  </Button>
                </Link>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
