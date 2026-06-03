/**
 * Tests for resolveSsrViewport.
 *
 * Pins the UA-based device split: mobile UAs get the mobile fallback
 * viewport, everything else (desktop, tablet, bots, unknown) gets the
 * desktop fallback. The returned values must match `LAYOUT.ssrDefault*`
 * exactly — Component.tsx's hydration-stability guarantee depends on the
 * server-rendered fallback matching the constants the client reads from.
 */

import { LAYOUT } from '@/app/constants';
import { resolveSsrViewport } from '@/app/utils/ssrViewport';

let mockUaDeviceType: string | undefined;
let mockHeaders: Headers;

jest.mock('next/headers', () => ({
  headers: () => Promise.resolve(mockHeaders),
}));

jest.mock('next/server', () => ({
  userAgent: () => ({ device: { type: mockUaDeviceType } }),
}));

beforeEach(() => {
  mockHeaders = new Headers();
  mockUaDeviceType = undefined;
});

describe('resolveSsrViewport', () => {
  it('returns the desktop fallback for desktop UAs (device.type undefined)', async () => {
    mockUaDeviceType = undefined;
    const v = await resolveSsrViewport();
    expect(v).toEqual({
      contentWidth: LAYOUT.ssrDefaultContentWidthDesktop,
      viewportHeight: LAYOUT.ssrDefaultViewportHeightDesktop,
      isMobile: false,
    });
  });

  it('returns the mobile fallback for mobile UAs', async () => {
    mockUaDeviceType = 'mobile';
    const v = await resolveSsrViewport();
    expect(v).toEqual({
      contentWidth: LAYOUT.ssrDefaultContentWidthMobile,
      viewportHeight: LAYOUT.ssrDefaultViewportHeightMobile,
      isMobile: true,
    });
  });

  it('treats tablet UAs as desktop (wider SSR layout is the safer default)', async () => {
    mockUaDeviceType = 'tablet';
    const v = await resolveSsrViewport();
    expect(v.isMobile).toBe(false);
    expect(v.contentWidth).toBe(LAYOUT.ssrDefaultContentWidthDesktop);
  });

  it('returns desktop defaults for bots and unknown UAs', async () => {
    mockUaDeviceType = undefined;
    const v = await resolveSsrViewport();
    expect(v.isMobile).toBe(false);
  });
});
