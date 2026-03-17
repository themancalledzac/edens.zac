/**
 * Tests for locationUtils
 * Tests location conversion, update creation, and diff building
 */
import {
  buildLocationDiff,
  convertLocationStringToModel,
  createLocationUpdateFromModel,
} from '@/app/utils/locationUtils';
import type { LocationModel } from '@/app/types/Collection';

const availableLocations: LocationModel[] = [
  { id: 1, name: 'Seattle, WA' },
  { id: 2, name: 'Chamonix, France' },
  { id: 5, name: 'Portland, OR' },
];

describe('convertLocationStringToModel', () => {
  describe('with string input', () => {
    it('should find existing location by name', () => {
      const result = convertLocationStringToModel('Seattle, WA', availableLocations);
      expect(result).toEqual({ id: 1, name: 'Seattle, WA' });
    });

    it('should create new location with id: 0 when not found', () => {
      const result = convertLocationStringToModel('Tokyo, Japan', availableLocations);
      expect(result).toEqual({ id: 0, name: 'Tokyo, Japan' });
    });

    it('should return null for empty string', () => {
      const result = convertLocationStringToModel('', availableLocations);
      expect(result).toBeNull();
    });
  });

  describe('with object input', () => {
    it('should find existing location by id', () => {
      const result = convertLocationStringToModel({ id: 2, name: 'Chamonix, France' }, availableLocations);
      expect(result).toEqual({ id: 2, name: 'Chamonix, France' });
    });

    it('should find existing location by name when id does not match', () => {
      const result = convertLocationStringToModel({ id: 999, name: 'Portland, OR' }, availableLocations);
      expect(result).toEqual({ id: 5, name: 'Portland, OR' });
    });

    it('should return object as-is when not found in available locations', () => {
      const result = convertLocationStringToModel({ id: 42, name: 'Unknown' }, availableLocations);
      expect(result).toEqual({ id: 42, name: 'Unknown' });
    });

    it('should try name match for objects with id 0', () => {
      const result = convertLocationStringToModel({ id: 0, name: 'Seattle, WA' }, availableLocations);
      expect(result).toEqual({ id: 1, name: 'Seattle, WA' });
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
    const result = createLocationUpdateFromModel({ id: 5, name: 'Portland, OR' });
    expect(result).toEqual({ prev: 5 });
  });

  it('should return { newValue: name } for new location (id: 0)', () => {
    const result = createLocationUpdateFromModel({ id: 0, name: 'New City' });
    expect(result).toEqual({ newValue: 'New City' });
  });

  it('should return { remove: true } for null', () => {
    const result = createLocationUpdateFromModel(null);
    expect(result).toEqual({ remove: true });
  });

  it('should return { remove: true } for undefined', () => {
    const result = createLocationUpdateFromModel(undefined);
    expect(result).toEqual({ remove: true });
  });
});

describe('buildLocationDiff', () => {
  it('should return undefined when locations are the same (by id)', () => {
    const result = buildLocationDiff(
      { id: 5, name: 'Portland, OR' },
      { id: 5, name: 'Portland, OR' }
    );
    expect(result).toBeUndefined();
  });

  it('should return update when locations differ by id', () => {
    const result = buildLocationDiff(
      { id: 5, name: 'Portland, OR' },
      { id: 1, name: 'Seattle, WA' }
    );
    expect(result).toEqual({ prev: 5 });
  });

  it('should return undefined when both are null/undefined', () => {
    expect(buildLocationDiff(null, null)).toBeUndefined();
    expect(buildLocationDiff(undefined, undefined)).toBeUndefined();
  });

  it('should return update when changing from null to a location', () => {
    const result = buildLocationDiff({ id: 5, name: 'Portland, OR' }, null);
    expect(result).toEqual({ prev: 5 });
  });

  it('should return remove when changing from a location to null', () => {
    const result = buildLocationDiff(null, { id: 5, name: 'Portland, OR' });
    expect(result).toEqual({ remove: true });
  });

  it('should compare by name when ids are 0', () => {
    const result = buildLocationDiff(
      { id: 0, name: 'New City' },
      { id: 0, name: 'Old City' }
    );
    expect(result).toEqual({ newValue: 'New City' });
  });

  it('should return undefined when names match and ids are 0', () => {
    const result = buildLocationDiff(
      { id: 0, name: 'Same City' },
      { id: 0, name: 'Same City' }
    );
    expect(result).toBeUndefined();
  });
});
