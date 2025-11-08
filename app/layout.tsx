/**
 * Root App Layout
 *
 * Global layout component for the App Router that defines application-wide
 * configuration including metadata, viewport settings, fonts, and provider
 * wrapping. Replaces _app.tsx and _document.tsx from Pages Router.
 *
 * @dependencies
 * - Inter font from Google Fonts
 * - globals.css for application-wide styles
 *
 * @exports
 * - metadata - Application metadata configuration
 * - viewport - Viewport and theme configuration
 * - RootLayout - Root layout component
 *
 * @returns React Server Component wrapping entire application
 */
import '@/app/styles/globals.css';

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import React from 'react';

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
      <body className={inter.className}>{children}</body>
    </html>
  );
}
