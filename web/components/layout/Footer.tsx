'use client';

import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { LogoMark } from './Logo';

export function Footer() {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  const columns = [
    {
      title: t('footer.product'),
      links: [
        { href: '/downloader', label: t('nav.downloader') },
        { href: '/platforms', label: t('nav.platforms') },
        { href: '/#features', label: t('nav.features') },
        { href: '/#faq', label: t('nav.faq') },
      ],
    },
    {
      title: t('footer.legal'),
      links: [
        { href: '/legal/privacy', label: t('footer.privacy') },
        { href: '/legal/terms', label: t('footer.terms') },
        { href: '/legal/responsible-use', label: t('footer.responsible') },
      ],
    },
  ];

  return (
    <footer className="border-t border-line bg-bg-subtle">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <LogoMark className="size-8" />
              <span className="text-[1.0625rem] font-semibold tracking-tight">ClipFlow</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">{t('footer.tagline')}</p>
            <p className="mt-5 inline-flex max-w-xs items-start gap-2 rounded-md border border-line bg-surface px-3 py-2.5 text-xs leading-relaxed text-muted">
              <ShieldCheck aria-hidden className="mt-px size-4 shrink-0 text-success" />
              {t('footer.builtNote')}
            </p>
          </div>

          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h3 className="text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-subtle">
                {column.title}
              </h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted transition-colors duration-200 hover:text-fg"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-line pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-subtle">{t('footer.copyright', { year })}</p>
          <p className="max-w-lg text-xs leading-relaxed text-subtle sm:text-right">{t('legal.notice')}</p>
        </div>
      </div>
    </footer>
  );
}
