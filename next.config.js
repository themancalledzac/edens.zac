/* eslint-disable no-undef */
import bundleAnalyzer from '@next/bundle-analyzer';
import path from 'path';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  sassOptions: {
    includePaths: [path.join( process.cwd(), 'styles' )],
  },
  images: {
    unoptimized: true,
    domains: [
      'localhost',
      `${process.env.AWS_CLOUDFRONT_DOMAIN_NAME}.cloudfront.net`,
      // Add your domain here
    ],
    formats: ['image/avif', 'image/webp'],
    // remotePatterns
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  // Add webpack configuration to handle caching
  webpack: (config) => {
    // Custom webpack config if needed
    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
