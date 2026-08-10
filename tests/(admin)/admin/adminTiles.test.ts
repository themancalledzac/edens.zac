import { ADMIN_TILES } from '@/app/(admin)/admin/adminTiles';

describe('ADMIN_TILES', () => {
  it('has every tileKey unique', () => {
    const keys = ADMIN_TILES.map(t => t.tileKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('has a non-empty label and href for every tile', () => {
    for (const tile of ADMIN_TILES) {
      expect(tile.label.length).toBeGreaterThan(0);
      expect(tile.href.length).toBeGreaterThan(0);
    }
  });

  it('carries no home tile — the hub no longer needs its own way back to /', () => {
    expect(ADMIN_TILES.find(t => t.tileKey === 'home')).toBeUndefined();
  });

  // buildAdminHubContent derives a tile's slug as `href.replace(/^\//, '')`, and
  // getClickEligibility gates isSlugNav on `!!hasSlug`. A tile pointing at '/' would
  // therefore render but navigate nowhere, so no tile may point at the root.
  it('has no tile pointing at the root, which would derive an empty (falsy) slug', () => {
    for (const tile of ADMIN_TILES) {
      expect(tile.href).not.toBe('/');
      expect(tile.href.replace(/^\//, '').length).toBeGreaterThan(0);
    }
  });
});
