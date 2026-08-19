import type { Metadata } from 'next';
import { LegalArticle } from '@/components/LegalArticle';

export const metadata: Metadata = {
  title: 'Terms',
  description: 'Plain terms covering acceptable use, availability, and liability.',
  alternates: { canonical: '/legal/terms' },
};

export default function Page() {
  return <LegalArticle slug="terms" />;
}
