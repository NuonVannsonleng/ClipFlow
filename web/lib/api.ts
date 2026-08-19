import type {
  ApiErrorCode,
  Capabilities,
  Job,
  MediaInfo,
  PlatformDescriptor,
} from './types';

/**
 * Empty by default: requests go to this origin and Next rewrites `/api/*` to
 * the backend (see next.config.ts). Set NEXT_PUBLIC_API_URL only when the API
 * is deployed on its own domain and reached directly by the browser.
 */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');

/**
 * Download links are built by the server from PUBLIC_API_URL, which may name a
 * host the browser should not use (or cannot reach) when everything is proxied
 * through this origin. Keep the path, re-point the origin.
 */
export function resolveDownloadUrl(url: string): string {
  try {
    const parsed = new URL(url, typeof window === 'undefined' ? 'http://localhost' : window.location.href);
    const base = API_URL || (typeof window === 'undefined' ? '' : window.location.origin);
    return `${base}${parsed.pathname}`;
  } catch {
    return url;
  }
}

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly hostname?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    // fetch only rejects for transport-level problems.
    throw new ApiError('NETWORK_ERROR', 'Could not reach the ClipFlow service.');
  }

  if (response.status === 204) return undefined as T;

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    const error = (payload as { error?: { code?: string; message?: string; hostname?: string } })?.error;
    throw new ApiError(
      (error?.code as ApiErrorCode) ?? 'INTERNAL',
      error?.message ?? 'Something went wrong.',
      error?.hostname,
    );
  }

  return payload as T;
}

export type AnalyzeResponse = MediaInfo & { capabilities: Capabilities };

export type BatchAnalyzeItem =
  | { url: string; ok: true; info: MediaInfo }
  | { url: string; ok: false; error: { code: ApiErrorCode; message: string } };

export type BatchProcessItem =
  | { url: string; ok: true; job: Job }
  | { url: string; ok: false; error: { code: ApiErrorCode; message: string } };

export const api = {
  analyze: (url: string, signal?: AbortSignal) =>
    request<AnalyzeResponse>('/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ url }),
      signal,
    }),

  analyzeBatch: (urls: string[], signal?: AbortSignal) =>
    request<{ results: BatchAnalyzeItem[]; capabilities: Capabilities }>('/api/analyze/batch', {
      method: 'POST',
      body: JSON.stringify({ urls }),
      signal,
    }),

  process: (url: string, formatId: string) =>
    request<{ job: Job }>('/api/process', {
      method: 'POST',
      body: JSON.stringify({ url, formatId }),
    }),

  processBatch: (items: { url: string; formatId: string }[]) =>
    request<{ results: BatchProcessItem[] }>('/api/process/batch', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  job: (id: string) => request<{ job: Job }>(`/api/job/${id}`),

  cancelJob: (id: string) => request<void>(`/api/job/${id}`, { method: 'DELETE' }),

  history: () => request<{ jobs: Job[] }>('/api/history'),

  deleteHistoryEntry: (id: string) => request<void>(`/api/history/${id}`, { method: 'DELETE' }),

  clearHistory: () => request<void>('/api/history', { method: 'DELETE' }),

  platforms: () =>
    request<{ platforms: PlatformDescriptor[]; capabilities: Capabilities }>('/api/platforms'),

  capabilities: () =>
    request<{ capabilities: Capabilities; limits: { maxFilesizeMb: number; maxBatchUrls: number; fileTtlMs: number } }>(
      '/api/capabilities',
    ),
};

/**
 * Subscribes to a job's live status. Falls back to polling when the browser
 * or a proxy will not keep an SSE stream open.
 */
export function subscribeToJob(
  jobId: string,
  onUpdate: (job: Job) => void,
  onError: (error: ApiError) => void,
): () => void {
  let closed = false;
  let poll: ReturnType<typeof setInterval> | undefined;

  const startPolling = () => {
    if (closed || poll) return;
    poll = setInterval(() => {
      void api
        .job(jobId)
        .then(({ job }) => {
          onUpdate(job);
          if (['completed', 'failed', 'expired'].includes(job.state)) stop();
        })
        .catch((error: unknown) => {
          if (error instanceof ApiError) onError(error);
          stop();
        });
    }, 1200);
  };

  const stop = () => {
    closed = true;
    if (poll) clearInterval(poll);
    poll = undefined;
    source?.close();
  };

  let source: EventSource | undefined;
  try {
    source = new EventSource(`${API_URL}/api/job/${jobId}/events`, { withCredentials: true });
    source.onmessage = (event) => {
      try {
        const { job } = JSON.parse(event.data as string) as { job: Job };
        onUpdate(job);
        if (['completed', 'failed', 'expired'].includes(job.state)) stop();
      } catch {
        /* ignore malformed frames */
      }
    };
    source.onerror = () => {
      source?.close();
      source = undefined;
      if (!closed) startPolling();
    };
  } catch {
    startPolling();
  }

  return stop;
}
