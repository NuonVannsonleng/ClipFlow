import type { NextConfig } from 'next';

/**
 * Where the ClipFlow API actually runs. Used only on the Next server, to proxy
 * `/api/*` through this origin — the browser never needs to know the API port,
 * which means no CORS, no cookie surprises, and no "wrong port" failures.
 */
const apiOrigin = (process.env.API_ORIGIN ?? 'http://localhost:4000').replace(/\/$/, '');

// A cloud build that still points at localhost would deploy successfully and
// then fail every request at runtime, which is far harder to diagnose than a
// failed build. Local production builds are left alone - localhost is correct
// there.
const isCloudBuild = Boolean(process.env.VERCEL || process.env.NETLIFY || process.env.CF_PAGES);
if (isCloudBuild && /^https?:\/\/(localhost|127\.0\.0\.1)/.test(apiOrigin)) {
  throw new Error(
    'API_ORIGIN is still http://localhost:4000 on a cloud build. ' +
      'The ClipFlow API is a long-running server and cannot be deployed here; ' +
      'host it separately (see server/Dockerfile) and set API_ORIGIN to its public URL.',
  );
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Thumbnails come straight from the source platform's CDN.
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
