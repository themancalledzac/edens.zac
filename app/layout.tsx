/**
 * Root App Router layout: application-wide metadata, viewport, fonts, and
 * provider wrapping.
 */
import '@/app/styles/globals.css';

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { type ReactNode } from 'react';

import { Footer } from '@/app/components/Footer/Footer';
import { SkipLink } from '@/app/components/ui/SkipLink/SkipLink';
import { CDN_ORIGIN } from '@/app/constants';

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
  themeColor: '#ffffff', // = --color-surface (var(--color-white)); keep in sync if the surface color changes
};

/**
 * `<SkipLink>` sits above `{children}` — and therefore above the route segment's Suspense
 * boundary — so it reaches the browser in the shell's first bytes, ahead of the `<Footer>` that
 * ships with the same shell. Rendered from inside a page shell it landed in React's deferred
 * buffer instead, leaving the footer's links as the page's first tab stops for as long as the
 * boundary took to resolve. Every route pairs it with a landing zone; see {@link SkipLink}.
 *
 * The CloudFront `preconnect` starts DNS/TCP/TLS during HTML parse rather than at the first
 * `<img>`. `crossOrigin` is required: image requests are anonymous-CORS, and a mismatched
 * preconnect opens a connection they cannot reuse.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href={CDN_ORIGIN} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={CDN_ORIGIN} />
      </head>
      <body className={inter.className}>
        <SkipLink />
        {children}
        <Footer />
      </body>
    </html>
  );
}
