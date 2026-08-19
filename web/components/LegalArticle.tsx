'use client';

import { Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getLegalDocument, type LegalSlug } from '@/lib/legal';
import { useSettings } from '@/lib/settings';

export function LegalArticle({ slug }: { slug: LegalSlug }) {
  const { t, locale } = useI18n();
  const { settings } = useSettings();
  const document = getLegalDocument(slug, settings.language);

  return (
    <div className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <article className="mx-auto w-full max-w-2xl">
        <header className="flex flex-col gap-3 border-b border-line pb-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{document.title}</h1>
          <p className="text-pretty text-[0.9375rem] leading-relaxed text-muted">{document.lead}</p>
          <p className="text-xs text-subtle">
            {t('legal.lastUpdated')}:{' '}
            <time dateTime={document.updated}>
              {new Date(document.updated).toLocaleDateString(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          </p>
        </header>

        <div className="mt-10 flex flex-col gap-10">
          {document.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-semibold tracking-tight">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
                  {paragraph}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-4 flex flex-col gap-2.5">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2.5 text-[0.9375rem] leading-relaxed text-muted">
                      <Check aria-hidden className="mt-1 size-4 shrink-0 text-success" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
