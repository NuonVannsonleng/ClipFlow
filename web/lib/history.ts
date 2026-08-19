'use client';

import { useCallback, useEffect, useState } from 'react';
import type { HistoryEntry } from './types';

const KEY = 'clipflow.history.v1';
const MAX_ENTRIES = 100;
const EVENT = 'clipflow:history';

/**
 * History lives in the browser, not on the server: it survives the temporary
 * file's expiry, works offline, and disappears the moment the user clears it.
 */
function read(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(entries: HistoryEntry[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    /* private mode: history simply is not persisted */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export const historyStore = {
  all: read,

  add(entry: HistoryEntry): void {
    const existing = read().filter((item) => item.jobId !== entry.jobId);
    write([entry, ...existing]);
  },

  remove(id: string): void {
    write(read().filter((item) => item.id !== id));
  },

  clear(): void {
    write([]);
  },
};

/** Subscribes a component to the local history, including cross-tab edits. */
export function useHistory(): {
  entries: HistoryEntry[];
  remove: (id: string) => void;
  clear: () => void;
  hydrated: boolean;
} {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => setEntries(read());
    sync();
    setHydrated(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const remove = useCallback((id: string) => historyStore.remove(id), []);
  const clear = useCallback(() => historyStore.clear(), []);

  return { entries, remove, clear, hydrated };
}
