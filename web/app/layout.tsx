import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_Khmer } from 'next/font/google';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { themeBootstrapScript } from '@/lib/settings';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const khmer = Noto_Sans_Khmer({
  subsets: ['khmer'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-khmer',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'ClipFlow — Download Public Videos Easily',
    template: '%s · ClipFlow',
  },
  description: 'A simple media utility for processing supported public video URLs.',
  applicationName: 'ClipFlow',
  keywords: ['video downloader', 'public video', 'mp4', 'mp3', 'media utility', 'ClipFlow'],
  authors: [{ name: 'ClipFlow' }],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'ClipFlow',
    title: 'ClipFlow — Download Public Videos Easily',
    description: 'A simple media utility for processing supported public video URLs.',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ClipFlow — Download Public Videos Easily',
    description: 'A simple media utility for processing supported public video URLs.',
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/favicon.svg' }],
  },
  robots: { index: true, follow: true },
  category: 'utilities',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafaff' },
    { media: '(prefers-color-scheme: dark)', color: '#0e0e14' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${khmer.variable}`}>
      {/*
        No manual <head>: the App Router owns it, and declaring one here makes
        Next inject its metadata into <body> on the server only, which breaks
        hydration. As the first child of <body> this still runs before the page
        paints, so there is no flash of the wrong theme.
      */}
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
