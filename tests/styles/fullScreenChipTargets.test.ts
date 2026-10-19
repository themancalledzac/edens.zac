/**
 * @jest-environment node
 */

/**
 * The fullscreen viewer's interactive metadata chips must keep a 44px coarse-pointer touch target
 * delivered by an invisible ::after overlay, so the visible chip size never changes, and the
 * metadata chips must stay square. jest and tsc cannot see a CSS-module regression, so this
 * compiles the stylesheet and asserts the resolved declarations directly.
 */

import { join } from 'node:path';

import { compile } from 'sass';

const SOURCE = join(process.cwd(), 'app/components/FullScreenModal/FullScreenModal.module.scss');
const MIN_TOUCH_TARGET = 44;

function coarseOverlayBodies(css: string): string[] {
  const blockPattern =
    /@media \(pointer: coarse\)\s*{\s*\.metadataSectionItemClickable::after\s*{([^}]*)}/g;
  return [...css.matchAll(blockPattern)].map(match => match[1] ?? '');
}

function ruleBodies(css: string, selector: string): string[] {
  const found: string[] = [];
  const needle = `\n${selector} {`;
  let from = css.indexOf(needle);
  while (from !== -1) {
    const open = css.indexOf('{', from);
    const close = css.indexOf('}', open);
    found.push(css.slice(open + 1, close));
    from = css.indexOf(needle, close);
  }
  return found;
}

describe('fullscreen metadata chip touch targets', () => {
  const css = compile(SOURCE).css;
  const overlays = coarseOverlayBodies(css);

  it('adds a centered coarse-pointer ::after overlay to the clickable chip', () => {
    expect(overlays.length).toBeGreaterThan(0);
    for (const body of overlays) {
      expect(body).toMatch(/position:\s*absolute/);
      expect(body).toMatch(/content:\s*(?:""|'')/);
      expect(body).toMatch(/transform:\s*translate\(-50%,\s*-50%\)/);
    }
  });

  it('sizes the overlay at 44px or larger', () => {
    expect(overlays.length).toBeGreaterThan(0);
    for (const body of overlays) {
      expect(body).toContain(`min-width: var(--touch-target-min, ${MIN_TOUCH_TARGET}px)`);
      expect(body).toContain(`min-height: var(--touch-target-min, ${MIN_TOUCH_TARGET}px)`);
    }
  });

  it('has no unconditional ::after overlay on the clickable chip', () => {
    expect(css).not.toMatch(/(?:^|\n)\.metadataSectionItemClickable::after/);
  });

  it('positions the clickable chip relatively so the overlay centers on it', () => {
    const bodies = ruleBodies(css, '.metadataSectionItemClickable');
    expect(bodies.some(body => /position:\s*relative/.test(body))).toBe(true);
  });

  it('keeps the metadata chips square', () => {
    const bodies = ruleBodies(css, '.metadataSectionItem');
    expect(bodies.some(body => body.includes('border-radius: var(--radius-0)'))).toBe(true);
    expect(bodies.some(body => body.includes('border-radius: var(--radius-1)'))).toBe(false);
  });

  it('keeps the chip gap wide enough that wrapped overlays do not steal taps', () => {
    const bodies = ruleBodies(css, '.metadataSectionItems');
    expect(bodies.some(body => body.includes('gap: var(--space-3)'))).toBe(true);
  });
});
