'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Download, Inbox, RotateCcw, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PlatformIcon } from '@/components/PlatformIcon';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Badge, Card, Skeleton } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { api, resolveDownloadUrl } from '@/lib/api';
import { useHistory } from '@/lib/history';
import { useI18n } from '@/lib/i18n';
import { platformLabel } from '@/lib/platforms';
import type { HistoryEntry } from '@/lib/types';
import { dayBucket, formatBytes, formatTimestamp, isExpired, minutesUntil } from '@/lib/utils';

type SortOrder = 'newest' | 'oldest';
const BUCKETS = ['today', 'yesterday', 'earlier'] as const;

function EntryRow({
  entry,
  onDelete,
}: {
  entry: HistoryEntry;
  onDelete: (entry: HistoryEntry) => void;
}) {
  const { t, locale } = useI18n();
  const expired = isExpired(entry.expiresAt);
  const remaining = minutesUntil(entry.expiresAt);

  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        {entry.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.thumbnail}
            alt=""
            referrerPolicy="no-referrer"
            className="h-14 w-24 shrink-0 rounded-md border border-line object-cover"
          />
        ) : (
          <span className="flex h-14 w-24 shrink-0 items-center justify-center rounded-md border border-line bg-sunken">
            <PlatformIcon platform={entry.platform} size="sm" />
          </span>
        )}

        <div className="min-w-0">
          <p className="truncate text-sm font-medium" title={entry.title}>
            {entry.title}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle">
            <span className="font-medium uppercase text-muted">{entry.container}</span>
            {entry.quality && <span>· {entry.quality}</span>}
            {entry.filesize !== undefined && <span>· {formatBytes(entry.filesize)}</span>}
            <span>· {platformLabel(entry.platform)}</span>
            <span>· {formatTimestamp(entry.createdAt, locale)}</span>
          </p>
          <div className="mt-2">
            <Badge tone={expired ? 'danger' : (remaining ?? 0) < 5 ? 'warning' : 'success'}>
              {expired ? t('history.expired') : t('history.expiresIn', { minutes: remaining ?? 0 })}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:flex-col lg:flex-row">
        {expired || !entry.downloadUrl ? (
          <Link href={`/downloader?url=${encodeURIComponent(entry.sourceUrl)}`} className="flex-1 sm:flex-none">
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              tabIndex={-1}
              leadingIcon={<RotateCcw className="size-4" />}
            >
              {t('history.reanalyze')}
            </Button>
          </Link>
        ) : (
          <a href={resolveDownloadUrl(entry.downloadUrl)} className="flex-1 sm:flex-none">
            <Button size="sm" fullWidth tabIndex={-1} leadingIcon={<Download className="size-4" />}>
              {t('history.downloadAgain')}
            </Button>
          </a>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(entry)}
          aria-label={`${t('history.delete')}: ${entry.title}`}
          leadingIcon={<Trash2 className="size-4" />}
        >
          {t('history.delete')}
        </Button>
      </div>
    </Card>
  );
}

