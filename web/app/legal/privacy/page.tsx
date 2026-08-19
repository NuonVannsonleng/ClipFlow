import type { Metadata } from 'next';
import { LegalArticle } from '@/components/LegalArticle';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What ClipFlow stores, what stays in your browser, and what it never collects.',
  alternates: { canonical: '/legal/privacy' },
};

export default function Page() {
  return <LegalArticle slug="privacy" />;
}
