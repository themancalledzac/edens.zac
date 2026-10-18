/**
 * @jest-environment node
 */

/**
 * The fullscreen metadata toggle must present a 44px tap target at every viewport width.
 *
 * It is the one control inside the fullscreen viewer that a phone user reaches for, and it used to
 * be 36px until a `width >= 768px` step grew it to 40px — smallest exactly where taps happen.
 * jest and tsc cannot see a CSS-module regression, so this compiles the stylesheet and asserts the
 * resolved declarations directly.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { compile } from 'sass';

const SOURCE = join(process.cwd(), 'app/components/FullScreenModal/FullScreenModal.module.scss');
const MODAL_TSX = join(process.cwd(), 'app/components/FullScreenModal/FullScreenModal.tsx');
const DOWNLOAD_TSX = join(
  process.cwd(),
  'app/components/ClientGalleryDownload/FullScreenDownloadButton.tsx'
);
const MIN_TOUCH_TARGET = 44;

function rulesFor(css: string, selector: string): string[] {
  const found: string[] = [];
  const needle = `${selector} {`;
  let from = css.indexOf(needle);

  while (from !== -1) {
    const open = css.indexOf('{', from);
    const close = css.indexOf('}', open);
    found.push(css.slice(open + 1, close));
    from = css.indexOf(needle, close);
  }
  return found;
}

describe('fullscreen metadata toggle touch target', () => {
  const css = compile(SOURCE).css;
  const tsx = readFileSync(MODAL_TSX, 'utf8');

  it('renders the toggle as an IconButton with the scrim variant', () => {
    expect(tsx).toMatch(/<IconButton[^>]*variant="scrim"[^>]*className={styles\.metadataToggle}/);
  });

  it('renders the download toggle as an IconButton with the scrim variant', () => {
    expect(readFileSync(DOWNLOAD_TSX, 'utf8')).toMatch(/<IconButton[^>]*variant="scrim"/);
  });

  it('no longer relies on a doubled class to outrank IconButton', () => {
    expect(css).not.toContain('.metadataToggle.metadataToggle');
    expect(css).not.toContain('.closeButton.closeButton');
  });

  it('sizes every metadataToggle rule at 44px or larger', () => {
    const bodies = rulesFor(css, '.metadataOverlay .metadataToggle');
    expect(bodies.length).toBeGreaterThan(0);

    const sizes = bodies.flatMap(body => [
      ...body.matchAll(/(?:width|height):\s*(\d+(?:\.\d+)?)px/g),
    ]);
    expect(sizes.length).toBeGreaterThan(0);

    for (const match of sizes) {
      expect(Number(match[1])).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    }
  });

  it('has no width-conditional step that shrinks the toggle on narrow viewports', () => {
    const shrinkingMediaBlock =
      /@media[^{]*{[^}]*\.metadataToggle\s*{[^}]*(?:width|height):\s*(?:[0-3]?\d|4[0-3])px/;
    expect(css).not.toMatch(shrinkingMediaBlock);
  });

  it('leaves the sibling close button to IconButton, which already meets the target', () => {
    const bodies = rulesFor(css, '.imageFullScreenWrapper .closeButton');
    expect(bodies.length).toBeGreaterThan(0);
    for (const body of bodies) {
      expect(body).not.toMatch(/(?:^|;)\s*(?:width|height):/);
    }
  });

  it('clears the top safe area with the close button offset', () => {
    const bodies = rulesFor(css, '.imageFullScreenWrapper .closeButton');
    expect(bodies.some(body => body.includes('env(safe-area-inset-top'))).toBe(true);
  });

  it('makes clickable chips block boxes so padding and the hit area lay out', () => {
    const bodies = rulesFor(css, '.metadataSectionItemClickable');
    expect(bodies.some(body => /display:\s*block/.test(body))).toBe(true);
  });
});
