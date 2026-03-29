/* eslint-disable no-undef */
import bundleAnalyzer from '@next/bundle-analyzer';
import path from 'path';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.NEXT_BUILD_DIR ? { distDir: process.env.NEXT_BUILD_DIR } : {}),
  reactStrictMode: true,
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
        hostname: '*.cloudfront.net',
      },
    ],
    formats: ['image/webp'], // Don't attempt AVIF — backend already serves optimized WebP
    minimumCacheTTL: 86400, // Cache optimized images for 24 hours
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
