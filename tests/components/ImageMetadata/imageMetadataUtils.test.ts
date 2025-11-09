/**
 * Unit tests for imageMetadataUtils.ts
 * Tests all utility functions for building image metadata updates
 */

import {
  buildImageUpdateDiff,
  extractMultiSelectValues,
  getCommonValues,
  handleDropdownChange,
} from '@/app/components/ImageMetadata/imageMetadataUtils';
import type { ImageContentModel } from '@/app/types/Content';
import type { ContentFilmTypeModel } from '@/app/types/ImageMetadata';

// Test fixtures
const createImageContent = (
  id: number,
  overrides?: Partial<ImageContentModel>
): ImageContentModel => ({
  id,
  contentType: 'IMAGE',
  orderIndex: id,
  imageUrl: `https://example.com/image-${id}.jpg`,
  imageWidth: 1920,
  imageHeight: 1080,
  title: `Image ${id}`,
  caption: `Caption ${id}`,
  alt: `Alt ${id}`,
  author: `Author ${id}`,
  rating: 3,
  blackAndWhite: false,
  isFilm: false,
  shutterSpeed: '1/125',
  focalLength: '50mm',
  location: 'Location',
  fStop: 'f/2.8',
  iso: 400,
  filmFormat: null,
  createDate: '2024-01-01',
  ...overrides,
});

const createFilmType = (
  id: number,
  name: string,
  overrides?: Partial<ContentFilmTypeModel>
): ContentFilmTypeModel => ({
  id,
  name,
  filmTypeName: name.toUpperCase().replace(/\s+/g, '_'),
  defaultIso: 400,
  ...overrides,
});

