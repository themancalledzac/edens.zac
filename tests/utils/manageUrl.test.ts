import { manageHref } from '@/app/utils/manageUrl';

describe('manageHref', () => {
  it('builds the ?manage=1 edit-surface entry URL for a slug', () => {
    expect(manageHref('smith-wedding')).toBe('/smith-wedding?manage=1');
  });

  it('keeps the slug verbatim (no encoding or normalization)', () => {
    expect(manageHref('film-pack-002')).toBe('/film-pack-002?manage=1');
  });
});
