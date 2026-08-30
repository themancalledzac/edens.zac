/**
 * @jest-environment node
 *
 * Pins the reasoning behind the image size arrays in `next.config.js`, which is measured rather
 * than conventional and so is easy to "fix" back to the Next defaults.
 *
 * The measurement: every image the backend exports is 2500px on its long edge, checked across six
 * files spanning 2019 to 2026. Next never enlarges, so the default `deviceSizes` entries above
 * that (2560, 3200, 3840) all returned the identical natural-size encode under different cache
 * keys — 685 KB each for `DSC_0045`, versus 329 KB at 2048. Removing them is what makes 2048 the
 * top candidate, and that is the entire byte win.
 *
 * The opposite mistake is guarded too. Tightening an array sounds like it should always save
 * bytes, but a browser picks the smallest candidate at or above what it needs — so deleting an
 * intermediate width rounds those requests UP to the next one and costs bytes. The ladder below
 * 2048 must stay dense.
 *
 * The config is read as text rather than imported: it is ESM that wraps itself in
 * `@next/bundle-analyzer`, and executing that to read two arrays would be a worse trade than
 * parsing them.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The backend's export ceiling — the long edge of every image on the CDN. */
const SOURCE_IMAGE_CEILING = 2500;

/**
 * Next's own `imageConfigDefault.deviceSizes`. The config is this list minus the entries above
 * {@link SOURCE_IMAGE_CEILING} — nothing else. Stating it that way is what distinguishes the
 * intended change from the plausible-looking mistake of thinning the middle of the ladder.
 */
const NEXT_DEFAULT_DEVICE_SIZES = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];

/**
 * The smallest `sizes` value any component declares today (`CollectionContentRenderer`'s
 * 140px thumbnail, matched by `CollectionHeader`'s cover). Nothing below this is reachable.
 */
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
