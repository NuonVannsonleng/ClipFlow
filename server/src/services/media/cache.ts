import type { MediaInfo } from '../../core/types.js';

const TTL_MS = 15 * 60 * 1000;
const MAX_ENTRIES = 300;

const entries = new Map<string, { info: MediaInfo; expiresAt: number }>();

/**
 * Short-lived cache of analysis results, keyed by the normalised URL hash.
 * It keeps a repeated "analyse then download" round trip from hitting the
 * source platform twice, and expires quickly so links never go stale.
 */
export const analysisCache = {
  get(sourceId: string): MediaInfo | undefined {
    const entry = entries.get(sourceId);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      entries.delete(sourceId);
      return undefined;
    }
    return entry.info;
  },

  set(info: MediaInfo): void {
    if (entries.size >= MAX_ENTRIES) {
      const oldest = entries.keys().next().value;
      if (oldest) entries.delete(oldest);
    }
    entries.set(info.sourceId, { info, expiresAt: Date.now() + TTL_MS });
  },

  clear(): void {
    entries.clear();
  },
};
