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
    /**
     * Both arrays are pinned to what this site's images can actually supply and what its
     * layout can actually ask for. Measured 2026-08-30 against the live CloudFront origin.
     *
     * Every source image is 2500px on its long edge — the backend's export ceiling, checked
     * across six images spanning 2019 to 2026. Next never enlarges, so the default `deviceSizes`
     * top three (2560, 3200, 3840) all return the identical natural-size encode: 685 KB for
     * `DSC_0045`, byte-for-byte the same file under three different cache keys. They are not
     * higher quality, only more cache entries and a longer srcset.
     *
     * Dropping them makes 2048 the top candidate, and that is where the win is: a retina browser
     * on a full-bleed image picked 3840 and got 685 KB, and now picks 2048 and gets 329 KB. The
     * cost is a 2048px file shown in a slot that could have taken 2500 — a 1.22x upscale on
     * photographic content, not the 1.875x it would be if the sources really were 3840.
     *
     * Nothing in the middle is removed. A browser picks the smallest candidate at or above what
     * it needs, so deleting an intermediate width rounds those requests UP to the next one and
     * costs bytes rather than saving them. 828 stays for that reason alone.
     *
     * `imageSizes` only appears in a srcset when a `sizes` prop is set. The smallest `sizes` in
     * the app is 140px (`CollectionContentRenderer`, `CollectionHeader`), so nothing below 128
     * is reachable even at 1x; those entries only lengthened the attribute. 128 is kept as the
     * floor for any future smaller thumbnail.
     *
     * Quality is deliberately absent. Next 16 defaults `images.qualities` to `[75]` and the
     * optimizer rejects — does not clamp — any other value, while `next/image` sends 75 whenever
     * no `quality` prop is given. So `qualities: [65]` alone would 400 every image on the site;
     * lowering it needs a `quality` prop at the call sites too, which is a render-path change
     * rather than config. Measured prize if that is ever taken: q65 is 13% smaller than q75.
     */
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [128, 256, 384],
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default withBundleAnalyzer(nextConfig);