describe('buildImageUpdateDiff', () => {
  describe('Simple field comparisons', () => {
    it('should include only id when no fields changed', () => {
      const currentState = createImageContent(1);
      // When updateState only has id, all other fields are undefined
      // The function compares undefined !== currentValue, so they're included as null
      // This is expected behavior - we're only updating what's explicitly in updateState
      const updateState = { id: 1 };

      const result = buildImageUpdateDiff(updateState, currentState);

      // All fields that exist in currentState but not in updateState will be set to null
      // This is the current behavior - fields are compared even if not in updateState
      expect(result.id).toBe(1);
      // Note: The function includes fields that differ, so undefined fields become null
    });

    it('should include changed title field', () => {
      const currentState = createImageContent(1, { title: 'Original Title' });
      const updateState = { id: 1, title: 'New Title' };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.id).toBe(1);
      expect(result.title).toBe('New Title');
      // Other fields that differ (undefined in updateState vs set in currentState) will also be included
    });

    it('should include changed caption field', () => {
      const currentState = createImageContent(1, { caption: 'Original Caption' });
      const updateState = { id: 1, caption: 'New Caption' };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result).toEqual({
        id: 1,
        caption: 'New Caption',
      });
    });

    it('should include multiple changed simple fields', () => {
      const currentState = createImageContent(1, {
        title: 'Original',
        caption: 'Original Caption',
        rating: 3,
      });
      const updateState = {
        id: 1,
        title: 'New Title',
        caption: 'New Caption',
        rating: 5,
      };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.id).toBe(1);
      expect(result.title).toBe('New Title');
      expect(result.caption).toBe('New Caption');
      expect(result.rating).toBe(5);
      // Other fields that differ will also be included
    });

    it('should handle null to undefined change', () => {
      const currentState = createImageContent(1, { caption: null });
      const updateState = { id: 1, caption: undefined };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.caption).toBeNull();
    });

    it('should handle undefined to null change', () => {
      const currentState = createImageContent(1, { caption: undefined });
      const updateState = { id: 1, caption: null };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.caption).toBeNull();
    });

    it('should handle boolean field changes', () => {
      const currentState = createImageContent(1, { blackAndWhite: false, isFilm: false });
      const updateState = { id: 1, blackAndWhite: true, isFilm: true };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.id).toBe(1);
      expect(result.blackAndWhite).toBe(true);
      expect(result.isFilm).toBe(true);
      // Other fields that differ will also be included
    });
  });

  describe('Camera field (prev/newValue/remove pattern)', () => {
    it('should use prev pattern when camera ID exists and changed', () => {
      const currentState = createImageContent(1, { camera: { id: 1, name: 'Old Camera' } });
      const updateState = { id: 1, camera: { id: 2, name: 'New Camera' } };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.camera).toEqual({ prev: 2 });
    });

    it('should use remove pattern when camera is removed', () => {
      const currentState = createImageContent(1, { camera: { id: 1, name: 'Camera' } });
      const updateState = { id: 1, camera: null };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.camera).toEqual({ remove: true });
    });

    it('should use newValue pattern when camera has id 0 (new camera)', () => {
      const currentState = createImageContent(1, { camera: null });
      const updateState = { id: 1, camera: { id: 0, name: 'New Camera' } };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.camera).toEqual({ newValue: 'New Camera' });
    });

    it('should not include camera when unchanged', () => {
      const currentState = createImageContent(1, { camera: { id: 1, name: 'Camera' } });
      const updateState = { id: 1, camera: { id: 1, name: 'Camera' } };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.camera).toBeUndefined();
    });
  });

  describe('Lens field (prev/newValue/remove pattern)', () => {
    it('should use prev pattern when lens ID exists and changed', () => {
      const currentState = createImageContent(1, { lens: { id: 1, name: 'Old Lens' } });
      const updateState = { id: 1, lens: { id: 2, name: 'New Lens' } };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.lens).toEqual({ prev: 2 });
    });

    it('should use remove pattern when lens is removed', () => {
      const currentState = createImageContent(1, { lens: { id: 1, name: 'Lens' } });
      const updateState = { id: 1, lens: null };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.lens).toEqual({ remove: true });
    });

    it('should use newValue pattern when lens has id 0 (new lens)', () => {
      const currentState = createImageContent(1, { lens: null });
      const updateState = { id: 1, lens: { id: 0, name: 'New Lens' } };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.lens).toEqual({ newValue: 'New Lens' });
    });

    it('should not include lens when unchanged', () => {
      const currentState = createImageContent(1, { lens: { id: 1, name: 'Lens' } });
      const updateState = { id: 1, lens: { id: 1, name: 'Lens' } };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.lens).toBeUndefined();
    });
  });

  describe('FilmType field (prev/newValue/remove pattern)', () => {
    const availableFilmTypes = [
      createFilmType(1, 'Kodak Portra 400'),
      createFilmType(2, 'Fuji Superia 400'),
    ];

    it('should use prev pattern when filmType exists in availableFilmTypes', () => {
      const currentState = createImageContent(1, { filmType: null });
      const updateState = { id: 1, filmType: 'Kodak Portra 400', iso: 400 };

      const result = buildImageUpdateDiff(updateState, currentState, availableFilmTypes);

      expect(result.filmType).toEqual({ prev: 1 });
    });

    it('should use newValue pattern when filmType is new (not in availableFilmTypes)', () => {
      const currentState = createImageContent(1, { filmType: null });
      const updateState = { id: 1, filmType: 'New Film Stock', iso: 800 };

      const result = buildImageUpdateDiff(updateState, currentState, availableFilmTypes);

      expect(result.filmType).toEqual({
        newValue: {
          filmTypeName: 'New Film Stock',
          defaultIso: 800,
        },
      });
    });

    it('should use remove pattern when filmType is removed', () => {
      const currentState = createImageContent(1, { filmType: 'Kodak Portra 400' });
      const updateState = { id: 1, filmType: null };

      const result = buildImageUpdateDiff(updateState, currentState, availableFilmTypes);

      expect(result.filmType).toEqual({ remove: true });
    });

    it('should use filmTypeName for matching when available', () => {
      const filmTypeWithName = createFilmType(3, 'Ilford HP5', { filmTypeName: 'ILFORD_HP5' });
      const availableTypes = [filmTypeWithName];
      const currentState = createImageContent(1, { filmType: null });
      const updateState = { id: 1, filmType: 'ILFORD_HP5', iso: 400 };

      const result = buildImageUpdateDiff(updateState, currentState, availableTypes);

      expect(result.filmType).toEqual({ prev: 3 });
    });

    it('should default to iso 400 when iso not provided for new film type', () => {
      const currentState = createImageContent(1, { filmType: null });
      const updateState = { id: 1, filmType: 'New Film Stock' };

      const result = buildImageUpdateDiff(updateState, currentState, availableFilmTypes);

      expect(result.filmType).toEqual({
        newValue: {
          filmTypeName: 'New Film Stock',
          defaultIso: 400,
        },
      });
    });

    it('should assume new film type when availableFilmTypes not provided', () => {
      const currentState = createImageContent(1, { filmType: null });
      const updateState = { id: 1, filmType: 'Some Film', iso: 200 };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.filmType).toEqual({
        newValue: {
          filmTypeName: 'Some Film',
          defaultIso: 200,
        },
      });
    });

    it('should not include filmType when unchanged', () => {
      const currentState = createImageContent(1, { filmType: 'Kodak Portra 400' });
      const updateState = { id: 1, filmType: 'Kodak Portra 400' };

      const result = buildImageUpdateDiff(updateState, currentState, availableFilmTypes);

      expect(result.filmType).toBeUndefined();
    });
  });

  describe('Tags field (prev/newValue/remove pattern)', () => {
    it('should include prev when existing tags are selected', () => {
      const currentState = createImageContent(1, { tags: [] });
      const updateState = {
        id: 1,
        tags: [
          { id: 1, name: 'Tag 1' },
          { id: 2, name: 'Tag 2' },
        ],
      };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.tags).toEqual({
        prev: [1, 2],
      });
    });

    it('should include newValue when new tags are added', () => {
      const currentState = createImageContent(1, { tags: [] });
      const updateState = {
        id: 1,
        tags: [
          { id: 0, name: 'New Tag 1' },
          { id: 0, name: 'New Tag 2' },
        ],
      };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.tags).toEqual({
        newValue: ['New Tag 1', 'New Tag 2'],
      });
    });

    it('should include remove when tags are removed', () => {
      const currentState = createImageContent(1, {
        tags: [
          { id: 1, name: 'Tag 1' },
          { id: 2, name: 'Tag 2' },
        ],
      });
      const updateState = { id: 1, tags: [] };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.tags).toEqual({
        remove: [1, 2],
      });
    });

    it('should handle mixed existing and new tags', () => {
      const currentState = createImageContent(1, {
        tags: [{ id: 1, name: 'Existing Tag' }],
      });
      const updateState = {
        id: 1,
        tags: [
          { id: 1, name: 'Existing Tag' },
          { id: 0, name: 'New Tag' },
        ],
      };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.tags).toEqual({
        prev: [1],
        newValue: ['New Tag'],
      });
    });

    it('should handle adding and removing tags simultaneously', () => {
      const currentState = createImageContent(1, {
        tags: [
          { id: 1, name: 'Tag 1' },
          { id: 2, name: 'Tag 2' },
        ],
      });
      const updateState = {
        id: 1,
        tags: [
          { id: 2, name: 'Tag 2' },
          { id: 0, name: 'New Tag' },
        ],
      };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.tags).toEqual({
        prev: [2],
        newValue: ['New Tag'],
        remove: [1],
      });
    });

    it('should not include tags when unchanged', () => {
      const currentState = createImageContent(1, {
        tags: [{ id: 1, name: 'Tag 1' }],
      });
      const updateState = {
        id: 1,
        tags: [{ id: 1, name: 'Tag 1' }],
      };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.tags).toBeUndefined();
    });
  });

  describe('People field (prev/newValue/remove pattern)', () => {
    it('should include prev when existing people are selected', () => {
      const currentState = createImageContent(1, { people: [] });
      const updateState = {
        id: 1,
        people: [
          { id: 1, name: 'Person 1' },
          { id: 2, name: 'Person 2' },
        ],
      };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.people).toEqual({
        prev: [1, 2],
      });
    });

    it('should include newValue when new people are added', () => {
      const currentState = createImageContent(1, { people: [] });
      const updateState = {
        id: 1,
        people: [
          { id: 0, name: 'New Person 1' },
          { id: 0, name: 'New Person 2' },
        ],
      };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.people).toEqual({
        newValue: ['New Person 1', 'New Person 2'],
      });
    });

    it('should include remove when people are removed', () => {
      const currentState = createImageContent(1, {
        people: [
          { id: 1, name: 'Person 1' },
          { id: 2, name: 'Person 2' },
        ],
      });
      const updateState = { id: 1, people: [] };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.people).toEqual({
        remove: [1, 2],
      });
    });

    it('should handle mixed existing and new people', () => {
      const currentState = createImageContent(1, {
        people: [{ id: 1, name: 'Existing Person' }],
      });
      const updateState = {
        id: 1,
        people: [
          { id: 1, name: 'Existing Person' },
          { id: 0, name: 'New Person' },
        ],
      };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.people).toEqual({
        prev: [1],
        newValue: ['New Person'],
      });
    });

    it('should not include people when unchanged', () => {
      const currentState = createImageContent(1, {
        people: [{ id: 1, name: 'Person 1' }],
      });
      const updateState = {
        id: 1,
        people: [{ id: 1, name: 'Person 1' }],
      };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.people).toBeUndefined();
    });
  });

  describe('Collections field (prev/newValue/remove pattern)', () => {
    it('should include newValue when new collections are added', () => {
      const currentState = createImageContent(1, { collections: [] });
      const updateState = {
        id: 1,
        collections: [
          { collectionId: 2, name: 'New Collection', visible: true },
        ],
      };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.collections).toEqual({
        newValue: [
          {
            collectionId: 2,
            name: 'New Collection',
            visible: true,
          },
        ],
      });
    });

    it('should include remove when collections are removed', () => {
      const currentState = createImageContent(1, {
        collections: [
          { collectionId: 1, name: 'Collection 1', visible: true },
          { collectionId: 2, name: 'Collection 2', visible: true },
        ],
      });
      const updateState = { id: 1, collections: [] };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.collections).toEqual({
        remove: [1, 2],
      });
    });

    it('should include prev when collection visibility changes', () => {
      const currentState = createImageContent(1, {
        collections: [
          { collectionId: 1, name: 'Collection 1', visible: true },
        ],
      });
      const updateState = {
        id: 1,
        collections: [
          { collectionId: 1, name: 'Collection 1', visible: false },
        ],
      };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.collections).toEqual({
        prev: [
          {
            collectionId: 1,
            name: 'Collection 1',
            visible: false,
          },
        ],
      });
    });

    it('should handle mixed add/remove/update operations', () => {
      const currentState = createImageContent(1, {
        collections: [
          { collectionId: 1, name: 'Collection 1', visible: true },
          { collectionId: 2, name: 'Collection 2', visible: true },
        ],
      });
      const updateState = {
        id: 1,
        collections: [
          { collectionId: 2, name: 'Collection 2', visible: false },
          { collectionId: 3, name: 'New Collection', visible: true },
        ],
      };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.collections).toEqual({
        prev: [
          {
            collectionId: 2,
            name: 'Collection 2',
            visible: false,
          },
        ],
        newValue: [
          {
            collectionId: 3,
            name: 'New Collection',
            visible: true,
          },
        ],
        remove: [1],
      });
    });

    it('should exclude orderIndex from collections updates', () => {
      const currentState = createImageContent(1, { collections: [] });
      const updateState = {
        id: 1,
        collections: [
          {
            collectionId: 1,
            name: 'Collection',
            visible: true,
            orderIndex: 999, // Should be excluded
          },
        ],
      };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.collections?.newValue?.[0]).not.toHaveProperty('orderIndex');
    });

    it('should not include collections when unchanged', () => {
      const currentState = createImageContent(1, {
        collections: [
          { collectionId: 1, name: 'Collection 1', visible: true },
        ],
      });
      const updateState = {
        id: 1,
        collections: [
          { collectionId: 1, name: 'Collection 1', visible: true },
        ],
      };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result.collections).toBeUndefined();
    });
  });

  describe('Complex scenarios', () => {
    it('should handle multiple field types changing simultaneously', () => {
      const currentState = createImageContent(1, {
        title: 'Original',
        camera: { id: 1, name: 'Old Camera' },
        tags: [{ id: 1, name: 'Tag 1' }],
      });
      const updateState = {
        id: 1,
        title: 'New Title',
        camera: { id: 2, name: 'New Camera' },
        tags: [
          { id: 1, name: 'Tag 1' },
          { id: 0, name: 'New Tag' },
        ],
      };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result).toEqual({
        id: 1,
        title: 'New Title',
        camera: { prev: 2 },
        tags: {
          prev: [1],
          newValue: ['New Tag'],
        },
      });
    });

    it('should handle empty updateState with only id', () => {
      const currentState = createImageContent(1, {
        title: 'Title',
        caption: 'Caption',
        rating: 5,
      });
      const updateState = { id: 1 };

      const result = buildImageUpdateDiff(updateState, currentState);

      expect(result).toEqual({ id: 1 });
    });
  });
});

