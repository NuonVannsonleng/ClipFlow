import type { Metadata } from 'next';
import { DownloaderClient } from './DownloaderClient';

export const metadata: Metadata = {
  title: 'Downloader',
  description: 'Paste a public video URL, pick an available format, and download the result.',
  alternates: { canonical: '/downloader' },
};

export default function DownloaderPage() {
  return <DownloaderClient />;
}
