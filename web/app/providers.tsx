'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { I18nProvider } from '@/lib/i18n';
import { SettingsProvider } from '@/lib/settings';

/**
 * Settings sit outermost because both the language and the theme are stored
 * there; i18n reads from it, and toasts need translated copy.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <I18nProvider>
        <ToastProvider>{children}</ToastProvider>
      </I18nProvider>
    </SettingsProvider>
  );
}
