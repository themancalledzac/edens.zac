/**
 * Unit tests for the desktop<->mobile density mapping. The collection page stores
 * row density on the canonical desktop scale (1-10); on mobile the slider is
 * confined to 1-5 and defaults to half the saved density. These helpers convert
 * between the two scales.
 */

import { fromMobileDensity, LAYOUT, toMobileDensity } from '@/app/constants';

describe('toMobileDensity', () => {
  it('halves the saved density (the spec examples)', () => {
    expect(toMobileDensity(4)).toBe(2); // default 4 -> 2 on mobile
    expect(toMobileDensity(10)).toBe(5); // desktop max -> mobile max
  });

  it('clamps into the 1-5 mobile range', () => {
    expect(toMobileDensity(1)).toBe(LAYOUT.minDensity); // 0.5 rounds up, floored at 1
    expect(toMobileDensity(2)).toBe(1);
    expect(toMobileDensity(20)).toBe(LAYOUT.maxDensityMobile); // never exceeds 5
  });

  it('rounds odd densities to the nearest mobile step', () => {
    expect(toMobileDensity(3)).toBe(2); // 1.5 -> 2
    expect(toMobileDensity(5)).toBe(3); // 2.5 -> 3
  });
});

describe('fromMobileDensity', () => {
  it('doubles a mobile slider value back onto the desktop scale', () => {
    expect(fromMobileDensity(2)).toBe(4);
    expect(fromMobileDensity(5)).toBe(10);
    expect(fromMobileDensity(1)).toBe(2);
  });

  it('clamps into the 1-10 desktop range', () => {
    expect(fromMobileDensity(0)).toBe(LAYOUT.minDensity);
    expect(fromMobileDensity(99)).toBe(LAYOUT.maxDensityDesktop);
  });

  it('round-trips even desktop densities exactly', () => {
    for (const d of [2, 4, 6, 8, 10]) {
      expect(fromMobileDensity(toMobileDensity(d))).toBe(d);
    }
  });
});
