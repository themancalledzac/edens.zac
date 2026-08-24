/**
 * Guards C2. The `width`/`height` props on a `next/image` do not resize anything here — the CSS is
 * `width: 100%; height: auto` — they set the aspect-ratio box the browser reserves before the file
 * arrives. When they disagree with the real file, the reserved box is the wrong shape and the page
 * visibly reflows the moment the image loads. About declared 1000x500 (2:1) for a 3893x2920 (4:3)
 * file, so opening About shifted every time.
 *
 * The check reads the real dimensions out of the JPEG rather than hardcoding them, so re-cropping
 * or replacing the file fails this test instead of silently reintroducing the shift.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render } from '@testing-library/react';

import { About } from '@/app/components/About/About';

/** Reads pixel dimensions from a JPEG's SOF segment. */
function readJpegSize(relativePath: string): { width: number; height: number } {
  const bytes = readFileSync(join(process.cwd(), relativePath));
  let offset = 2;

  while (offset < bytes.length - 8) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    if (marker === undefined) break;

    const isStartOfFrame =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

    if (isStartOfFrame) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + bytes.readUInt16BE(offset + 2);
  }

  throw new Error(`No JPEG SOF segment found in ${relativePath} — cannot read its dimensions.`);
}

const PROFILE_IMAGE_PATH = 'public/_DSC0145.jpg';

describe('About profile image dimensions', () => {
  it('should declare the aspect ratio of the file it actually renders', () => {
    const file = readJpegSize(PROFILE_IMAGE_PATH);
    const { getByRole } = render(<About />);
    const image = getByRole('img');

    const declaredWidth = Number(image.getAttribute('width'));
    const declaredHeight = Number(image.getAttribute('height'));

    expect(declaredWidth).toBeGreaterThan(0);
    expect(declaredHeight).toBeGreaterThan(0);

    const declaredRatio = declaredWidth / declaredHeight;
    const fileRatio = file.width / file.height;

    /**
     * One rounded pixel of height on a box this size moves the ratio by well under 0.01, so the
     * tolerance admits rounding without admitting a wrong shape. 2:1 against 4:3 is off by 0.67.
     */
    expect(Math.abs(declaredRatio - fileRatio)).toBeLessThan(0.01);
  });

  it('should point at a file that exists, so the ratio check cannot pass vacuously', () => {
    const file = readJpegSize(PROFILE_IMAGE_PATH);

    expect(file.width).toBeGreaterThan(0);
    expect(file.height).toBeGreaterThan(0);

    const { getByRole } = render(<About />);
    expect(getByRole('img').getAttribute('src')).toContain('_DSC0145');
  });
});