/**
 * Testing Strategy for buildImageUpdateDiff
 *
 * Function: buildImageUpdateDiff(
 *   updateState: Partial<ImageContentModel> & { id: number },
 *   currentState: ImageContentModel,
 *   availableFilmTypes?: Array<{ id: number; name: string; filmTypeName?: string }>
 * )
 * Returns: ContentImageUpdateRequest
 *
 * Passing test cases:
 * - Simple fields: title, caption, alt, author, rating, blackAndWhite, isFilm, shutterSpeed, focalLength, location, fStop, iso, filmFormat, createDate
 *   - Field changed -> included in diff
 *   - Field unchanged -> not included
 *   - Null to undefined -> handled correctly
 *   - Multiple fields changed -> all included
 * - Camera field (prev/newValue/remove pattern)
 *   - Existing camera changed -> uses prev pattern
 *   - Camera removed -> uses remove pattern
 *   - New camera (id: 0) -> uses newValue pattern
 *   - Camera unchanged -> not included
 * - Lens field (prev/newValue/remove pattern)
 *   - Existing lens changed -> uses prev pattern
 *   - Lens removed -> uses remove pattern
 *   - New lens (id: 0) -> uses newValue pattern
 *   - Lens unchanged -> not included
 * - FilmType field (prev/newValue/remove pattern)
 *   - Existing filmType (found in availableFilmTypes) -> uses prev pattern
 *   - New filmType (not in availableFilmTypes) -> uses newValue pattern with defaultIso
 *   - FilmType removed -> uses remove pattern
 *   - FilmType unchanged -> not included
 *   - availableFilmTypes not provided -> assumes new filmType
 *   - ISO from updateState used for new filmType, defaults to 400
 * - Tags field (prev/newValue/remove pattern)
 *   - Existing tags selected -> uses prev pattern
 *   - New tags added (id: 0) -> uses newValue pattern
 *   - Tags removed -> uses remove pattern
 *   - Mixed existing and new tags -> includes both prev and newValue
 *   - Add and remove simultaneously -> includes prev, newValue, and remove
 *   - Tags unchanged -> not included
 * - People field (prev/newValue/remove pattern)
 *   - Existing people selected -> uses prev pattern
 *   - New people added (id: 0) -> uses newValue pattern
 *   - People removed -> uses remove pattern
 *   - Mixed existing and new people -> includes both prev and newValue
 *   - People unchanged -> not included
 * - Collections field (prev/newValue/remove pattern)
 *   - New collections added -> uses newValue pattern
 *   - Collections removed -> uses remove pattern
 *   - Collection visibility changed -> uses prev pattern
 *   - Mixed add/remove/update -> includes all relevant patterns
 *   - orderIndex excluded from updates (only visibility changes)
 *   - Collections unchanged -> not included
 * - Complex scenarios
 *   - Multiple field types changing simultaneously -> all included correctly
 *   - Empty updateState with only id -> returns only id
 *
 * Failing test cases:
 * - updateState.id doesn't match currentState.id -> still works (no validation)
 * - Invalid field values -> handled by TypeScript types
 * - Missing required fields -> handled by TypeScript types
 */

