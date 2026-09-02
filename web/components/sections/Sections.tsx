'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AudioLines,
  ChevronDown,
  Film,
  Gauge,
  Lock,
  MousePointerClick,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, SectionHeading } from '@/components/ui/primitives';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { PlatformGrid } from './PlatformGrid';

/* ------------------------------------------------------------ helpers ---- */

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Section({
  id,
  children,
  className,
  tone = 'default',
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  tone?: 'default' | 'subtle';
}) {
  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24 lg:px-8',
        tone === 'subtle' && 'border-y border-line bg-bg-subtle',
        className,
      )}
    >
      <div className="mx-auto w-full max-w-7xl">{children}</div>
    </section>
  );
}

/* --------------------------------------------------- supported platforms -- */

export function SupportedPlatformsSection() {
  const { t } = useI18n();
  return (
    <Section id="platforms" tone="subtle">
      <Reveal>
        <SectionHeading title={t('platforms.title')} subtitle={t('platforms.subtitle')} />
      </Reveal>
      <PlatformGrid className="mt-12" />
      <Reveal delay={0.1}>
        <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-3 text-center text-xs leading-relaxed text-subtle">
          <p>{t('platforms.caveat')}</p>
          <p>{t('platforms.trademarks')}</p>
        </div>
      </Reveal>
    </Section>
  );
}

/* ------------------------------------------------------ popular formats -- */

export function FormatsSection() {
  const { t } = useI18n();

  const video = [
    { name: 'MP4', body: t('formats.mp4') },
    { name: 'WEBM', body: t('formats.webm') },
  ];
  const audio = [
    { name: 'MP3', body: t('formats.mp3') },
    { name: 'M4A', body: t('formats.m4a') },
    { name: 'WAV', body: t('formats.wav') },
    { name: 'OPUS', body: t('formats.opus') },
  ];

  const group = (title: string, icon: ReactNode, entries: { name: string; body: string }[]) => (
    <div className="flex flex-col gap-4">
      <h3 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-subtle">
        <span aria-hidden className="text-primary [&>svg]:size-4">
          {icon}
        </span>
        {title}
      </h3>
      <ul className="grid gap-3 sm:grid-cols-2">
        {entries.map((entry) => (
          <li key={entry.name}>
            <Card interactive className="flex h-full flex-col gap-1.5 p-4">
              <span className="font-mono text-sm font-semibold tracking-tight text-primary">
                {entry.name}
              </span>
              <span className="text-[0.8125rem] leading-relaxed text-muted">{entry.body}</span>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <Section id="formats">
      <Reveal>
        <SectionHeading title={t('formats.title')} subtitle={t('formats.subtitle')} />
      </Reveal>
      <Reveal delay={0.08}>
        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          {group(t('formats.videoTitle'), <Film />, video)}
          {group(t('formats.audioTitle'), <AudioLines />, audio)}
        </div>
      </Reveal>
    </Section>
  );
}

/* ---------------------------------------------------------- how it works -- */

export function HowItWorksSection() {
  const { t } = useI18n();
  const steps = [
    { number: '01', title: t('how.step1Title'), body: t('how.step1Body') },
    { number: '02', title: t('how.step2Title'), body: t('how.step2Body') },
    { number: '03', title: t('how.step3Title'), body: t('how.step3Body') },
  ];

  return (
    <Section id="how-it-works" tone="subtle">
      <Reveal>
        <SectionHeading title={t('how.title')} subtitle={t('how.subtitle')} />
      </Reveal>

      <ol className="mt-14 grid gap-6 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.number} className="relative">
            <Reveal delay={index * 0.08}>
              <Card className="h-full p-6">
                <span className="font-mono text-3xl font-semibold tracking-tight text-primary/35">
                  {step.number}
                </span>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
              </Card>
            </Reveal>
            {index < steps.length - 1 && (
              <span
                aria-hidden
                className="absolute -right-3 top-1/2 hidden h-px w-6 -translate-y-1/2 bg-line-strong md:block"
              />
            )}
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* ---------------------------------------------------------------- features */

export function FeaturesSection() {
  const { t } = useI18n();
  const features = [
    { icon: <Gauge />, title: t('features.fastTitle'), body: t('features.fastBody') },
    { icon: <MousePointerClick />, title: t('features.simpleTitle'), body: t('features.simpleBody') },
    { icon: <Smartphone />, title: t('features.responsiveTitle'), body: t('features.responsiveBody') },
    { icon: <ShieldCheck />, title: t('features.privacyTitle'), body: t('features.privacyBody') },
  ];

  return (
    <Section id="features">
      <Reveal>
        <SectionHeading title={t('features.title')} subtitle={t('features.subtitle')} />
      </Reveal>

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, index) => (
          <Reveal key={feature.title} delay={index * 0.07}>
            <Card spotlight className="h-full p-6">
              <span
                aria-hidden
                className="inline-flex size-11 items-center justify-center rounded-lg bg-primary-soft text-primary [&>svg]:size-5"
              >
                {feature.icon}
              </span>
              <h3 className="mt-5 text-base font-semibold tracking-tight">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{feature.body}</p>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* --------------------------------------------------------------------- FAQ */

export function FaqSection() {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(0);
  const reduceMotion = useReducedMotion();

  const items = [1, 2, 3, 4, 5].map((index) => ({
    question: t(`faq.q${index}`),
    answer: t(`faq.a${index}`),
  }));

  return (
    <Section id="faq" tone="subtle">
      <Reveal>
        <SectionHeading title={t('faq.title')} subtitle={t('faq.subtitle')} />
      </Reveal>

      <div className="mx-auto mt-12 flex max-w-3xl flex-col gap-3">
        {items.map((item, index) => {
          const expanded = open === index;
          return (
            <Reveal key={item.question} delay={index * 0.05}>
              <Card className={cn('overflow-hidden transition-colors', expanded && 'border-line-strong')}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`faq-panel-${index}`}
                    id={`faq-button-${index}`}
                    onClick={() => setOpen(expanded ? null : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-[0.9375rem] font-medium">{item.question}</span>
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        'size-4 shrink-0 text-subtle transition-transform duration-300',
                        expanded && 'rotate-180',
                      )}
                    />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      id={`faq-panel-${index}`}
                      role="region"
                      aria-labelledby={`faq-button-${index}`}
                      initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      animate={reduceMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                      exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm leading-relaxed text-muted">{item.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

/* ------------------------------------------------- responsible use / CTA -- */

export function ResponsibleUseSection() {
  const { t } = useI18n();
  return (
    <Section id="responsible-use">
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-8 shadow-sm sm:p-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[radial-gradient(circle,var(--cf-primary)_0%,transparent_65%)] opacity-[0.12] blur-2xl"
          />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-sunken px-3 py-1.5 text-xs font-medium text-muted">
                <Lock aria-hidden className="size-3.5 text-success" />
                {t('legal.responsibleTitle')}
              </span>
              <h2 className="mt-5 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                {t('legal.responsibleLead')}
              </h2>
              <p className="mt-4 max-w-2xl text-pretty text-sm leading-relaxed text-muted">
                {t('legal.responsibleBody')}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">{t('legal.yourResponsibility')}</p>
              <p className="text-sm leading-relaxed text-muted">{t('legal.yourResponsibilityBody')}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link href="/legal/responsible-use">
                  <Button variant="secondary" size="sm" tabIndex={-1}>
                    {t('footer.responsible')}
                  </Button>
                </Link>
                <Link href="/legal/privacy">
                  <Button variant="ghost" size="sm" tabIndex={-1}>
                    {t('footer.privacy')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
