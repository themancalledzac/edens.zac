/**
 * Guards C5's fourth bullet. `fullscreen-image.module.scss` used `width > 768px` in 12 blocks while
 * the rest of the repo uses `width >= 768px`. At exactly 768px the two disagree, so the fullscreen
 * wrapper took its mobile branch while the image sizing inside it took the desktop branch.
 *
 * The rule is not "768 is special" — it is that one file must not disagree with the other eighty-odd
 * declarations about which side of the boundary a breakpoint includes. A strict `>` on any px
 * breakpoint leaves the exact boundary width uncovered by either branch.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

/** Every SCSS file under `app/`, as paths relative to the repo root. */
function scssFiles(): string[] {
  return readdirSync(join(ROOT, 'app'), { recursive: true, encoding: 'utf8' })
    .filter(entry => entry.endsWith('.scss'))
    .map(entry => join('app', entry));
}

/** `@media (width > 768px)` and friends — a strict comparison against a px breakpoint. */
const STRICT_PX_BREAKPOINT = /width\s*>\s*\d+px/g;

describe('SCSS breakpoint consistency', () => {
  const files = scssFiles();

  /**
   * A glob that silently matches nothing would make the assertion below trivially true. This fails
   * loudly if the pattern or the layout ever stops finding the stylesheets.
   */
  it('should find the stylesheets it is meant to scan', () => {
    expect(files.length).toBeGreaterThan(20);
    const anyInclusive = files.some(file =>
      readFileSync(join(ROOT, file), 'utf8').includes('width >= ')
    );
    expect(anyInclusive).toBe(true);
  });

  it('should use inclusive >= for every px breakpoint', () => {
    const offenders = files.flatMap(file => {
      const matches = readFileSync(join(ROOT, file), 'utf8').match(STRICT_PX_BREAKPOINT) ?? [];
      return matches.map(
        match =>
          `${file} uses "${match}". The repo standard is ">=", so a strict ">" leaves the exact ` +
          'breakpoint width matching neither branch — the wrapper and its contents can disagree ' +
          'about mobile vs desktop at precisely that width.'
      );
    });

    expect(offenders).toEqual([]);
  });
});
