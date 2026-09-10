/**
 * The toolbar's mobile branch has two declarations that only work as a pair.
 *
 * `.toolbar` is `flex-wrap: nowrap` by design, because a flat wrapping bar let the trailing
 * controls land beside whichever chips happened to fit and read as belonging to them. Below 768px
 * that rule starved the chips instead: `.trailing` never shrinks, so at 375px `.controls` was left
 * 126.3px — narrower than one "Highly Rated" chip — and all six chips took a row each.
 *
 * Wrapping fixes that only while `.controls` also carries `flex: 1 0 240px`. The threshold decides
 * per width whether `.trailing` shares the anchored bottom row or takes a line of its own, and the
 * `0` is the half that carries the weight: with shrink enabled, flex squeezes `.controls` under the
 * threshold and shares anyway, which put the slider variant at one chip per line. jsdom computes no
 * layout, so the pairing is pinned at the source.
 *
 * The value it replaced, `flex-basis: 100%`, gave `.trailing` its own line unconditionally — the
 * bottom row held only the photo-size control while every chip stacked above it.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE = join(process.cwd(), 'app/components/ui/FilterToolbar/FilterToolbar.module.scss');

/** The body of the `@media (width < 768px)` block inside `.toolbar`, braces balanced by counting. */
function mobileBranch(scss: string): string {
  const start = scss.indexOf('@media (width < 768px)');
  if (start === -1) return '';

  let depth = 0;
  for (let i = scss.indexOf('{', start); i < scss.length; i += 1) {
    if (scss[i] === '{') depth += 1;
    if (scss[i] === '}') {
      depth -= 1;
      if (depth === 0) return scss.slice(start, i + 1);
    }
  }
  return '';
}

describe('FilterToolbar mobile wrap', () => {
  const scss = readFileSync(SOURCE, 'utf8');

  it('should read a stylesheet that still declares the nowrap default', () => {
    expect(scss).toContain('flex-wrap: nowrap');
  });

  it('should let the bar wrap below 768px', () => {
    expect(mobileBranch(scss)).toContain('flex-wrap: wrap');
  });

  it('should give .controls a shrink-proof basis in the same branch, so the wrap is deterministic', () => {
    const branch = mobileBranch(scss);

    expect(branch).toContain('.controls');
    expect(branch).toContain('flex: 1 0 240px');
  });

  /**
   * The regression this branch now exists to prevent. `flex-basis: 100%` hands `.trailing` a row of
   * its own at every width, which is what stranded the chips above an almost-empty bottom row.
   */
  it('should not force the trailing group onto its own line unconditionally', () => {
    expect(mobileBranch(scss)).not.toContain('flex-basis: 100%');
  });

  /**
   * Shrink must stay at 0. With it enabled flex squeezes `.controls` below the threshold and shares
   * the row anyway, which is the one-chip-per-line layout the threshold is meant to rule out.
   */
  it('should keep flex-shrink at 0 so the threshold forces a wrap rather than a squeeze', () => {
    expect(mobileBranch(scss)).toMatch(/flex:\s*1\s+0\s+240px/);
  });

  it('should keep the trailing group right-pinned rather than pinning it per-branch', () => {
    expect(scss).toContain('margin-left: auto');
    expect(mobileBranch(scss)).not.toContain('margin-left');
  });
});
