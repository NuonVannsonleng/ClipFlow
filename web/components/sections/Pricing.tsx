'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Sparkles, Zap } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/primitives';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Section } from './Sections';

type Billing = 'monthly' | 'yearly';
type TierId = 'free' | 'pro' | 'max';

interface Tier {
  id: TierId;
  /** Price per month, in USD, for each billing period. */
  price: Record<Billing, number>;
  featureCount: number;
  highlighted?: boolean;
}

/**
 * Yearly is the monthly rate less 20%, so the saving in the toggle badge and
 * the per-month figure on the card can never drift apart.
 */
const YEARLY_DISCOUNT = 0.2;
const yearly = (monthly: number) => Math.round(monthly * (1 - YEARLY_DISCOUNT) * 100) / 100;

const TIERS: Tier[] = [
  { id: 'free', price: { monthly: 0, yearly: 0 }, featureCount: 3 },
  { id: 'pro', price: { monthly: 4.99, yearly: yearly(4.99) }, featureCount: 4, highlighted: true },
  { id: 'max', price: { monthly: 9.99, yearly: yearly(9.99) }, featureCount: 4 },
];

const money = (value: number) => (Number.isInteger(value) ? `${value}` : value.toFixed(2));

/* ------------------------------------------------------------- toggle ---- */

function BillingToggle({
  value,
  onChange,
}: {
  value: Billing;
  onChange: (next: Billing) => void;
}) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const groupId = useId();

  const options: { id: Billing; label: string }[] = [
    { id: 'monthly', label: t('pricing.monthly') },
    { id: 'yearly', label: t('pricing.yearly') },
  ];

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        role="radiogroup"
        aria-label={t('pricing.billingPeriod')}
        className="inline-flex items-center gap-1 rounded-full border border-line bg-sunken p-1"
      >
        {options.map((option) => {
          const active = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.id)}
              className={cn(
                'relative rounded-full px-5 py-2 text-sm font-medium transition-colors duration-200',
                active ? 'text-fg' : 'text-muted hover:text-fg',
              )}
            >
              {active && (
                <motion.span
                  layoutId={`billing-pill-${groupId}`}
                  transition={
                    reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }
                  }
                  className="absolute inset-0 rounded-full border border-line bg-surface shadow-xs"
                />
              )}
              <span className="relative z-10">{option.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {value === 'yearly' && (
          <motion.span
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-medium text-success"
          >
            <Sparkles aria-hidden className="size-3.5" />
            {t('pricing.saveBadge', { percent: Math.round(YEARLY_DISCOUNT * 100) })}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/* --------------------------------------------------------------- card ---- */

function PriceTag({ tier, billing }: { tier: Tier; billing: Billing }) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const amount = tier.price[billing];
  const isFree = amount === 0;

  return (
    <div className="mt-5">
      <div className="flex items-end gap-1.5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={`${tier.id}-${billing}`}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl font-semibold tracking-tight tabular-nums"
          >
            ${money(amount)}
          </motion.span>
        </AnimatePresence>
        {!isFree && (
          <span className="pb-1.5 text-sm text-muted">{t('pricing.perMonth')}</span>
        )}
      </div>

      {/* Reserve the line so cards do not jump height when the toggle flips. */}
      <p className="mt-1.5 min-h-5 text-xs text-subtle">
        {isFree
          ? t('pricing.freeForever')
          : billing === 'yearly'
            ? t('pricing.billedYearly', { total: money(Math.round(amount * 12 * 100) / 100) })
            : t('pricing.billedMonthly')}
      </p>
    </div>
  );
}

function TierCard({ tier, billing, index }: { tier: Tier; billing: Billing; index: number }) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const features = Array.from({ length: tier.featureCount }, (_, i) =>
    t(`pricing.${tier.id}.f${i + 1}`),
  );

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{
        duration: 0.5,
        delay: reduceMotion ? 0 : index * 0.1,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn('relative flex', tier.highlighted && 'lg:-my-4')}
    >
      {/* Soft glow behind the featured card only. */}
      {tier.highlighted && (
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-3 -z-10 rounded-[1.75rem] bg-[radial-gradient(60%_50%_at_50%_0%,var(--cf-primary)_0%,transparent_70%)] opacity-20 blur-2xl dark:opacity-30"
        />
      )}

      <div
        className={cn(
          'relative flex w-full flex-col rounded-2xl p-px transition-transform duration-300',
          tier.highlighted
            ? 'bg-[linear-gradient(140deg,var(--cf-primary),var(--cf-accent)_55%,transparent_85%)] shadow-lg'
            : 'bg-line',
        )}
      >
        <div className="flex h-full flex-col rounded-[calc(1rem-1px)] bg-surface p-6 sm:p-7">
          {tier.highlighted && (
            <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-fg shadow-[0_6px_20px_-8px_var(--cf-primary)]">
              <Zap aria-hidden className="size-3.5" />
              {t('pricing.popular')}
            </span>
          )}

          <header className={cn(tier.highlighted && 'mt-2')}>
            <h3 className="text-lg font-semibold tracking-tight">{t(`pricing.${tier.id}.name`)}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              {t(`pricing.${tier.id}.desc`)}
            </p>
          </header>

          <PriceTag tier={tier} billing={billing} />

          <ul className="mt-6 flex flex-1 flex-col gap-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm leading-relaxed">
                <span
                  aria-hidden
                  className={cn(
                    'mt-0.5 inline-flex size-4.5 shrink-0 items-center justify-center rounded-full',
                    tier.highlighted ? 'bg-primary text-primary-fg' : 'bg-success-soft text-success',
                  )}
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
                <span className="text-muted">{feature}</span>
              </li>
            ))}
          </ul>

          <Button
            variant={tier.highlighted ? 'primary' : 'secondary'}
            size="lg"
            fullWidth
            className="mt-7"
          >
            {t(`pricing.${tier.id}.cta`)}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------ section ---- */

export function PricingSection() {
  const { t } = useI18n();
  const [billing, setBilling] = useState<Billing>('monthly');

  return (
    <Section id="pricing">
      <div className="flex flex-col items-center gap-8">
        <SectionHeading
          eyebrow={t('pricing.eyebrow')}
          title={t('pricing.title')}
          subtitle={t('pricing.subtitle')}
        />
        <BillingToggle value={billing} onChange={setBilling} />
      </div>

      <div className="mt-14 grid items-start gap-6 lg:grid-cols-3">
        {TIERS.map((tier, index) => (
          <TierCard key={tier.id} tier={tier} billing={billing} index={index} />
        ))}
      </div>

      <p className="mx-auto mt-10 max-w-2xl text-center text-xs leading-relaxed text-subtle">
        {t('pricing.note')}
      </p>
    </Section>
  );
}
