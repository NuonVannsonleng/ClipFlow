import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '--:--';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = Math.floor(seconds % 60);
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${pad(minutes)}:${pad(rest)}`;
}

export function formatBytes(bytes?: number, approximate = false): string {
  if (!bytes || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rendered = `${value.toFixed(value >= 100 || unit === 0 ? 0 : 1)} ${units[unit]}`;
  return approximate ? `~${rendered}` : rendered;
}

/** "Today, 3:42 PM" style stamp, localised to the active language. */
export function formatTimestamp(iso: string, locale: string): string {
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return `${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `${time}`;

  return `${date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}, ${time}`;
}

export function dayBucket(iso: string): 'today' | 'yesterday' | 'earlier' {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'yesterday';
  return 'earlier';
}

/** Minutes until a temporary link expires; negative once it is gone. */
export function minutesUntil(iso?: string): number | undefined {
  if (!iso) return undefined;
  return Math.round((new Date(iso).getTime() - Date.now()) / 60000);
}

export const isExpired = (iso?: string): boolean =>
  Boolean(iso) && new Date(iso as string).getTime() <= Date.now();

export function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
