/**
 * Root App Router layout: application-wide metadata, viewport, fonts, and
 * provider wrapping.
 */
import '@/app/styles/globals.css';

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { type ReactNode } from 'react';

import { Footer } from '@/app/components/Footer/Footer';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

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
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <Footer />
      </body>
    </html>
  );
}
