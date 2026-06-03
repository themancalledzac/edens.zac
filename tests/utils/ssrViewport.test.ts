import { getContentWidth, LAYOUT } from '@/app/constants';
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
      contentWidth: getContentWidth(LAYOUT.ssrDefaultViewportWidthDesktop, false),
      viewportHeight: LAYOUT.ssrDefaultViewportHeightDesktop,
      isMobile: false,
    });
  });

  it('returns the mobile fallback for mobile UAs', async () => {
    mockUaDeviceType = 'mobile';
    const v = await resolveSsrViewport();
    expect(v).toEqual({
      contentWidth: getContentWidth(LAYOUT.ssrDefaultViewportWidthMobile, true),
      viewportHeight: LAYOUT.ssrDefaultViewportHeightMobile,
      isMobile: true,
    });
  });

  it('treats tablet UAs as desktop', async () => {
    mockUaDeviceType = 'tablet';
    const v = await resolveSsrViewport();
    expect(v.isMobile).toBe(false);
    expect(v.contentWidth).toBe(getContentWidth(LAYOUT.ssrDefaultViewportWidthDesktop, false));
  });

  it('returns desktop defaults for bots and unknown UAs', async () => {
    mockUaDeviceType = undefined;
    const v = await resolveSsrViewport();
    expect(v.isMobile).toBe(false);
  });
});
