/**
 * Root App Layout (App Router)
 *
 * What this file is:
 * - The global layout for the App Router. Defines metadata, viewport, font, and wraps children with client Providers.
 *
 * Replaces in the old code:
 * - Replaces _app.tsx and _document.tsx responsibilities from the Pages Router with a single layout file.
 *
 * New Next.js features used:
 * - App Router root layout, Metadata/Viewport exports, and server-first rendering with isolated client Providers island.
 *
 * TODOs / Improvements:
 * - Migrate any remaining global styles toward CSS Modules or scoped styles where possible.
 * - Add additional metadata defaults (Open Graph, Twitter) if needed.
 */
import '@/styles/globals.css';

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import React from 'react';

import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Edens Zac',
    template: '%s | Edens Zac',
  },
  description: 'Edens Zac portfolio',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* Keep global client providers isolated here. */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
