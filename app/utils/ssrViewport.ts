import { headers as nextHeaders } from 'next/headers';
import { userAgent } from 'next/server';

import { getContentWidth, LAYOUT } from '@/app/constants';

export interface SsrViewport {
  contentWidth: number;
  viewportHeight: number;
  isMobile: boolean;
}

/**
 * Pick the SSR fallback viewport from the request User-Agent. Threaded into
 * `Component` so the BoxTree composes server-side with reserved per-item
 * dimensions, and so the first client render with measured viewport === SSR
 * viewport produces the same row set (no hydration shift).
 *
 * Non-mobile UAs (including bots and unknowns) get the desktop default.
 */
export async function resolveSsrViewport(): Promise<SsrViewport> {
  const requestHeaders = await nextHeaders();
  const isMobile = userAgent({ headers: requestHeaders }).device.type === 'mobile';
  const viewportWidth = isMobile
    ? LAYOUT.ssrDefaultViewportWidthMobile
    : LAYOUT.ssrDefaultViewportWidthDesktop;
  const viewportHeight = isMobile
    ? LAYOUT.ssrDefaultViewportHeightMobile
    : LAYOUT.ssrDefaultViewportHeightDesktop;
  return {
    contentWidth: getContentWidth(viewportWidth, isMobile),
    viewportHeight,
    isMobile,
  };
}
