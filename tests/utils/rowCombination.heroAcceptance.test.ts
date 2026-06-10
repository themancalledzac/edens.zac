import { buildRows } from '@/app/utils/rowCombination';
import { createPanorama,H } from '@/tests/fixtures/contentFixtures';

describe('acceptance: wide 5★ panorama prominence (was isFullWidthHero on 0180)', () => {
  it('gives a wide 5★ panorama its own row at medium density', () => {
    const rows = buildRows([H(1, 3), H(2, 3), createPanorama(3, 5), H(4, 3)], 10, 1.5);
    const solo = rows.find(r => r.components.length === 1 && r.components[0]!.id === 3);
    expect(solo).toBeDefined();
  });
  it('lets a wide 5★ panorama share at high density', () => {
    const rows = buildRows([H(1, 3), H(2, 3), createPanorama(3, 5), H(4, 3)], 20, 1.5);
    const soloPano = rows.find(r => r.components.length === 1 && r.components[0]!.id === 3);
    expect(soloPano).toBeUndefined();
  });
});
