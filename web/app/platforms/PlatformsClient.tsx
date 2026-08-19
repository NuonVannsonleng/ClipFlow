'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { CapabilityNotice } from '@/components/downloader/CapabilityNotice';
import { PlatformGrid } from '@/components/sections/PlatformGrid';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/lib/i18n';

export function PlatformsClient() {
  const { t } = useI18n();

  return (
    <div className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {t('platforms.title')}
          </h1>
          <p className="text-pretty text-[0.9375rem] leading-relaxed text-muted">
            {t('platforms.subtitle')}
          </p>
          <Link href="/downloader" className="mt-2">
            <Button trailingIcon={<ArrowRight className="size-4" />} tabIndex={-1}>
              {t('platforms.checkYourLink')}
            </Button>
          </Link>
        </header>

        <CapabilityNotice className="mx-auto mt-10 max-w-3xl" />

        <PlatformGrid className="mt-10" />

        <div className="mx-auto mt-10 flex max-w-3xl flex-col gap-3 text-center text-xs leading-relaxed text-subtle">
          <p>{t('platforms.caveat')}</p>
          <p>{t('platforms.trademarks')}</p>
        </div>
      </div>
    </div>
  );
}