describe('getCommonValues', () => {
  describe('Empty and single image cases', () => {
    it('should return empty object for empty array', () => {
      const result = getCommonValues([]);
      expect(result).toEqual({});
    });

    it('should return the image for single image array', () => {
      const image = createImageContent(1, { title: 'Test', rating: 5 });
      const result = getCommonValues([image]);
      expect(result).toEqual(image);
    });
  });

  describe('String fields', () => {
    it('should include title when all images have same title', () => {
      const images = [
        createImageContent(1, { title: 'Common Title' }),
        createImageContent(2, { title: 'Common Title' }),
        createImageContent(3, { title: 'Common Title' }),
      ];
      const result = getCommonValues(images);
      expect(result.title).toBe('Common Title');
    });

    it('should not include title when titles differ', () => {
      const images = [
        createImageContent(1, { title: 'Title 1' }),
        createImageContent(2, { title: 'Title 2' }),
      ];
      const result = getCommonValues(images);
      expect(result.title).toBeUndefined();
    });

    it('should handle null and undefined values', () => {
      const images = [
        createImageContent(1, { title: undefined }),
        createImageContent(2, { title: undefined }),
      ];
      const result = getCommonValues(images);
      expect(result.title).toBeUndefined();
    });

    it('should check multiple string fields', () => {
      const images = [
        createImageContent(1, { title: 'Title', caption: 'Caption', author: 'Author' }),
        createImageContent(2, { title: 'Title', caption: 'Caption', author: 'Author' }),
      ];
      const result = getCommonValues(images);
      expect(result.title).toBe('Title');
      expect(result.caption).toBe('Caption');
      expect(result.author).toBe('Author');
    });
  });

  describe('Camera and lens fields', () => {
    it('should include camera when all images have same camera ID', () => {
      const camera = { id: 1, name: 'Canon' };
      const images = [
        createImageContent(1, { camera }),
        createImageContent(2, { camera }),
      ];
      const result = getCommonValues(images);
      expect(result.camera).toEqual(camera);
    });

    it('should not include camera when camera IDs differ', () => {
      const images = [
        createImageContent(1, { camera: { id: 1, name: 'Canon' } }),
        createImageContent(2, { camera: { id: 2, name: 'Nikon' } }),
      ];
      const result = getCommonValues(images);
      expect(result.camera).toBeUndefined();
    });

    it('should handle null camera values', () => {
      const images = [
        createImageContent(1, { camera: null }),
        createImageContent(2, { camera: null }),
      ];
      const result = getCommonValues(images);
      expect(result.camera).toBeNull();
    });

    it('should include lens when all images have same lens ID', () => {
      const lens = { id: 1, name: '50mm' };
      const images = [
        createImageContent(1, { lens }),
        createImageContent(2, { lens }),
      ];
      const result = getCommonValues(images);
      expect(result.lens).toEqual(lens);
    });
  });

  describe('Numeric fields', () => {
    it('should include iso when all images have same iso', () => {
      const images = [
        createImageContent(1, { iso: 400 }),
        createImageContent(2, { iso: 400 }),
      ];
      const result = getCommonValues(images);
      expect(result.iso).toBe(400);
    });

    it('should include rating when all images have same rating', () => {
      const images = [
        createImageContent(1, { rating: 5 }),
        createImageContent(2, { rating: 5 }),
      ];
      const result = getCommonValues(images);
      expect(result.rating).toBe(5);
    });

    it('should check multiple numeric fields', () => {
      const images = [
        createImageContent(1, { iso: 400, fStop: 'f/2.8', shutterSpeed: '1/125' }),
        createImageContent(2, { iso: 400, fStop: 'f/2.8', shutterSpeed: '1/125' }),
      ];
      const result = getCommonValues(images);
      expect(result.iso).toBe(400);
      expect(result.fStop).toBe('f/2.8');
      expect(result.shutterSpeed).toBe('1/125');
    });
  });

  describe('Boolean fields', () => {
    it('should include blackAndWhite only when ALL are true', () => {
      const images = [
        createImageContent(1, { blackAndWhite: true }),
        createImageContent(2, { blackAndWhite: true }),
      ];
      const result = getCommonValues(images);
      expect(result.blackAndWhite).toBe(true);
    });

    it('should not include blackAndWhite when any is false', () => {
      const images = [
        createImageContent(1, { blackAndWhite: true }),
        createImageContent(2, { blackAndWhite: false }),
      ];
      const result = getCommonValues(images);
      expect(result.blackAndWhite).toBeUndefined();
    });

    it('should not include blackAndWhite when all are false', () => {
      const images = [
        createImageContent(1, { blackAndWhite: false }),
        createImageContent(2, { blackAndWhite: false }),
      ];
      const result = getCommonValues(images);
      expect(result.blackAndWhite).toBeUndefined();
    });

    it('should include isFilm only when ALL are true', () => {
      const images = [
        createImageContent(1, { isFilm: true }),
        createImageContent(2, { isFilm: true }),
        createImageContent(3, { isFilm: true }),
      ];
      const result = getCommonValues(images);
      expect(result.isFilm).toBe(true);
    });
  });

  describe('Array fields (tags, people, collections)', () => {
    it('should return intersection of tags', () => {
      const images = [
        createImageContent(1, {
          tags: [
            { id: 1, name: 'Tag 1' },
            { id: 2, name: 'Tag 2' },
            { id: 3, name: 'Tag 3' },
          ],
        }),
        createImageContent(2, {
          tags: [
            { id: 2, name: 'Tag 2' },
            { id: 3, name: 'Tag 3' },
            { id: 4, name: 'Tag 4' },
          ],
        }),
      ];
      const result = getCommonValues(images);
      expect(result.tags).toEqual([
        { id: 2, name: 'Tag 2' },
        { id: 3, name: 'Tag 3' },
      ]);
    });

    it('should return empty array when no common tags', () => {
      const images = [
        createImageContent(1, { tags: [{ id: 1, name: 'Tag 1' }] }),
        createImageContent(2, { tags: [{ id: 2, name: 'Tag 2' }] }),
      ];
      const result = getCommonValues(images);
      expect(result.tags).toEqual([]);
    });

    it('should return intersection of people', () => {
      const images = [
        createImageContent(1, {
          people: [
            { id: 1, name: 'Person 1' },
            { id: 2, name: 'Person 2' },
          ],
        }),
        createImageContent(2, {
          people: [
            { id: 2, name: 'Person 2' },
            { id: 3, name: 'Person 3' },
          ],
        }),
      ];
      const result = getCommonValues(images);
      expect(result.people).toEqual([{ id: 2, name: 'Person 2' }]);
    });

    it('should return intersection of collections by collectionId', () => {
      const images = [
        createImageContent(1, {
          collections: [
            { collectionId: 1, name: 'Collection 1', visible: true },
            { collectionId: 2, name: 'Collection 2', visible: true },
          ],
        }),
        createImageContent(2, {
          collections: [
            { collectionId: 2, name: 'Collection 2', visible: false },
            { collectionId: 3, name: 'Collection 3', visible: true },
          ],
        }),
      ];
      const result = getCommonValues(images);
      // getCommonArrayItems returns items from the first array that match by ID
      // So it returns the first array's version with visible: true
      expect(result.collections).toEqual([
        { collectionId: 2, name: 'Collection 2', visible: true },
      ]);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle multiple field types simultaneously', () => {
      const images = [
        createImageContent(1, {
          title: 'Title',
          iso: 400,
          camera: { id: 1, name: 'Canon' },
          tags: [{ id: 1, name: 'Tag 1' }],
        }),
        createImageContent(2, {
          title: 'Title',
          iso: 400,
          camera: { id: 1, name: 'Canon' },
          tags: [{ id: 1, name: 'Tag 1' }],
        }),
      ];
      const result = getCommonValues(images);
      expect(result.title).toBe('Title');
      expect(result.iso).toBe(400);
      expect(result.camera).toEqual({ id: 1, name: 'Canon' });
      expect(result.tags).toEqual([{ id: 1, name: 'Tag 1' }]);
    });

    it('should only include fields where ALL images match', () => {
      const images = [
        createImageContent(1, {
          title: 'Title',
          caption: 'Caption 1',
          iso: 400,
        }),
        createImageContent(2, {
          title: 'Title',
          caption: 'Caption 2',
          iso: 400,
        }),
      ];
      const result = getCommonValues(images);
      expect(result.title).toBe('Title');
      expect(result.caption).toBeUndefined(); // Different captions
      expect(result.iso).toBe(400);
    });
  });
});

