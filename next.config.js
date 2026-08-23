/* eslint-disable no-undef */
import bundleAnalyzer from '@next/bundle-analyzer';
import path from 'path';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/**
 * The production CloudFront distribution, pinned in D4.
 *
 * Single source of truth on purpose: the image optimizer's `remotePatterns` allowlist and
 * the CSP's `img-src`/`media-src` have to name the same host, and two literals drift.
 */
const CLOUDFRONT_HOST = 'd2qp8h5pbkohe6.cloudfront.net';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Content Security Policy — report-only for now.
 *
 * Report-only because a wrong directive breaks the site with no error anyone would notice,
 * and this policy is derived from reading the code rather than from measured traffic.
 * Violations land in the browser console; rename the header to `Content-Security-Policy`
 * once a pass over the real pages leaves it quiet.
 *
 * `'unsafe-inline'` is load-bearing for both `script-src` and `style-src`: Next inlines the
 * hydration payload and its style tags. Removing it needs per-request nonces, which means
 * moving the CSP into `proxy.ts` — a separate change, not this one.
 *
 * Dev widens three directives. React Refresh needs `'unsafe-eval'`, HMR needs a websocket,
 * and the local backend on `:8080` serves images that production takes from CloudFront.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `img-src 'self' blob: data: https://${CLOUDFRONT_HOST}${isDev ? ' http://localhost:*' : ''}`,
  `media-src 'self' blob: https://${CLOUDFRONT_HOST}${isDev ? ' http://localhost:*' : ''}`,
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  `connect-src 'self'${isDev ? ' ws: wss: http://localhost:*' : ''}`,
].join('; ');

/**
 * Site-wide security headers. Amplify injects none of these — verified against production
 * on 2026-08-23 — so this config is the only place they can come from.
 *
 * `X-Frame-Options: DENY` is what actually stops framing today; the CSP's `frame-ancestors`
 * is here so the policy is already correct when it flips to enforcing.
 *
 * HSTS deliberately omits `includeSubDomains` and `preload`. Both are hard to walk back —
 * `preload` requires a removal request to the browser vendors' list — and neither was asked
 * for. Two years of `max-age` is the reversible part of the win.
 */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
  { key: 'Content-Security-Policy-Report-Only', value: csp },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.NEXT_BUILD_DIR ? { distDir: process.env.NEXT_BUILD_DIR } : {}),
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  // Allow the dev server's internal endpoints (HMR, client-side navigation / RSC) to be
  // requested from these LAN origins, so the site is testable from a phone over Wi-Fi.
  // Dev-only; ignored in production. Update with your machine's LAN IP(s) if they change.
  allowedDevOrigins: ['192.168.68.55', '192.168.68.59', '192.168.68.60'],
  sassOptions: {
    includePaths: [path.join(process.cwd(), 'styles')],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: CLOUDFRONT_HOST,
      },
    ],
    formats: ['image/webp'], // Don't attempt AVIF — backend already serves optimized WebP
    minimumCacheTTL: 86400, // Cache optimized images for 24 hours
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default withBundleAnalyzer(nextConfig);
