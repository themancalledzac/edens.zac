/**
 * Tests for tagUtils
 * Tests tag conversion (name/model resolution) and TagUpdate creation.
 * Mirrors locationUtils — tags are many-to-many (array-based) with the same
 * prev/newValue wire shape.
 */
import type { ContentTagModel } from '@/app/types/Metadata';
import { buildTagsDiff, convertTagsToModels, createTagsUpdate } from '@/app/utils/tagUtils';

const availableTags: ContentTagModel[] = [
  { id: 1, name: 'landscape', slug: 'landscape' },
  { id: 2, name: 'portrait', slug: 'portrait' },
  { id: 5, name: 'mountains', slug: 'mountains' },
];

describe('convertTagsToModels', () => {
  describe('with null/undefined input', () => {
    it('should return empty array for null', () => {
      expect(convertTagsToModels(null, availableTags)).toEqual([]);
    });

    it('should return empty array for undefined', () => {
      expect(convertTagsToModels(undefined, availableTags)).toEqual([]);
    });
  });

  describe('with string input', () => {
    it('should find existing tag by name and return as array', () => {
      const result = convertTagsToModels('landscape', availableTags);
      expect(result).toEqual([{ id: 1, name: 'landscape', slug: 'landscape' }]);
    });

    it('should create new tag with id: 0 when not found', () => {
      const result = convertTagsToModels('sunset', availableTags);
      expect(result).toEqual([{ id: 0, name: 'sunset', slug: '' }]);
    });
  });

  describe('with string[] input (collection.tags shape)', () => {
    it('should resolve all known tag names to full models', () => {
      const result = convertTagsToModels(['landscape', 'mountains'], availableTags);
      expect(result).toEqual([
        { id: 1, name: 'landscape', slug: 'landscape' },
        { id: 5, name: 'mountains', slug: 'mountains' },
      ]);
    });

    it('should mix resolved models with id: 0 for unknown names', () => {
      const result = convertTagsToModels(['landscape', 'sunset'], availableTags);
      expect(result).toEqual([
        { id: 1, name: 'landscape', slug: 'landscape' },
        { id: 0, name: 'sunset', slug: '' },
      ]);
    });

    it('should return empty array for empty array input', () => {
      expect(convertTagsToModels([], availableTags)).toEqual([]);
    });
  });

  describe('with model input', () => {
    it('should find existing tag by id', () => {
      const result = convertTagsToModels([{ id: 2, name: 'portrait', slug: '' }], availableTags);
      expect(result).toEqual([{ id: 2, name: 'portrait', slug: 'portrait' }]);
    });

    it('should find existing tag by name when id does not match', () => {
      const result = convertTagsToModels([{ id: 999, name: 'mountains', slug: '' }], availableTags);
      expect(result).toEqual([{ id: 5, name: 'mountains', slug: 'mountains' }]);
    });

    it('should return model as-is when not found in available tags', () => {
      const result = convertTagsToModels([{ id: 42, name: 'Unknown', slug: '' }], availableTags);
      expect(result).toEqual([{ id: 42, name: 'Unknown', slug: '' }]);
    });

    it('should resolve an id: 0 model by name', () => {
      const result = convertTagsToModels([{ id: 0, name: 'landscape', slug: '' }], availableTags);
      expect(result).toEqual([{ id: 1, name: 'landscape', slug: 'landscape' }]);
    });

    it('should handle a mixed array of existing and new tags', () => {
      const result = convertTagsToModels(
        [
          { id: 1, name: 'landscape', slug: 'landscape' },
          { id: 0, name: 'sunset', slug: '' },
        ],
        availableTags
      );
      expect(result).toEqual([
        { id: 1, name: 'landscape', slug: 'landscape' },
        { id: 0, name: 'sunset', slug: '' },
      ]);
    });
  });
});

