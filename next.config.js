/* eslint-disable no-undef */
import bundleAnalyzer from '@next/bundle-analyzer';
import path from 'path';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Inline server-side env vars at build time so they're available in Amplify SSR Lambda.
  // These are only referenced in Route Handlers (server-only), so they won't appear in client bundles.
  env: {
    API_URL: process.env.API_URL,
    INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET,
  },
  reactStrictMode: true,
  sassOptions: {
    includePaths: [path.join(process.cwd(), 'styles')],
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: `${process.env.AWS_CLOUDFRONT_DOMAIN_NAME}.cloudfront.net`,
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  turbopack: {
    root: process.cwd(),
  },
  // Add webpack configuration to handle caching
  webpack: config => {
    // Custom webpack config if needed
    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