export function HistoryClient() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const { entries, remove, clear, hydrated } = useHistory();
  const reduceMotion = useReducedMotion();

  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState<string>('all');
  const [container, setContainer] = useState<string>('all');
  const [sort, setSort] = useState<SortOrder>('newest');
  const [confirmClear, setConfirmClear] = useState(false);

  const platformOptions = useMemo(
    () => [
      { value: 'all', label: t('common.all') },
      ...[...new Set(entries.map((entry) => entry.platform))].map((id) => ({
        value: id,
        label: platformLabel(id),
      })),
    ],
    [entries, t],
  );

  const containerOptions = useMemo(
    () => [
      { value: 'all', label: t('common.all') },
      ...[...new Set(entries.map((entry) => entry.container))].map((value) => ({
        value,
        label: value.toUpperCase(),
      })),
    ],
    [entries, t],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries
      .filter((entry) => {
        if (platform !== 'all' && entry.platform !== platform) return false;
        if (container !== 'all' && entry.container !== container) return false;
        if (!needle) return true;
        return (
          entry.title.toLowerCase().includes(needle) || entry.sourceUrl.toLowerCase().includes(needle)
        );
      })
      .sort((a, b) =>
        sort === 'newest'
          ? b.createdAt.localeCompare(a.createdAt)
          : a.createdAt.localeCompare(b.createdAt),
      );
  }, [entries, query, platform, container, sort]);

  const grouped = useMemo(() => {
    const map = new Map<(typeof BUCKETS)[number], HistoryEntry[]>();
    for (const bucket of BUCKETS) map.set(bucket, []);
    for (const entry of filtered) map.get(dayBucket(entry.createdAt))?.push(entry);
    return map;
  }, [filtered]);

  const deleteEntry = async (entry: HistoryEntry) => {
    remove(entry.id);
    try {
      await api.deleteHistoryEntry(entry.jobId);
    } catch {
      /* the server copy may already be gone; the local entry is what matters */
    }
  };

  const clearAll = async () => {
    clear();
    setConfirmClear(false);
    try {
      await api.clearHistory();
    } catch {
      /* nothing to clean up server-side */
    }
    toast(t('history.clearAll'), { tone: 'success' });
  };

  return (
    <div className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t('history.title')}</h1>
            <p className="mt-2 max-w-xl text-[0.9375rem] leading-relaxed text-muted">
              {t('history.subtitle')}
            </p>
          </div>
          {entries.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => setConfirmClear(true)}
              leadingIcon={<Trash2 className="size-4" />}
            >
              {t('history.clearAll')}
            </Button>
          )}
        </header>

        {!hydrated ? (
          <div className="mt-10 flex flex-col gap-3">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <Card className="mt-10 flex flex-col items-center gap-4 px-6 py-16 text-center">
            <span className="inline-flex size-12 items-center justify-center rounded-full bg-sunken text-subtle">
              <Inbox aria-hidden className="size-6" />
            </span>
            <div>
              <p className="text-base font-medium">{t('history.empty')}</p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
                {t('history.emptyBody')}
              </p>
            </div>
            <Link href="/downloader">
              <Button tabIndex={-1}>{t('history.emptyAction')}</Button>
            </Link>
          </Card>
        ) : (
          <>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('history.searchPlaceholder')}
                  aria-label={t('common.search')}
                  className="h-11 w-full rounded-md border border-line bg-surface pl-10 pr-3.5 text-sm placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-4 focus:ring-[var(--cf-ring)]/25"
                />
              </div>
              <Select
                label={t('history.platform')}
                value={platform}
                onChange={setPlatform}
                options={platformOptions}
              />
              <Select
                label={t('history.format')}
                value={container}
                onChange={setContainer}
                options={containerOptions}
              />
              <Select<SortOrder>
                label={t('history.sort')}
                value={sort}
                onChange={setSort}
                options={[
                  { value: 'newest', label: t('history.newest') },
                  { value: 'oldest', label: t('history.oldest') },
                ]}
              />
            </div>

            <p className="mt-4 text-xs text-subtle" aria-live="polite">
              {t('history.results', { count: filtered.length, total: entries.length })}
            </p>

            {filtered.length === 0 ? (
              <p className="mt-8 rounded-lg border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
                {t('history.noResults')}
              </p>
            ) : (
              <div className="mt-6 flex flex-col gap-8">
                {BUCKETS.map((bucket) => {
                  const bucketEntries = grouped.get(bucket) ?? [];
                  if (bucketEntries.length === 0) return null;
                  return (
                    <section key={bucket}>
                      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-subtle">
                        {t(`history.${bucket}`)}
                      </h2>
                      <div className="mt-3 flex flex-col gap-3">
                        <AnimatePresence initial={false}>
                          {bucketEntries.map((entry) => (
                            <motion.div
                              key={entry.id}
                              layout={!reduceMotion}
                              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
                              transition={{ duration: 0.2 }}
                            >
                              <EntryRow entry={entry} onDelete={(item) => void deleteEntry(item)} />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title={t('history.clearAll')}
        description={t('settings.clearHistoryDesc')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={() => void clearAll()}>
              {t('history.clearAll')}
            </Button>
          </>
        }
      />
    </div>
  );
}
