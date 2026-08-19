import type { Metadata } from 'next';
import { SettingsClient } from './SettingsClient';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Appearance, language, download preferences, and privacy controls.',
  alternates: { canonical: '/settings' },
  robots: { index: false, follow: true },
};

export default function SettingsPage() {
  return <SettingsClient />;
}
