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

import { join } from 'node:path';

import { compile } from 'sass';

const SOURCE = join(process.cwd(), 'app/components/FullScreenModal/FullScreenModal.module.scss');
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

  it('declares the toggle with a doubled class so it outranks IconButton', () => {
    expect(css).toContain('.metadataToggle.metadataToggle {');
  });

  it('sizes every metadataToggle rule at 44px or larger', () => {
    const bodies = rulesFor(css, '.metadataToggle.metadataToggle');
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
      /@media[^{]*{[^}]*(?:\.metadataTog{2}le){2}\s*{[^}]*(?:width|height):\s*(?:[0-3]?\d|4[0-3])px/;
    expect(css).not.toMatch(shrinkingMediaBlock);
  });

  it('leaves the sibling close button to IconButton, which already meets the target', () => {
    const bodies = rulesFor(css, '.closeButton.closeButton');
    expect(bodies.length).toBeGreaterThan(0);
    for (const body of bodies) {
      expect(body).not.toMatch(/(?:^|;)\s*(?:width|height):/);
    }
  });
});
