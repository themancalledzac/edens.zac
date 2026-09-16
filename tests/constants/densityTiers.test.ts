import { DENSITY_TIERS, LAYOUT, nearestDensityTier } from '@/app/constants';

describe('DENSITY_TIERS', () => {
  it('sets the medium desktop tier to five across', () => {
    expect(DENSITY_TIERS[1]).toEqual({
      key: 'medium',
      label: 'Medium photos',
      desktop: 5,
      mobile: 2,
    });
  });

  it('still highlights Medium for a page that opens at the default density', () => {
    expect(nearestDensityTier(LAYOUT.defaultChunkSize, false)).toBe('medium');
  });
});
