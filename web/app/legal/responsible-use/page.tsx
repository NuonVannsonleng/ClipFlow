import type { Metadata } from 'next';
import { LegalArticle } from '@/components/LegalArticle';

export const metadata: Metadata = {
  title: 'Responsible Use',
  description: 'The limits ClipFlow deliberately keeps, and what they mean for you.',
  alternates: { canonical: '/legal/responsible-use' },
};

export default function Page() {
  return <LegalArticle slug="responsible-use" />;
}
