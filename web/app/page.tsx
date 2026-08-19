import { Hero } from '@/components/sections/Hero';
import {
  FaqSection,
  FeaturesSection,
  FormatsSection,
  HowItWorksSection,
  ResponsibleUseSection,
  SupportedPlatformsSection,
} from '@/components/sections/Sections';

/**
 * Landing order follows the product spec: hero + downloader first, then the
 * supporting material.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <SupportedPlatformsSection />
      <FormatsSection />
      <HowItWorksSection />
      <FeaturesSection />
      <FaqSection />
      <ResponsibleUseSection />
    </>
  );
}
