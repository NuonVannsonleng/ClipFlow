'use client';

import { Layers, Link2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BatchPanel } from '@/components/downloader/BatchPanel';
import { CapabilityNotice } from '@/components/downloader/CapabilityNotice';
import { DownloaderPanel } from '@/components/downloader/DownloaderPanel';
import { Segmented } from '@/components/ui/primitives';
import { useI18n } from '@/lib/i18n';

type Mode = 'single' | 'batch';

/**
 * `?url=` lets History send an expired entry straight back into the flow. It
 * is read after mount rather than through useSearchParams so this panel stays
 * in the prerendered HTML instead of becoming a client-only subtree.
 */
function SinglePanel() {
  const [initialUrl, setInitialUrl] = useState('');

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('url');
    if (value) setInitialUrl(value);
  }, []);

  return <DownloaderPanel key={initialUrl} initialUrl={initialUrl} autoFocus />;
}

export function DownloaderClient() {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('single');

  return (
    <div className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <header className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {t('nav.downloader')}
          </h1>
          <p className="max-w-xl text-pretty text-[0.9375rem] leading-relaxed text-muted">
            {t('hero.subtitle')}
          </p>
        </header>

        <div className="mt-8 flex justify-center">
          <Segmented<Mode>
            ariaLabel={t('nav.downloader')}
            value={mode}
            onChange={setMode}
            className="max-w-xs"
            options={[
              { value: 'single', label: t('url.label'), icon: <Link2 /> },
              { value: 'batch', label: t('batch.title'), icon: <Layers /> },
            ]}
          />
        </div>

        <CapabilityNotice className="mt-8" />

        <div className="mt-8">
          {mode === 'single' ? <SinglePanel /> : <BatchPanel />}
        </div>
      </div>
    </div>
  );
}
