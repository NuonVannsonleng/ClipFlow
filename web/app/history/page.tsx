import type { Metadata } from 'next';
import { HistoryClient } from './HistoryClient';

export const metadata: Metadata = {
  title: 'Recent Downloads',
  description: 'Your recent ClipFlow downloads, kept in this browser only.',
  alternates: { canonical: '/history' },
  robots: { index: false, follow: true },
};

export default function HistoryPage() {
  return <HistoryClient />;
}
