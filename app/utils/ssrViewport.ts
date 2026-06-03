import { headers as nextHeaders } from 'next/headers';
import { userAgent } from 'next/server';

import { LAYOUT } from '@/app/constants';

export interface SsrViewport {
  contentWidth: number;
  viewportHeight: number;
  isMobile: boolean;
}

/**
 * Resolve the SSR fallback viewport for layout composition.
 *
 * Read once per RSC pass and threaded into client components as
 * `serverContentWidth` / `serverViewportHeight` / `serverIsMobile` props. The
 * `Component` layout engine uses these as the fallback when the browser's
 * `useViewport()` hasn't measured yet (SSR + first client render). When the
 * UA-derived defaults match what the browser eventually reports, useMemo's
 * dependency comparison keeps the row set stable across hydration → no layout
 * shift on first paint.
 *
 * Mobile detection comes from Next.js's `userAgent({ headers })` device parse.
 * Bots and unknown UAs fall through to the desktop default — preferring a wide
 * SSR layout for crawlers + the most common traffic shape.
 */
export async function resolveSsrViewport(): Promise<SsrViewport> {
  const requestHeaders = await nextHeaders();
  const ua = userAgent({ headers: requestHeaders });
  const isMobile = ua.device.type === 'mobile';
  return {
    contentWidth: isMobile
      ? LAYOUT.ssrDefaultContentWidthMobile
      : LAYOUT.ssrDefaultContentWidthDesktop,
    viewportHeight: isMobile
      ? LAYOUT.ssrDefaultViewportHeightMobile
      : LAYOUT.ssrDefaultViewportHeightDesktop,
    isMobile,
  };
}
