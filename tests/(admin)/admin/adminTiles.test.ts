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

  it('marks the about tile as disabled (placeholder until edit feature ships)', () => {
    const about = ADMIN_TILES.find(t => t.tileKey === 'about');
    expect(about).toBeDefined();
    expect(about?.disabled).toBe(true);
  });

  it('points the home tile at /homePage (escape route, not /)', () => {
    const home = ADMIN_TILES.find(t => t.tileKey === 'home');
    expect(home?.href).toBe('/homePage');
  });
});
