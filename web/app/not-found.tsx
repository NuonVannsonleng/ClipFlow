'use client';

import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/lib/i18n';

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-20">
      <div className="flex max-w-md flex-col items-center gap-5 text-center">
        <span className="font-mono text-5xl font-semibold tracking-tight text-primary/40">404</span>
        <h1 className="text-2xl font-semibold tracking-tight">{t('errors.NOT_FOUND')}</h1>
        <p className="text-sm leading-relaxed text-muted">{t('history.emptyBody')}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/">
            <Button tabIndex={-1} leadingIcon={<ArrowLeft className="size-4" />}>
              {t('common.backHome')}
            </Button>
          </Link>
          <Link href="/downloader">
            <Button variant="secondary" tabIndex={-1} leadingIcon={<Search className="size-4" />}>
              {t('nav.downloader')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