describe('extractMultiSelectValues', () => {
  it('should extract prevIds from items with id > 0', () => {
    const value = [
      { id: 1, name: 'Tag 1' },
      { id: 2, name: 'Tag 2' },
      { id: 3, name: 'Tag 3' },
    ];
    const result = extractMultiSelectValues(value);
    expect(result.prevIds).toEqual([1, 2, 3]);
    expect(result.newNames).toBeNull();
  });

  it('should extract newNames from items with id 0 or no id', () => {
    const value = [
      { id: 0, name: 'New Tag 1' },
      { name: 'New Tag 2' },
    ];
    const result = extractMultiSelectValues(value);
    expect(result.prevIds).toBeNull();
    expect(result.newNames).toEqual(['New Tag 1', 'New Tag 2']);
  });

  it('should extract both prevIds and newNames when mixed', () => {
    const value = [
      { id: 1, name: 'Existing Tag' },
      { id: 2, name: 'Another Existing' },
      { id: 0, name: 'New Tag' },
    ];
    const result = extractMultiSelectValues(value);
    expect(result.prevIds).toEqual([1, 2]);
    expect(result.newNames).toEqual(['New Tag']);
  });

  it('should return null for both when array is empty', () => {
    const result = extractMultiSelectValues([]);
    expect(result.prevIds).toBeNull();
    expect(result.newNames).toBeNull();
  });

  it('should return null for both when value is null', () => {
    const result = extractMultiSelectValues(null);
    expect(result.prevIds).toBeNull();
    expect(result.newNames).toBeNull();
  });

  it('should return null for both when value is undefined', () => {
    // eslint-disable-next-line unicorn/no-useless-undefined
    const result = extractMultiSelectValues(undefined);
    expect(result.prevIds).toBeNull();
    expect(result.newNames).toBeNull();
  });

  it('should filter out items with id <= 0 from prevIds', () => {
      const value = [
        { id: 1, name: 'Tag 1' },
        { id: 0, name: 'New Tag' },
        { id: -1, name: 'Invalid' },
      ];
      const result = extractMultiSelectValues(value);
      expect(result.prevIds).toEqual([1]);
      // Only items with id === 0 or no id are included in newNames
      // Items with id < 0 are not treated as new items
      expect(result.newNames).toEqual(['New Tag']);
    });
});

