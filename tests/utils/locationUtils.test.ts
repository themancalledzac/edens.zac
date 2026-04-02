/**
 * Tests for locationUtils
 * Tests location conversion, update creation, and diff building
 */
import type { LocationModel } from '@/app/types/Collection';
import {
  buildLocationDiff,
  convertLocationStringToModel,
  createLocationUpdateFromModel,
  slugify,
} from '@/app/utils/locationUtils';

const availableLocations: LocationModel[] = [
  { id: 1, name: 'Seattle, WA', slug: 'seattle-wa' },
  { id: 2, name: 'Chamonix, France', slug: 'chamonix-france' },
  { id: 5, name: 'Portland, OR', slug: 'portland-or' },
];

describe('convertLocationStringToModel', () => {
  describe('with string input', () => {
    it('should find existing location by name', () => {
      const result = convertLocationStringToModel('Seattle, WA', availableLocations);
      expect(result).toEqual({ id: 1, name: 'Seattle, WA', slug: 'seattle-wa' });
    });

    it('should create new location with id: 0 when not found', () => {
      const result = convertLocationStringToModel('Tokyo, Japan', availableLocations);
      expect(result).toEqual({ id: 0, name: 'Tokyo, Japan', slug: '' });
    });

    it('should return null for empty string', () => {
      const result = convertLocationStringToModel('', availableLocations);
      expect(result).toBeNull();
    });
  });

  describe('with object input', () => {
    it('should find existing location by id', () => {
      const result = convertLocationStringToModel(
        { id: 2, name: 'Chamonix, France' },
        availableLocations
      );
      expect(result).toEqual({ id: 2, name: 'Chamonix, France', slug: 'chamonix-france' });
    });

    it('should find existing location by name when id does not match', () => {
      const result = convertLocationStringToModel(
        { id: 999, name: 'Portland, OR' },
        availableLocations
      );
      expect(result).toEqual({ id: 5, name: 'Portland, OR', slug: 'portland-or' });
    });

    it('should return object as-is when not found in available locations', () => {
      const result = convertLocationStringToModel({ id: 42, name: 'Unknown' }, availableLocations);
      expect(result).toEqual({ id: 42, name: 'Unknown', slug: '' });
    });

    it('should try name match for objects with id 0', () => {
      const result = convertLocationStringToModel(
        { id: 0, name: 'Seattle, WA' },
        availableLocations
      );
      expect(result).toEqual({ id: 1, name: 'Seattle, WA', slug: 'seattle-wa' });
    });
  });

  describe('with null/undefined input', () => {
    it('should return null for null', () => {
      expect(convertLocationStringToModel(null, availableLocations)).toBeNull();
    });

    it('should return null for undefined', () => {
      expect(convertLocationStringToModel(undefined, availableLocations)).toBeNull();
    });
  });
});

describe('createLocationUpdateFromModel', () => {
  it('should return { prev: id } for existing location', () => {
    const result = createLocationUpdateFromModel({
      id: 5,
      name: 'Portland, OR',
      slug: 'portland-or',
    });
    expect(result).toEqual({ prev: 5 });
  });

  it('should return { newValue: name } for new location (id: 0)', () => {
    const result = createLocationUpdateFromModel({ id: 0, name: 'New City', slug: '' });
    expect(result).toEqual({ newValue: 'New City' });
  });

  it('should return { remove: true } for null', () => {
    const result = createLocationUpdateFromModel(null);
    expect(result).toEqual({ remove: true });
  });

  it('should return { remove: true } for undefined', () => {
    // eslint-disable-next-line unicorn/no-useless-undefined -- explicitly testing undefined arg
    const result = createLocationUpdateFromModel(undefined);
    expect(result).toEqual({ remove: true });
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

describe('buildLocationDiff', () => {
  it('should return undefined when locations are the same (by id)', () => {
    const result = buildLocationDiff(
      { id: 5, name: 'Portland, OR', slug: 'portland-or' },
      { id: 5, name: 'Portland, OR', slug: 'portland-or' }
    );
    expect(result).toBeUndefined();
  });

  it('should return update when locations differ by id', () => {
    const result = buildLocationDiff(
      { id: 5, name: 'Portland, OR', slug: 'portland-or' },
      { id: 1, name: 'Seattle, WA', slug: 'seattle-wa' }
    );
    expect(result).toEqual({ prev: 5 });
  });

  it('should return undefined when both are null/undefined', () => {
    expect(buildLocationDiff(null, null)).toBeUndefined();
    // eslint-disable-next-line unicorn/no-useless-undefined -- explicitly testing undefined args
    expect(buildLocationDiff(undefined, undefined)).toBeUndefined();
  });

  it('should return update when changing from null to a location', () => {
    const result = buildLocationDiff({ id: 5, name: 'Portland, OR', slug: 'portland-or' }, null);
    expect(result).toEqual({ prev: 5 });
  });

  it('should return remove when changing from a location to null', () => {
    const result = buildLocationDiff(null, { id: 5, name: 'Portland, OR', slug: 'portland-or' });
    expect(result).toEqual({ remove: true });
  });

  it('should compare by name when ids are 0', () => {
    const result = buildLocationDiff(
      { id: 0, name: 'New City', slug: '' },
      { id: 0, name: 'Old City', slug: '' }
    );
    expect(result).toEqual({ newValue: 'New City' });
  });

  it('should return undefined when names match and ids are 0', () => {
    const result = buildLocationDiff(
      { id: 0, name: 'Same City', slug: '' },
      { id: 0, name: 'Same City', slug: '' }
    );
    expect(result).toBeUndefined();
  });
});
