/**
 * The toolbar's mobile branch has two declarations that only work as a pair.
 *
 * `.toolbar` is `flex-wrap: nowrap` by design, because a flat wrapping bar let the trailing
 * controls land beside whichever chips happened to fit and read as belonging to them. Below 768px
 * that rule starved the chips instead: `.trailing` never shrinks, so at 375px `.controls` was left
 * 126.3px — narrower than one "Highly Rated" chip — and all six chips took a row each.
 *
 * Wrapping fixes that only while `.controls` also carries `flex: 1 0 180px`. The threshold decides
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
    expect(branch).toContain('flex: 1 0 180px');
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
    expect(mobileBranch(scss)).toMatch(/flex:\s*1\s+0\s+180px/);
  });

  it('should open the row gap to --space-2 below 768px so the chip overlays clear the row above', () => {
    expect(mobileBranch(scss)).toMatch(/row-gap:\s*var\(--space-2\)/);
  });

  it('should leave the desktop column gap alone', () => {
    expect(scss).toMatch(/\.toolbar {[^@]*?gap: var\(--space-1\);/);
  });

  it('should keep the trailing group right-pinned rather than pinning it per-branch', () => {
    expect(scss).toContain('margin-left: auto');
    expect(mobileBranch(scss)).not.toContain('margin-left');
  });
});

/**
 * The bottom row must fill up to the density control. An inactive reset × kept as an invisible
 * slot reserved about 35px beside the density control, so a chip that fit there wrapped upward.
 * jsdom has no layout, so the collapse is pinned at the source.
 */
describe('FilterToolbar bottom-row fill', () => {
  const scss = readFileSync(SOURCE, 'utf8');

  it('should collapse the inactive reset × below 768px instead of reserving its width', () => {
    expect(mobileBranch(scss)).toMatch(/\.resetInactive\s*{[^}]*display:\s*none/);
  });

  it('should keep the inactive reset × invisible but in flow on desktop', () => {
    expect(scss).toMatch(/\.resetInactive\s*{\s*visibility:\s*hidden/);
  });
});

describe('FilterToolbar square corners', () => {
  it.each([
    'app/components/ui/FilterChip/FilterChip.module.scss',
    'app/components/ui/FilterToolbar/FilterToolbar.module.scss',
    'app/components/ui/Chip/Chip.module.scss',
  ])('should use --radius-0 and no --radius-1 in %s', file => {
    const source = readFileSync(join(process.cwd(), file), 'utf8');

    expect(source).toContain('border-radius: var(--radius-0)');
    expect(source).not.toContain('--radius-1');
  });
});

/**
 * The chip row has no gaps between chips, so the dividers and the 8px line gap are what keep the
 * 44px overlays apart. jsdom has no layout, so both are pinned at the source.
 */
describe('ChipRow dividers and line gap', () => {
  const chip = readFileSync(join(process.cwd(), 'app/components/ui/Chip/Chip.module.scss'), 'utf8');

  it('should draw a 1px divider before every chip but the first', () => {
    expect(chip).toMatch(/> \* \+ \*::before\s*{[^}]*width: 1px;[^}]*height: 16px;/);
  });

  it('should keep wrapped lines 8px apart', () => {
    expect(chip).toMatch(/\.row {[^}]*row-gap: var\(--space-2\);/);
  });

  it('should keep every chip at least 44px wide and 32px tall', () => {
    expect(chip).toMatch(/\.chip {[^}]*min-width: 44px;[^}]*height: 32px;/);
  });
});