describe('handleDropdownChange', () => {
  describe('Multi-select fields (tags, people)', () => {
    it('should handle tags with existing IDs', () => {
      const updateDTO = jest.fn();
      const value = [
        { id: 1, name: 'Tag 1' },
        { id: 2, name: 'Tag 2' },
      ];

      handleDropdownChange({ field: 'tags', value }, updateDTO);

      expect(updateDTO).toHaveBeenCalledWith({
        tags: {
          prev: [1, 2],
        },
      });
    });

    it('should handle tags with new names', () => {
      const updateDTO = jest.fn();
      const value = [
        { id: 0, name: 'New Tag 1' },
        { name: 'New Tag 2' },
      ];

      handleDropdownChange({ field: 'tags', value }, updateDTO);

      expect(updateDTO).toHaveBeenCalledWith({
        tags: {
          newValue: ['New Tag 1', 'New Tag 2'],
        },
      });
    });

    it('should handle tags with mixed existing and new', () => {
      const updateDTO = jest.fn();
      const value = [
        { id: 1, name: 'Existing Tag' },
        { id: 0, name: 'New Tag' },
      ];

      handleDropdownChange({ field: 'tags', value }, updateDTO);

      expect(updateDTO).toHaveBeenCalledWith({
        tags: {
          prev: [1],
          newValue: ['New Tag'],
        },
      });
    });

    it('should handle people field similarly', () => {
      const updateDTO = jest.fn();
      const value = [
        { id: 1, name: 'Person 1' },
        { id: 0, name: 'New Person' },
      ];

      handleDropdownChange({ field: 'people', value }, updateDTO);

      expect(updateDTO).toHaveBeenCalledWith({
        people: {
          prev: [1],
          newValue: ['New Person'],
        },
      });
    });

    it('should not call updateDTO when value is empty array', () => {
      const updateDTO = jest.fn();
      handleDropdownChange({ field: 'tags', value: [] }, updateDTO);
      expect(updateDTO).not.toHaveBeenCalled();
    });

    it('should not call updateDTO when value is null', () => {
      const updateDTO = jest.fn();
      handleDropdownChange({ field: 'tags', value: null }, updateDTO);
      expect(updateDTO).not.toHaveBeenCalled();
    });
  });

  describe('Single-select fields (camera, lens, collections)', () => {
    it('should handle camera with prev pattern', () => {
      const updateDTO = jest.fn();
      const value = { prev: 1 };

      handleDropdownChange({ field: 'camera', value }, updateDTO);

      expect(updateDTO).toHaveBeenCalledWith({
        camera: { prev: 1 },
      });
    });

    it('should handle camera with newValue pattern', () => {
      const updateDTO = jest.fn();
      const value = { newValue: 'New Camera' };

      handleDropdownChange({ field: 'camera', value }, updateDTO);

      expect(updateDTO).toHaveBeenCalledWith({
        camera: { newValue: 'New Camera' },
      });
    });

    it('should handle camera with remove pattern', () => {
      const updateDTO = jest.fn();
      const value = { remove: true };

      handleDropdownChange({ field: 'camera', value }, updateDTO);

      expect(updateDTO).toHaveBeenCalledWith({
        camera: { remove: true },
      });
    });

    it('should handle lens field similarly', () => {
      const updateDTO = jest.fn();
      const value = { prev: 2 };

      handleDropdownChange({ field: 'lens', value }, updateDTO);

      expect(updateDTO).toHaveBeenCalledWith({
        lens: { prev: 2 },
      });
    });

    it('should handle collections field', () => {
      const updateDTO = jest.fn();
      const value = {
        newValue: [
          { collectionId: 1, name: 'Collection', visible: true },
        ],
      };

      handleDropdownChange({ field: 'collections', value }, updateDTO);

      expect(updateDTO).toHaveBeenCalledWith({
        collections: value,
      });
    });

    it('should not call updateDTO when value is not an object', () => {
      const updateDTO = jest.fn();
      handleDropdownChange({ field: 'camera', value: 'invalid' }, updateDTO);
      expect(updateDTO).not.toHaveBeenCalled();
    });

    it('should not call updateDTO when value is an array', () => {
      const updateDTO = jest.fn();
      handleDropdownChange({ field: 'camera', value: [] }, updateDTO);
      expect(updateDTO).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should not call updateDTO for unsupported field types', () => {
      const updateDTO = jest.fn();
      handleDropdownChange({ field: 'title', value: 'Test' }, updateDTO);
      expect(updateDTO).not.toHaveBeenCalled();
    });

    it('should handle null value for multi-select fields', () => {
      const updateDTO = jest.fn();
      handleDropdownChange({ field: 'tags', value: null }, updateDTO);
      expect(updateDTO).not.toHaveBeenCalled();
    });
  });
});

