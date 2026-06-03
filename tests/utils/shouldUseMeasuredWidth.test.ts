/**
 * Unit tests for shouldUseMeasuredWidth — the asymmetric decision that fixes the desktop→tablet
 * horizontal-overflow bug (body wider than the viewport across the [1236, 1300) band).
 *
 * The key property: when the client is NARROWER than the SSR-assumed width, the layout must
 * recompute for ANY shortfall (keeping the wider SSR width would overflow). The tolerance only
 * applies in the "client wider" direction, where keeping the narrower SSR layout can't overflow.
 */

import { shouldUseMeasuredWidth } from '@/app/constants';

const TOL = 64;

describe('shouldUseMeasuredWidth', () => {
  it('returns false before the client has measured (width 0)', () => {
    expect(shouldUseMeasuredWidth(0, 1274.4, TOL)).toBe(false);
  });

  it('uses the measured width when no SSR width was provided', () => {
    expect(shouldUseMeasuredWidth(1000, null, TOL)).toBe(true);
    expect(shouldUseMeasuredWidth(1000, undefined, TOL)).toBe(true);
  });

  it('recomputes whenever the client is narrower than the SSR width (the overflow fix)', () => {
    // viewport 1236 → measured 1210.4; SSR desktop default → 1274.4; difference is exactly the
    // 64px tolerance. The old symmetric `Math.abs(diff) > tolerance` returned FALSE here and used
    // the 1274.4 width on a 1236px viewport → overflow. Asymmetric check recomputes.
    expect(shouldUseMeasuredWidth(1210.4, 1274.4, TOL)).toBe(true);
    // Anywhere inside the band (e.g. viewport 1280 → measured 1254.4, 20px short) must also recompute.
    expect(shouldUseMeasuredWidth(1254.4, 1274.4, TOL)).toBe(true);
    // Even a 1px shortfall recomputes (keeping a wider SSR width would overflow by 1px).
    expect(shouldUseMeasuredWidth(1273.4, 1274.4, TOL)).toBe(true);
  });

  it('keeps the SSR width when the client matches or is slightly wider (no overflow, avoids flash)', () => {
    expect(shouldUseMeasuredWidth(1274.4, 1274.4, TOL)).toBe(false); // exact match
    expect(shouldUseMeasuredWidth(1300, 1274.4, TOL)).toBe(false); // 25.6px wider, within tolerance
    expect(shouldUseMeasuredWidth(1274.4 + TOL, 1274.4, TOL)).toBe(false); // exactly tolerance wider
  });

  it('recomputes when the client is wider than the SSR width beyond the tolerance', () => {
    // e.g. SSR guessed mobile, client is desktop → recompute to fill the space.
    expect(shouldUseMeasuredWidth(1274.4 + TOL + 0.1, 1274.4, TOL)).toBe(true);
    expect(shouldUseMeasuredWidth(1248.4, 390, TOL)).toBe(true);
  });
});
