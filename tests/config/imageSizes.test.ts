/**
 * @jest-environment node
 *
 * Pins the image size arrays in `next.config.js` against both the obvious regression (restoring
 * widths the sources cannot fill) and the plausible-looking one (thinning the middle of the
 * ladder, which costs bytes). Read as text because the config is ESM wrapped in the bundle
 * analyzer. Measurements: docs/spikes/2026-features/pf-performance-platform.md
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The backend's export ceiling — the long edge of every image on the CDN. */
const SOURCE_IMAGE_CEILING = 2500;

/** Next's own `imageConfigDefault.deviceSizes`. The config is this, minus what exceeds the ceiling. */
const NEXT_DEFAULT_DEVICE_SIZES = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];

/** Smallest `sizes` any component declares (`CollectionContentRenderer`, `CollectionHeader`). */
const SMALLEST_DECLARED_SIZE = 140;

const config = readFileSync(join(process.cwd(), 'next.config.js'), 'utf8');

function readNumberArray(key: string): number[] {
  const match = new RegExp(String.raw`\n\s*${key}:\s*\[([^\]]*)\]`).exec(config);
  expect(match).not.toBeNull();
  return (match?.[1] ?? '')
    .split(',')
    .map(entry => Number(entry.trim()))
    .filter(entry => Number.isFinite(entry));
}

const deviceSizes = readNumberArray('deviceSizes');
const imageSizes = readNumberArray('imageSizes');

describe('deviceSizes', () => {
  it('is configured rather than left to the Next defaults', () => {
    expect(deviceSizes.length).toBeGreaterThan(0);
  });

  it('offers no width the source images cannot fill', () => {
    expect(Math.max(...deviceSizes)).toBeLessThanOrEqual(SOURCE_IMAGE_CEILING);
  });

  it('still reaches high enough for a retina desktop slot', () => {
    expect(Math.max(...deviceSizes)).toBeGreaterThanOrEqual(2048);
  });

  it('drops only the widths above the ceiling, never an intermediate', () => {
    const retained = NEXT_DEFAULT_DEVICE_SIZES.filter(width => width <= SOURCE_IMAGE_CEILING);
    expect(deviceSizes).toEqual(retained);
  });
});

describe('imageSizes', () => {
  it('stays below the smallest device size, as Next requires', () => {
    expect(Math.max(...imageSizes)).toBeLessThan(Math.min(...deviceSizes));
  });

  it('still covers the smallest thumbnail any component asks for', () => {
    const smallestUsable = imageSizes.filter(size => size >= SMALLEST_DECLARED_SIZE);
    expect(smallestUsable.length).toBeGreaterThan(0);
  });

  it('drops the tiny entries no declared size can ever select', () => {
    expect(Math.min(...imageSizes)).toBeGreaterThanOrEqual(128);
  });
});
