'use client';

import { Monitor, Moon, RotateCcw, ShieldCheck, Sun, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Badge, Card, Segmented, Switch } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { historyStore } from '@/lib/history';
import { LANGUAGES, useI18n } from '@/lib/i18n';
import {
  useSettings,
  type Language,
  type QualityPreference,
  type ThemePreference,
  type VideoContainer,
} from '@/lib/settings';

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-6 sm:p-7">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <p className="text-[0.8125rem] leading-relaxed text-muted">{description}</p>
      </div>
      <div className="mt-6 flex flex-col gap-6">{children}</div>
    </Card>
  );
}

export function SettingsClient() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { settings, update, reset } = useSettings();
  const [confirmClear, setConfirmClear] = useState(false);

  const clearHistory = async () => {
    historyStore.clear();
    setConfirmClear(false);
    try {
      await api.clearHistory();
    } catch {
      /* nothing left server-side */
    }
    toast(t('history.clearAll'), { tone: 'success' });
  };

  return (
    <div className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t('settings.title')}</h1>
          <p className="text-[0.9375rem] leading-relaxed text-muted">{t('settings.subtitle')}</p>
        </header>

        <div className="mt-10 flex flex-col gap-4">
          <Panel title={t('settings.appearance')} description={t('settings.appearanceDesc')}>
            <Segmented<ThemePreference>
              ariaLabel={t('settings.appearance')}
              value={settings.theme}
              onChange={(theme) => update({ theme })}
              options={[
                { value: 'light', label: t('settings.light'), icon: <Sun /> },
                { value: 'dark', label: t('settings.dark'), icon: <Moon /> },
                { value: 'system', label: t('settings.system'), icon: <Monitor /> },
              ]}
            />
          </Panel>

          <Panel title={t('settings.language')} description={t('settings.languageDesc')}>
            <Segmented<Language>
              ariaLabel={t('settings.language')}
              value={settings.language}
              onChange={(language) => update({ language })}
              options={LANGUAGES.map((item) => ({ value: item.id, label: item.native }))}
            />
          </Panel>

          <Panel title={t('settings.downloads')} description={t('settings.downloadsDesc')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">{t('settings.defaultFormat')}</span>
                <Select<VideoContainer>
                  label={t('settings.defaultFormat')}
                  value={settings.defaultFormat}
                  onChange={(defaultFormat) => update({ defaultFormat })}
                  options={[
                    { value: 'mp4', label: 'MP4' },
                    { value: 'webm', label: 'WEBM' },
                  ]}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">{t('settings.defaultQuality')}</span>
                <Select<QualityPreference>
                  label={t('settings.defaultQuality')}
                  value={settings.defaultQuality}
                  onChange={(defaultQuality) => update({ defaultQuality })}
                  options={[
                    { value: 'highest', label: t('settings.highest') },
                    { value: '1080', label: '1080p' },
                    { value: '720', label: '720p' },
                    { value: '480', label: '480p' },
                    { value: '360', label: '360p' },
                  ]}
                />
              </label>
            </div>

            <Switch
              id="remember-last"
              checked={settings.rememberLast}
              onChange={(rememberLast) => update({ rememberLast })}
              label={t('settings.rememberLast')}
              description={t('settings.rememberLastDesc')}
            />
          </Panel>

          <Panel title={t('settings.privacy')} description={t('settings.privacyDesc')}>
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <p className="text-sm font-medium">{t('settings.clearHistory')}</p>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
                  {t('settings.clearHistoryDesc')}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmClear(true)}
                leadingIcon={<Trash2 className="size-4" />}
              >
                {t('settings.clearHistoryAction')}
              </Button>
            </div>

            <div className="flex items-start justify-between gap-6 border-t border-line pt-6">
              <div className="min-w-0">
                <p className="text-sm font-medium">{t('settings.autoDelete')}</p>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
                  {t('settings.autoDeleteDesc')}
                </p>
              </div>
              <Badge tone="success" icon={<ShieldCheck />}>
                {t('settings.alwaysOn')}
              </Badge>
            </div>

            <p className="rounded-md border border-line bg-sunken px-4 py-3 text-xs leading-relaxed text-muted">
              {t('settings.privacyInfo')}
            </p>
          </Panel>

          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                reset();
                toast(t('settings.reset'), { tone: 'info' });
              }}
              leadingIcon={<RotateCcw className="size-4" />}
            >
              {t('settings.reset')}
            </Button>
          </div>
        </div>
      </div>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title={t('settings.clearHistory')}
        description={t('settings.clearHistoryDesc')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={() => void clearHistory()}>
              {t('settings.clearHistoryAction')}
            </Button>
          </>
        }
      />
    </div>
  );
}
