'use client';

import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Kept close to the download control, quiet enough not to compete with it.
 */
export function LegalNotice({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <p
      className={cn(
        'flex items-start gap-2 text-xs leading-relaxed text-subtle',
        className,
      )}
    >
      <ShieldCheck aria-hidden className="mt-px size-3.5 shrink-0" />
      <span>
        {t('legal.notice')}{' '}
        <Link
          href="/legal/responsible-use"
          className="font-medium text-muted underline decoration-line-strong underline-offset-2 transition-colors hover:text-fg"
        >
          {t('footer.responsible')}
        </Link>
      </span>
    </p>
  );
}
