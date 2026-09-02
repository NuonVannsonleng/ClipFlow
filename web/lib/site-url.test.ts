import { afterEach, describe, expect, it, vi } from 'vitest';

const ENV_KEYS = ['NEXT_PUBLIC_SITE_URL', 'VERCEL_PROJECT_PRODUCTION_URL', 'VERCEL_URL'] as const;
const originalEnv: Record<string, string | undefined> = {};
for (const key of ENV_KEYS) originalEnv[key] = process.env[key];

async function loadSiteUrl(): Promise<string> {
  const mod = await import('./site-url');
  return mod.siteUrl;
}

describe('siteUrl', () => {
  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
    vi.resetModules();
  });

  it('prefers an explicit NEXT_PUBLIC_SITE_URL, trimming a trailing slash', async () => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SITE_URL = 'https://clipflow.example/';
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;
    expect(await loadSiteUrl()).toBe('https://clipflow.example');
  });

  it('falls back to VERCEL_PROJECT_PRODUCTION_URL when no explicit URL is set', async () => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'clipflow.vercel.app';
    delete process.env.VERCEL_URL;
    expect(await loadSiteUrl()).toBe('https://clipflow.vercel.app');
  });

  it('falls back to VERCEL_URL when VERCEL_PROJECT_PRODUCTION_URL is unset', async () => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    process.env.VERCEL_URL = 'clipflow-git-branch.vercel.app';
    expect(await loadSiteUrl()).toBe('https://clipflow-git-branch.vercel.app');
  });

  it('prefers VERCEL_PROJECT_PRODUCTION_URL over VERCEL_URL', async () => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'clipflow-production.vercel.app';
    process.env.VERCEL_URL = 'clipflow-preview.vercel.app';
    expect(await loadSiteUrl()).toBe('https://clipflow-production.vercel.app');
  });

  it('falls back to localhost when nothing is set', async () => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;
    expect(await loadSiteUrl()).toBe('http://localhost:3000');
  });
});