describe('createTagsUpdate', () => {
  it('should return empty object for empty array', () => {
    expect(createTagsUpdate([])).toEqual({});
  });

  it('should return { prev } for array of existing tags', () => {
    const tags: ContentTagModel[] = [
      { id: 5, name: 'mountains', slug: 'mountains' },
      { id: 1, name: 'landscape', slug: 'landscape' },
    ];
    expect(createTagsUpdate(tags)).toEqual({ prev: [5, 1] });
  });

  it('should return { newValue } for array of new tags (id: 0)', () => {
    const tags: ContentTagModel[] = [
      { id: 0, name: 'sunset', slug: '' },
      { id: 0, name: 'golden hour', slug: '' },
    ];
    expect(createTagsUpdate(tags)).toEqual({ newValue: ['sunset', 'golden hour'] });
  });

  it('should return both prev and newValue for mixed array', () => {
    const tags: ContentTagModel[] = [
      { id: 5, name: 'mountains', slug: 'mountains' },
      { id: 0, name: 'sunset', slug: '' },
    ];
    expect(createTagsUpdate(tags)).toEqual({ prev: [5], newValue: ['sunset'] });
  });

  it('should omit prev when there are no existing tags', () => {
    expect(createTagsUpdate([{ id: 0, name: 'sunset', slug: '' }])).not.toHaveProperty('prev');
  });

  it('should omit newValue when there are no new tags', () => {
    expect(createTagsUpdate([{ id: 5, name: 'mountains', slug: 'mountains' }])).not.toHaveProperty(
      'newValue'
    );
  });
});

describe('buildTagsDiff', () => {
  const tag = (id: number, name: string): ContentTagModel => ({ id, name, slug: name });

  it('returns undefined when the selection is unchanged', () => {
    const current = [tag(1, 'landscape'), tag(5, 'mountains')];
    const updated = [tag(5, 'mountains'), tag(1, 'landscape')]; // order-insensitive for existing
    expect(buildTagsDiff(updated, current)).toBeUndefined();
  });

  it('emits remove for a deselected existing tag (the removal-bug fix)', () => {
    const current = [tag(1, 'landscape'), tag(5, 'mountains')];
    const updated = [tag(1, 'landscape')]; // dropped mountains
    expect(buildTagsDiff(updated, current)).toEqual({ prev: [1], remove: [5] });
  });

  it('emits remove for ALL ids when clearing every tag', () => {
    const current = [tag(1, 'landscape'), tag(5, 'mountains')];
    expect(buildTagsDiff([], current)).toEqual({ remove: [1, 5] });
  });

  it('emits prev for a newly added existing tag', () => {
    const current = [tag(1, 'landscape')];
    const updated = [tag(1, 'landscape'), tag(2, 'portrait')];
    expect(buildTagsDiff(updated, current)).toEqual({ prev: [1, 2] });
  });

  it('emits newValue for a brand-new tag (id 0) without remove', () => {
    const current = [tag(1, 'landscape')];
    const updated = [tag(1, 'landscape'), tag(0, 'sunset')];
    expect(buildTagsDiff(updated, current)).toEqual({ prev: [1], newValue: ['sunset'] });
  });

  it('combines prev, newValue, and remove in one diff', () => {
    const current = [tag(1, 'landscape'), tag(5, 'mountains')];
    const updated = [tag(1, 'landscape'), tag(0, 'sunset')]; // keep 1, drop 5, add new
    expect(buildTagsDiff(updated, current)).toEqual({
      prev: [1],
      newValue: ['sunset'],
      remove: [5],
    });
  });

  it('treats a missing current as an empty baseline (everything is an add)', () => {
    expect(buildTagsDiff([tag(1, 'landscape')])).toEqual({ prev: [1] });
  });

  it('detects a change when only the new-tag names differ', () => {
    const current = [tag(0, 'sunset')];
    const updated = [tag(0, 'golden hour')];
    expect(buildTagsDiff(updated, current)).toEqual({ newValue: ['golden hour'] });
  });
});
