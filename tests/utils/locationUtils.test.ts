/**
 * Tests for locationUtils
 * Tests location conversion, update creation, and diff building
 */
import type { LocationModel } from '@/app/types/Collection';
import {
  buildLocationsDiff,
  convertLocationsToModels,
  createLocationsUpdate,
  slugify,
} from '@/app/utils/locationUtils';

const availableLocations: LocationModel[] = [
  { id: 1, name: 'Seattle, WA', slug: 'seattle-wa' },
  { id: 2, name: 'Chamonix, France', slug: 'chamonix-france' },
  { id: 5, name: 'Portland, OR', slug: 'portland-or' },
];

describe('convertLocationsToModels', () => {
  describe('with null/undefined input', () => {
    it('should return empty array for null', () => {
      expect(convertLocationsToModels(null, availableLocations)).toEqual([]);
    });

    it('should return empty array for undefined', () => {
      expect(convertLocationsToModels(undefined, availableLocations)).toEqual([]);
    });
  });

  describe('with string input', () => {
    it('should find existing location by name and return as array', () => {
      const result = convertLocationsToModels('Seattle, WA', availableLocations);
      expect(result).toEqual([{ id: 1, name: 'Seattle, WA', slug: 'seattle-wa' }]);
    });

    it('should create new location with id: 0 when not found', () => {
      const result = convertLocationsToModels('Tokyo, Japan', availableLocations);
      expect(result).toEqual([{ id: 0, name: 'Tokyo, Japan', slug: '' }]);
    });
  });

  describe('with single object input', () => {
    it('should find existing location by id', () => {
      const result = convertLocationsToModels(
        { id: 2, name: 'Chamonix, France' },
        availableLocations
      );
      expect(result).toEqual([{ id: 2, name: 'Chamonix, France', slug: 'chamonix-france' }]);
    });

    it('should find existing location by name when id does not match', () => {
      const result = convertLocationsToModels({ id: 999, name: 'Portland, OR' }, availableLocations);
      expect(result).toEqual([{ id: 5, name: 'Portland, OR', slug: 'portland-or' }]);
    });

    it('should return object as-is when not found in available locations', () => {
      const result = convertLocationsToModels({ id: 42, name: 'Unknown' }, availableLocations);
      expect(result).toEqual([{ id: 42, name: 'Unknown', slug: '' }]);
    });

    it('should try name match for objects with id 0', () => {
      const result = convertLocationsToModels({ id: 0, name: 'Seattle, WA' }, availableLocations);
      expect(result).toEqual([{ id: 1, name: 'Seattle, WA', slug: 'seattle-wa' }]);
    });
  });

  describe('with array input', () => {
    it('should return empty array for empty array input', () => {
      const result = convertLocationsToModels([], availableLocations);
      expect(result).toEqual([]);
    });

    it('should resolve multiple existing locations by id', () => {
      const input: LocationModel[] = [
        { id: 1, name: 'Seattle, WA', slug: 'seattle-wa' },
        { id: 2, name: 'Chamonix, France', slug: 'chamonix-france' },
      ];
      const result = convertLocationsToModels(input, availableLocations);
      expect(result).toEqual([
        { id: 1, name: 'Seattle, WA', slug: 'seattle-wa' },
        { id: 2, name: 'Chamonix, France', slug: 'chamonix-france' },
      ]);
    });

    it('should handle a mixed array of existing and new locations', () => {
      const input: LocationModel[] = [
        { id: 1, name: 'Seattle, WA', slug: 'seattle-wa' },
        { id: 0, name: 'Tokyo, Japan', slug: '' },
      ];
      const result = convertLocationsToModels(input, availableLocations);
      expect(result).toEqual([
        { id: 1, name: 'Seattle, WA', slug: 'seattle-wa' },
        { id: 0, name: 'Tokyo, Japan', slug: '' },
      ]);
    });
  });
});

describe('createLocationsUpdate', () => {
  it('should return empty object for empty array', () => {
    const result = createLocationsUpdate([]);
    expect(result).toEqual({});
  });

  it('should return { prev } for array of existing locations', () => {
    const locations: LocationModel[] = [
      { id: 5, name: 'Portland, OR', slug: 'portland-or' },
      { id: 1, name: 'Seattle, WA', slug: 'seattle-wa' },
    ];
    const result = createLocationsUpdate(locations);
    expect(result).toEqual({ prev: [5, 1] });
  });

  it('should return { newValue } for array of new locations (id: 0)', () => {
    const locations: LocationModel[] = [
      { id: 0, name: 'New City', slug: '' },
      { id: 0, name: 'Another City', slug: '' },
    ];
    const result = createLocationsUpdate(locations);
    expect(result).toEqual({ newValue: ['New City', 'Another City'] });
  });

  it('should return both prev and newValue for mixed array', () => {
    const locations: LocationModel[] = [
      { id: 5, name: 'Portland, OR', slug: 'portland-or' },
      { id: 0, name: 'New City', slug: '' },
    ];
    const result = createLocationsUpdate(locations);
    expect(result).toEqual({ prev: [5], newValue: ['New City'] });
  });

  it('should omit prev when there are no existing locations', () => {
    const result = createLocationsUpdate([{ id: 0, name: 'New City', slug: '' }]);
    expect(result).not.toHaveProperty('prev');
  });

  it('should omit newValue when there are no new locations', () => {
    const result = createLocationsUpdate([{ id: 5, name: 'Portland, OR', slug: 'portland-or' }]);
    expect(result).not.toHaveProperty('newValue');
  });
});

