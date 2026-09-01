/**
 * The toolbar's mobile branch has two declarations that only work as a pair.
 *
 * `.toolbar` is `flex-wrap: nowrap` by design, because a flat wrapping bar let the trailing
 * controls land beside whichever chips happened to fit and read as belonging to them. Below 768px
 * that rule starved the chips instead: `.trailing` never shrinks, so at 375px `.controls` was left
 * 126.3px — narrower than one "Highly Rated" chip — and all six chips took a row each.
 *
 * Wrapping fixes that only while `.controls` also carries `flex-basis: 100%`. That is what forces
 * `.trailing` onto a line of its own; drop it and the wrap reintroduces the exact arbitrary-line
 * bug the nowrap rule exists to prevent — silently, and only on a phone. jsdom computes no layout,
 * so the pairing is pinned at the source.
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

  it('should give .controls a full-width basis in the same branch, so the wrap is deterministic', () => {
    const branch = mobileBranch(scss);

    expect(branch).toContain('.controls');
    expect(branch).toContain('flex-basis: 100%');
  });

  it('should keep the trailing group right-pinned rather than pinning it per-branch', () => {
    expect(scss).toContain('margin-left: auto');
    expect(mobileBranch(scss)).not.toContain('margin-left');
  });
});
