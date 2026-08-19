import type { Metadata } from 'next';
import { PlatformsClient } from './PlatformsClient';

export const metadata: Metadata = {
  title: 'Supported Platforms',
  description:
    'Which platforms ClipFlow can process today, and what each one allows. Public content only.',
  alternates: { canonical: '/platforms' },
};

export default function PlatformsPage() {
  return <PlatformsClient />;
}