describe('slugify', () => {
  it('should convert name to lowercase hyphenated slug', () => {
    expect(slugify('Seattle, Washington')).toBe('seattle-washington');
  });

  it('should handle multiple spaces', () => {
    expect(slugify('black and white')).toBe('black-and-white');
  });

  it('should strip special characters', () => {
    expect(slugify('Dolomites, Italy')).toBe('dolomites-italy');
  });

  it('should collapse multiple hyphens', () => {
    expect(slugify('foo - bar')).toBe('foo-bar');
  });

  it('should trim leading/trailing hyphens', () => {
    expect(slugify('-test-')).toBe('test');
  });

  it('should handle already-slugified input', () => {
    expect(slugify('landscape')).toBe('landscape');
  });

  it('should handle apostrophes', () => {
    expect(slugify("St. John's")).toBe('st-johns');
  });
});

describe('buildLocationsDiff', () => {
  it('should return undefined when both arrays are empty', () => {
    expect(buildLocationsDiff([], [])).toBeUndefined();
  });

  it('should return undefined when locations are identical (same ids)', () => {
    const locations: LocationModel[] = [{ id: 5, name: 'Portland, OR', slug: 'portland-or' }];
    expect(buildLocationsDiff(locations, locations)).toBeUndefined();
  });

  it('should return undefined when locations match across two separate arrays', () => {
    const updated: LocationModel[] = [
      { id: 1, name: 'Seattle, WA', slug: 'seattle-wa' },
      { id: 5, name: 'Portland, OR', slug: 'portland-or' },
    ];
    const current: LocationModel[] = [
      { id: 5, name: 'Portland, OR', slug: 'portland-or' },
      { id: 1, name: 'Seattle, WA', slug: 'seattle-wa' },
    ];
    expect(buildLocationsDiff(updated, current)).toBeUndefined();
  });

  it('should return prev when adding a new existing location', () => {
    const updated: LocationModel[] = [
      { id: 1, name: 'Seattle, WA', slug: 'seattle-wa' },
      { id: 5, name: 'Portland, OR', slug: 'portland-or' },
    ];
    const current: LocationModel[] = [{ id: 1, name: 'Seattle, WA', slug: 'seattle-wa' }];
    const result = buildLocationsDiff(updated, current);
    expect(result).toEqual({ prev: [1, 5] });
  });

  it('should return remove when removing a location', () => {
    const updated: LocationModel[] = [{ id: 1, name: 'Seattle, WA', slug: 'seattle-wa' }];
    const current: LocationModel[] = [
      { id: 1, name: 'Seattle, WA', slug: 'seattle-wa' },
      { id: 5, name: 'Portland, OR', slug: 'portland-or' },
    ];
    const result = buildLocationsDiff(updated, current);
    expect(result).toEqual({ prev: [1], remove: [5] });
  });

  it('should return remove without prev when all locations are removed', () => {
    const updated: LocationModel[] = [];
    const current: LocationModel[] = [{ id: 5, name: 'Portland, OR', slug: 'portland-or' }];
    const result = buildLocationsDiff(updated, current);
    expect(result).toEqual({ remove: [5] });
  });

  it('should include newValue for new locations (id: 0)', () => {
    const updated: LocationModel[] = [{ id: 0, name: 'Tokyo, Japan', slug: '' }];
    const current: LocationModel[] = [];
    const result = buildLocationsDiff(updated, current);
    expect(result).toEqual({ newValue: ['Tokyo, Japan'] });
  });

  it('should return undefined when new location names match', () => {
    const loc: LocationModel[] = [{ id: 0, name: 'Same City', slug: '' }];
    expect(buildLocationsDiff(loc, loc)).toBeUndefined();
  });

  it('should detect change when new location name differs', () => {
    const updated: LocationModel[] = [{ id: 0, name: 'New City', slug: '' }];
    const current: LocationModel[] = [{ id: 0, name: 'Old City', slug: '' }];
    const result = buildLocationsDiff(updated, current);
    expect(result).toEqual({ newValue: ['New City'] });
  });

  it('should handle mixed array: prev, newValue, and remove together', () => {
    const updated: LocationModel[] = [
      { id: 1, name: 'Seattle, WA', slug: 'seattle-wa' },
      { id: 0, name: 'Tokyo, Japan', slug: '' },
    ];
    const current: LocationModel[] = [{ id: 5, name: 'Portland, OR', slug: 'portland-or' }];
    const result = buildLocationsDiff(updated, current);
    expect(result).toEqual({ prev: [1], newValue: ['Tokyo, Japan'], remove: [5] });
  });

  it('should default current to empty array when omitted', () => {
    const updated: LocationModel[] = [{ id: 1, name: 'Seattle, WA', slug: 'seattle-wa' }];
    const result = buildLocationsDiff(updated);
    expect(result).toEqual({ prev: [1] });
  });
});
