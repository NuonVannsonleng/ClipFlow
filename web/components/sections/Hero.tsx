'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { FileAudio, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { CapabilityNotice } from '@/components/downloader/CapabilityNotice';
import { DownloaderPanel } from '@/components/downloader/DownloaderPanel';
import { useI18n } from '@/lib/i18n';

/** Soft, slow gradient blobs. Static under prefers-reduced-motion. */
function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute left-1/2 top-[-18rem] size-[42rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,var(--cf-primary)_0%,transparent_65%)] opacity-[0.16] blur-3xl dark:opacity-25" />
      <div className="cf-float absolute -left-32 top-24 size-[26rem] rounded-full bg-[radial-gradient(circle,var(--cf-accent)_0%,transparent_65%)] opacity-[0.12] blur-3xl dark:opacity-20" />
      <div
        className="cf-float absolute -right-24 top-64 size-[22rem] rounded-full bg-[radial-gradient(circle,var(--cf-primary)_0%,transparent_65%)] opacity-[0.1] blur-3xl dark:opacity-[0.18]"
        style={{ animationDelay: '-6s' }}
      />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--cf-border)] to-transparent" />
    </div>
  );
}

export function Hero() {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();

  const rise = (delay: number) => ({
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  const trust = [
    { icon: <FileAudio className="size-3.5" />, label: t('hero.trustFormats') },
    { icon: <ShieldCheck className="size-3.5" />, label: t('hero.trustNoAccount') },
    { icon: <Trash2 className="size-3.5" />, label: t('hero.trustCleanup') },
  ];

  return (
    <section
      id="top"
      className="relative isolate overflow-hidden px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:px-8"
    >
      <AmbientBackground />

      <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        <motion.span
          {...rise(0)}
          className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3.5 py-1.5 text-xs font-medium text-muted backdrop-blur"
        >
          <Sparkles aria-hidden className="size-3.5 text-primary" />
          {t('hero.eyebrow')}
        </motion.span>

        <motion.h1
          {...rise(0.06)}
          className="text-gradient mt-6 text-balance pb-1 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.5rem]"
        >
          {t('hero.title')}
        </motion.h1>

        <motion.p
          {...rise(0.12)}
          className="mt-5 max-w-xl text-pretty text-[1.0625rem] leading-relaxed text-muted"
        >
          {t('hero.subtitle')}
        </motion.p>
      </div>

      <motion.div {...rise(0.18)} className="relative mx-auto mt-10 w-full max-w-2xl">
        {/* Pool of light under the input, so the eye lands on it first. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-8 -top-10 -z-10 h-40 bg-[radial-gradient(50%_60%_at_50%_50%,var(--cf-primary)_0%,transparent_70%)] opacity-[0.14] blur-2xl dark:opacity-25"
        />
        <CapabilityNotice className="mb-5" />
        <DownloaderPanel autoFocus />
      </motion.div>

      <motion.ul
        {...rise(0.26)}
        className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-2"
      >
        {trust.map((item) => (
          <li key={item.label} className="inline-flex items-center gap-1.5 text-xs font-medium text-subtle">
            <span aria-hidden className="text-primary">
              {item.icon}
            </span>
            {item.label}
          </li>
        ))}
      </motion.ul>
    </section>
  );
}
