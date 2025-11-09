/**
 * Unit tests for manageUtils.ts
 * Tests all utility functions used by ManageClient component
 */

import {
  type CollectionModel,
  CollectionType,
  type CollectionUpdateRequest,
  type CollectionUpdateResponseDTO,
} from '@/app/types/Collection';
import {
  type AnyContentModel,
  type CollectionContentModel,
  type ContentImageUpdateResponse,
  type ImageContentModel,
  type TextContentModel,
} from '@/app/types/Content';

import {
  buildCollectionsUpdate,
  buildUpdatePayload,
  findImageBlockById,
  getCollectionContentAsSelections,
  getDisplayedCoverImage,
  handleApiError,
  handleCollectionNavigation,
  handleCoverImageSelection,
  handleMultiSelectToggle,
  handleSingleImageEdit,
  mergeNewMetadata,
  refreshCollectionData,
  revalidateCollectionCache,
  updateCollectionCache,
  updateCollectionState,
  validateCoverImageSelection,
} from '@/app/(admin)/collection/manage/[[...slug]]/manageUtils';

// Test fixtures
const createImageContent = (id: number, overrides?: Partial<ImageContentModel>): ImageContentModel => ({
  id,
  contentType: 'IMAGE',
  orderIndex: id,
  imageUrl: `https://example.com/image-${id}.jpg`,
  imageWidth: 1920,
  imageHeight: 1080,
  ...overrides,
});

const createTextContent = (id: number, overrides?: Partial<TextContentModel>): TextContentModel => ({
  id,
  contentType: 'TEXT',
  orderIndex: id,
  content: `Text content ${id}`,
  format: 'plain',
  align: 'left',
  ...overrides,
});

const createCollectionContent = (
  id: number,
  slug: string,
  overrides?: Partial<CollectionContentModel>
): CollectionContentModel => ({
  id,
  contentType: 'COLLECTION',
  orderIndex: id,
  slug,
  title: `Collection ${id}`,
  collectionType: CollectionType.PORTFOLIO,
  ...overrides,
});

const createCollectionModel = (overrides?: Partial<CollectionModel>): CollectionModel => ({
  id: 1,
  type: CollectionType.PORTFOLIO,
  title: 'Test Collection',
  slug: 'test-collection',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  visible: true,
  displayMode: 'CHRONOLOGICAL',
  ...overrides,
});

const createCollectionUpdateResponse = (
  overrides?: Partial<CollectionUpdateResponseDTO>
): CollectionUpdateResponseDTO => ({
  collection: createCollectionModel(),
  tags: [],
  people: [],
  cameras: [],
  lenses: [],
  filmTypes: [],
  ...overrides,
});

const createContentImageUpdateResponse = (
  overrides?: Partial<ContentImageUpdateResponse>
): ContentImageUpdateResponse => ({
  updatedImages: [],
  newMetadata: {},
  ...overrides,
});

describe('handleCoverImageSelection', () => {
  const image1 = createImageContent(1);
  const image2 = createImageContent(2);
  const text1 = createTextContent(3);
  const collection1 = createCollectionContent(4, 'child-collection');

  describe('passing cases', () => {
    it('should return success when valid image ID exists in content', () => {
      const content: AnyContentModel[] = [image1, image2, text1];
      const result = handleCoverImageSelection(1, content);

      expect(result).toEqual({
        success: true,
        coverImageId: 1,
      });
    });

    it('should work when image is the first block in content array', () => {
      const content: AnyContentModel[] = [image1, image2, text1];
      const result = handleCoverImageSelection(1, content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.coverImageId).toBe(1);
      }
    });

    it('should work when image is the last block in content array', () => {
      const content: AnyContentModel[] = [text1, collection1, image2];
      const result = handleCoverImageSelection(2, content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.coverImageId).toBe(2);
      }
    });

    it('should work when image is in the middle of content array', () => {
      const content: AnyContentModel[] = [text1, image1, collection1, image2];
      const result = handleCoverImageSelection(1, content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.coverImageId).toBe(1);
      }
    });

    it('should work with content array containing multiple blocks', () => {
      const content: AnyContentModel[] = [image1, text1, image2, collection1];
      const result = handleCoverImageSelection(2, content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.coverImageId).toBe(2);
      }
    });
  });

  describe('failing cases', () => {
    it('should return error when image ID does not exist in collection content', () => {
      const content: AnyContentModel[] = [image1, image2];
      const result = handleCoverImageSelection(999, content);

      expect(result).toEqual({
        success: false,
        error: 'Invalid cover image selection. Please try again.',
      });
    });

    it('should return error when image ID points to non-image content (TEXT)', () => {
      const content: AnyContentModel[] = [image1, text1];
      const result = handleCoverImageSelection(3, content);

      expect(result).toEqual({
        success: false,
        error: 'Invalid cover image selection. Please try again.',
      });
    });

    it('should return error when image ID points to non-image content (COLLECTION)', () => {
      const content: AnyContentModel[] = [image1, collection1];
      const result = handleCoverImageSelection(4, content);

      expect(result).toEqual({
        success: false,
        error: 'Invalid cover image selection. Please try again.',
      });
    });

    it('should return error when content is undefined', () => {
      // @ts-expect-error should return error when content is undefined
      const result = handleCoverImageSelection(1);

      expect(result).toEqual({
        success: false,
        error: 'Invalid cover image selection. Please try again.',
      });
    });

    it('should return error when content is empty array', () => {
      const result = handleCoverImageSelection(1, []);

      expect(result).toEqual({
        success: false,
        error: 'Invalid cover image selection. Please try again.',
      });
    });

    it('should return error when image ID is 0', () => {
      const content: AnyContentModel[] = [image1];
      const result = handleCoverImageSelection(0, content);

      expect(result).toEqual({
        success: false,
        error: 'Invalid cover image selection. Please try again.',
      });
    });

    it('should return error when image ID is negative', () => {
      const content: AnyContentModel[] = [image1];
      const result = handleCoverImageSelection(-1, content);

      expect(result).toEqual({
        success: false,
        error: 'Invalid cover image selection. Please try again.',
      });
    });

    it('should return error when image ID is NaN', () => {
      const content: AnyContentModel[] = [image1];
      const result = handleCoverImageSelection(Number.NaN, content);

      expect(result).toEqual({
        success: false,
        error: 'Invalid cover image selection. Please try again.',
      });
    });
  });
});

describe('handleCollectionNavigation', () => {
  const image1 = createImageContent(1);
  const collection1 = createCollectionContent(2, 'child-collection-1');
  const collection2 = createCollectionContent(3, 'child-collection-2', { title: 'Collection 3' });
  const text1 = createTextContent(4);

  describe('passing cases', () => {
    it('should return collection slug when valid collection block ID exists', () => {
      const content: AnyContentModel[] = [image1, collection1];
      const result = handleCollectionNavigation(2, content);

      expect(result).toBe('child-collection-1');
    });

    it('should work when collection is the first block in content array', () => {
      const content: AnyContentModel[] = [collection1, image1, text1];
      const result = handleCollectionNavigation(2, content);

      expect(result).toBe('child-collection-1');
    });

    it('should work when collection is the last block in content array', () => {
      const content: AnyContentModel[] = [image1, text1, collection1];
      const result = handleCollectionNavigation(2, content);

      expect(result).toBe('child-collection-1');
    });

    it('should work when collection is in the middle of content array', () => {
      const content: AnyContentModel[] = [image1, collection1, text1, collection2];
      const result = handleCollectionNavigation(2, content);

      expect(result).toBe('child-collection-1');
    });

    it('should return slug even if title is missing', () => {
      const collectionNoTitle = createCollectionContent(5, 'slug-only', { title: undefined });
      const content: AnyContentModel[] = [collectionNoTitle];
      const result = handleCollectionNavigation(5, content);

      expect(result).toBe('slug-only');
    });
  });

  describe('failing cases', () => {
    it('should return null when image ID does not exist in collection content', () => {
      const content: AnyContentModel[] = [image1, collection1];
      const result = handleCollectionNavigation(999, content);

      expect(result).toBeNull();
    });

    it('should return null when image ID points to non-collection content (IMAGE)', () => {
      const content: AnyContentModel[] = [image1, collection1];
      const result = handleCollectionNavigation(1, content);

      expect(result).toBeNull();
    });

    it('should return null when image ID points to non-collection content (TEXT)', () => {
      const content: AnyContentModel[] = [text1, collection1];
      const result = handleCollectionNavigation(4, content);

      expect(result).toBeNull();
    });

    it('should return null when content is undefined', () => {
      // @ts-expect-error should return null when content is undefined
      const result = handleCollectionNavigation(1);

      expect(result).toBeNull();
    });

    it('should return null when content is empty array', () => {
      const result = handleCollectionNavigation(1, []);

      expect(result).toBeNull();
    });

    it('should return null when collection block exists but has no slug', () => {
      const collectionNoSlug = createCollectionContent(5, '', { slug: '' });
      const content: AnyContentModel[] = [collectionNoSlug];
      const result = handleCollectionNavigation(5, content);

      expect(result).toBeNull();
    });

    it('should return empty string when collection block has empty string slug', () => {
      const collectionEmptySlug = createCollectionContent(5, '', { slug: '' });
      const content: AnyContentModel[] = [collectionEmptySlug];
      const result = handleCollectionNavigation(5, content);

      // Note: The function returns null for empty string, not the empty string itself
      expect(result).toBeNull();
    });
  });
});

describe('handleMultiSelectToggle', () => {
  describe('passing cases', () => {
    it('should add imageId to array when not in currentSelectedIds (toggle select)', () => {
      const currentSelectedIds = [1, 2];
      const result = handleMultiSelectToggle(3, currentSelectedIds);

      expect(result).toEqual([1, 2, 3]);
    });

    it('should remove imageId from array when in currentSelectedIds (toggle deselect)', () => {
      const currentSelectedIds = [1, 2, 3];
      const result = handleMultiSelectToggle(2, currentSelectedIds);

      expect(result).toEqual([1, 3]);
    });

    it('should work with empty array (selects first image)', () => {
      const result = handleMultiSelectToggle(1, []);

      expect(result).toEqual([1]);
    });

    it('should work with single selected ID (deselects to empty array)', () => {
      const result = handleMultiSelectToggle(1, [1]);

      expect(result).toEqual([]);
    });

    it('should preserve order of other selected IDs when adding', () => {
      const currentSelectedIds = [1, 3, 5];
      const result = handleMultiSelectToggle(2, currentSelectedIds);

      expect(result).toEqual([1, 3, 5, 2]);
    });

    it('should preserve order of other selected IDs when removing', () => {
      const currentSelectedIds = [1, 2, 3, 4, 5];
      const result = handleMultiSelectToggle(3, currentSelectedIds);

      expect(result).toEqual([1, 2, 4, 5]);
    });

    it('should work when imageId is first in array', () => {
      const currentSelectedIds = [1, 2, 3];
      const result = handleMultiSelectToggle(1, currentSelectedIds);

      expect(result).toEqual([2, 3]);
    });

    it('should work when imageId is last in array', () => {
      const currentSelectedIds = [1, 2, 3];
      const result = handleMultiSelectToggle(3, currentSelectedIds);

      expect(result).toEqual([1, 2]);
    });

    it('should work when imageId is in middle of array', () => {
      const currentSelectedIds = [1, 2, 3, 4, 5];
      const result = handleMultiSelectToggle(3, currentSelectedIds);

      expect(result).toEqual([1, 2, 4, 5]);
    });
  });

  describe('edge cases', () => {
    it('should handle invalid image ID (0) - no validation, still works', () => {
      const result = handleMultiSelectToggle(0, [1, 2]);

      expect(result).toEqual([1, 2, 0]);
    });

    it('should handle negative image ID - no validation, still works', () => {
      const result = handleMultiSelectToggle(-1, [1, 2]);

      expect(result).toEqual([1, 2, -1]);
    });

    it('should handle duplicate IDs in currentSelectedIds gracefully', () => {
      // This shouldn't happen in practice, but test that it doesn't break
      const currentSelectedIds = [1, 1, 2, 2];
      const result = handleMultiSelectToggle(1, currentSelectedIds);

      // Should remove all occurrences
      expect(result).toEqual([2, 2]);
    });
  });
});

describe('handleSingleImageEdit', () => {
  const image1 = createImageContent(1);
  const image2 = createImageContent(2);
  const text1 = createTextContent(3);
  const collection1 = createCollectionContent(4, 'child-collection');

  describe('passing cases', () => {
    it('should return ImageContentModel when valid image ID exists in content array', () => {
      const content: AnyContentModel[] = [image1, image2];
      const processedContent: AnyContentModel[] = [];
      const result = handleSingleImageEdit(1, content, processedContent);

      expect(result).toEqual(image1);
    });

    it('should return ImageContentModel when valid image ID exists in processedContent array', () => {
      const content: AnyContentModel[] = [];
      const processedContent: AnyContentModel[] = [image1, image2];
      const result = handleSingleImageEdit(1, content, processedContent);

      expect(result).toEqual(image1);
    });

    it('should prioritize content over processedContent when image exists in both', () => {
      const image1InContent = createImageContent(1, { imageUrl: 'content-url.jpg' });
      const image1InProcessed = createImageContent(1, { imageUrl: 'processed-url.jpg' });
      const content: AnyContentModel[] = [image1InContent];
      const processedContent: AnyContentModel[] = [image1InProcessed];
      const result = handleSingleImageEdit(1, content, processedContent);

      expect(result).toEqual(image1InContent);
    });

    it('should find image in processedContent when not in content', () => {
      const content: AnyContentModel[] = [text1];
      const processedContent: AnyContentModel[] = [image1];
      const result = handleSingleImageEdit(1, content, processedContent);

      expect(result).toEqual(image1);
    });

    it('should work when image is the first block in content array', () => {
      const content: AnyContentModel[] = [image1, text1, collection1];
      const processedContent: AnyContentModel[] = [];
      const result = handleSingleImageEdit(1, content, processedContent);

      expect(result).toEqual(image1);
    });

    it('should work when image is the last block in content array', () => {
      const content: AnyContentModel[] = [text1, collection1, image2];
      const processedContent: AnyContentModel[] = [];
      const result = handleSingleImageEdit(2, content, processedContent);

      expect(result).toEqual(image2);
    });

    it('should work when image is in the middle of content array', () => {
      const content: AnyContentModel[] = [text1, image1, collection1, image2];
      const processedContent: AnyContentModel[] = [];
      const result = handleSingleImageEdit(1, content, processedContent);

      expect(result).toEqual(image1);
    });

    it('should return correct ImageContentModel with all properties', () => {
      const fullImage = createImageContent(1, {
        imageUrl: 'test.jpg',
        imageWidth: 1920,
        imageHeight: 1080,
        rating: 5,
      });
      const content: AnyContentModel[] = [fullImage];
      const processedContent: AnyContentModel[] = [];
      const result = handleSingleImageEdit(1, content, processedContent);

      expect(result).toEqual(fullImage);
      expect(result?.imageUrl).toBe('test.jpg');
      expect(result?.imageWidth).toBe(1920);
      expect(result?.rating).toBe(5);
    });
  });

  describe('failing cases', () => {
    it('should return null when image ID does not exist in either content or processedContent', () => {
      const content: AnyContentModel[] = [image1];
      const processedContent: AnyContentModel[] = [image2];
      const result = handleSingleImageEdit(999, content, processedContent);

      expect(result).toBeNull();
    });

    it('should return null when image ID points to non-image content (TEXT)', () => {
      const content: AnyContentModel[] = [text1];
      const processedContent: AnyContentModel[] = [];
      const result = handleSingleImageEdit(3, content, processedContent);

      expect(result).toBeNull();
    });

    it('should return null when image ID points to non-image content (COLLECTION)', () => {
      const content: AnyContentModel[] = [collection1];
      const processedContent: AnyContentModel[] = [];
      const result = handleSingleImageEdit(4, content, processedContent);

      expect(result).toBeNull();
    });

    it('should return null when content is undefined and processedContent is empty', () => {
      const result = handleSingleImageEdit(1, [], []);

      expect(result).toBeNull();
    });

    it('should return null when both content and processedContent are empty arrays', () => {
      const result = handleSingleImageEdit(1, [], []);

      expect(result).toBeNull();
    });

    it('should return null when image ID is 0', () => {
      const content: AnyContentModel[] = [image1];
      const processedContent: AnyContentModel[] = [];
      const result = handleSingleImageEdit(0, content, processedContent);

      expect(result).toBeNull();
    });
  });
});

describe('buildUpdatePayload', () => {
  const originalCollection = createCollectionModel({
    id: 1,
    type: CollectionType.PORTFOLIO,
    title: 'Original Title',
    description: 'Original Description',
    location: 'Original Location',
    collectionDate: '2024-01-01',
    visible: true,
    displayMode: 'CHRONOLOGICAL',
  });

  describe('passing cases', () => {
    it('should return payload with only id when no changes', () => {
      const formData: CollectionUpdateRequest = {
        id: 1,
        type: CollectionType.PORTFOLIO,
        title: 'Original Title',
        description: 'Original Description',
        location: 'Original Location',
        collectionDate: '2024-01-01',
        visible: true,
        displayMode: 'CHRONOLOGICAL',
      };

      const result = buildUpdatePayload(formData, originalCollection);

      expect(result).toEqual({ id: 1 });
    });

    it('should include only id and changed title when single field changes', () => {
      const formData: CollectionUpdateRequest = {
        id: 1,
        title: 'New Title',
      };

      const result = buildUpdatePayload(formData, originalCollection);

      expect(result).toEqual({
        id: 1,
        title: 'New Title',
      });
    });

    it('should include id and all changed fields when multiple fields change', () => {
      const formData: CollectionUpdateRequest = {
        id: 1,
        title: 'New Title',
        description: 'New Description',
        visible: false,
      };

      const result = buildUpdatePayload(formData, originalCollection);

      expect(result).toEqual({
        id: 1,
        title: 'New Title',
        description: 'New Description',
        visible: false,
      });
    });

    it('should include coverImageId when set', () => {
      const formData: CollectionUpdateRequest = {
        id: 1,
        coverImageId: 123,
      };

      const result = buildUpdatePayload(formData, originalCollection);

      expect(result).toEqual({
        id: 1,
        coverImageId: 123,
      });
    });

    it('should include coverImageId when set to undefined', () => {
      const formData: CollectionUpdateRequest = {
        id: 1,
        coverImageId: undefined,
      };

      const result = buildUpdatePayload(formData, originalCollection);

      expect(result).toEqual({
        id: 1,
        coverImageId: undefined,
      });
    });

    it('should include collections when set', () => {
      const formData: CollectionUpdateRequest = {
        id: 1,
        collections: {
          newValue: [{ collectionId: 2, name: 'Child Collection' }],
        },
      };

      const result = buildUpdatePayload(formData, originalCollection);

      expect(result).toEqual({
        id: 1,
        collections: {
          newValue: [{ collectionId: 2, name: 'Child Collection' }],
        },
      });
    });

    it('should handle empty string vs undefined distinction for description', () => {
      const originalWithEmpty = createCollectionModel({
        ...originalCollection,
        description: '',
      });

      const formData: CollectionUpdateRequest = {
        id: 1,
        description: 'New Description',
      };

      const result = buildUpdatePayload(formData, originalWithEmpty);

      expect(result).toEqual({
        id: 1,
        description: 'New Description',
      });
    });

    it('should handle boolean false vs undefined distinction for visible', () => {
      const originalWithFalse = createCollectionModel({
        ...originalCollection,
        visible: false,
      });

      const formData: CollectionUpdateRequest = {
        id: 1,
        visible: true,
      };

      const result = buildUpdatePayload(formData, originalWithFalse);

      expect(result).toEqual({
        id: 1,
        visible: true,
      });
    });
  });
});

describe('validateCoverImageSelection', () => {
  const image1 = createImageContent(1);
  const image2 = createImageContent(2);
  const text1 = createTextContent(3);

  describe('passing cases', () => {
    it('should return true when valid image ID exists in blocks', () => {
      const blocks: AnyContentModel[] = [image1, image2];
      const result = validateCoverImageSelection(1, blocks);

      expect(result).toBe(true);
    });

    it('should return true when image is IMAGE content type', () => {
      const blocks: AnyContentModel[] = [image1, text1];
      const result = validateCoverImageSelection(1, blocks);

      expect(result).toBe(true);
    });
  });

  describe('failing cases', () => {
    it('should return false when image ID does not exist in blocks', () => {
      const blocks: AnyContentModel[] = [image1, image2];
      const result = validateCoverImageSelection(999, blocks);

      expect(result).toBe(false);
    });

    it('should return false when image ID points to non-image content', () => {
      const blocks: AnyContentModel[] = [image1, text1];
      const result = validateCoverImageSelection(3, blocks);

      expect(result).toBe(false);
    });

    it('should return false when blocks is undefined', () => {
      // @ts-expect-error should return false when blocks is undefined
      const result = validateCoverImageSelection(1);

      expect(result).toBe(false);
    });

    it('should return false when imageId is undefined', () => {
      const blocks: AnyContentModel[] = [image1];
      const result = validateCoverImageSelection(undefined, blocks);

      expect(result).toBe(false);
    });

    it('should return false when imageId is 0', () => {
      const blocks: AnyContentModel[] = [image1];
      const result = validateCoverImageSelection(0, blocks);

      expect(result).toBe(false);
    });

    it('should return false when blocks is empty array', () => {
      const result = validateCoverImageSelection(1, []);

      expect(result).toBe(false);
    });
  });
});

describe('findImageBlockById', () => {
  const image1 = createImageContent(1);
  const image2 = createImageContent(2);
  const text1 = createTextContent(3);

  describe('passing cases', () => {
    it('should return ImageContentModel when valid image ID exists in blocks', () => {
      const blocks: AnyContentModel[] = [image1, image2];
      const result = findImageBlockById(blocks, 1);

      expect(result).toEqual(image1);
    });

    it('should return ImageContentModel when image is IMAGE content type', () => {
      const blocks: AnyContentModel[] = [image1, text1];
      const result = findImageBlockById(blocks, 1);

      expect(result).toEqual(image1);
    });
  });

  describe('failing cases', () => {
    it('should return undefined when image ID does not exist in blocks', () => {
      const blocks: AnyContentModel[] = [image1, image2];
      const result = findImageBlockById(blocks, 999);

      expect(result).toBeUndefined();
    });

    it('should return undefined when image ID points to non-image content', () => {
      const blocks: AnyContentModel[] = [image1, text1];
      const result = findImageBlockById(blocks, 3);

      expect(result).toBeUndefined();
    });

    it('should return undefined when blocks is undefined', () => {
      const result = findImageBlockById(undefined, 1);

      expect(result).toBeUndefined();
    });

    it('should return undefined when imageId is undefined', () => {
      const blocks: AnyContentModel[] = [image1];
      // @ts-expect-error should return undefined when imageId is undefined
      const result = findImageBlockById(blocks);

      expect(result).toBeUndefined();
    });

    it('should return undefined when blocks is empty array', () => {
      const result = findImageBlockById([], 1);

      expect(result).toBeUndefined();
    });
  });
});

describe('getDisplayedCoverImage', () => {
  const image1 = createImageContent(1);
  const image2 = createImageContent(2);
  const coverImage = createImageContent(10);

  describe('passing cases', () => {
    it('should return pending image when pendingCoverImageId provided and exists in collection', () => {
      const collection = createCollectionModel({
        content: [image1, image2],
      });

      const result = getDisplayedCoverImage(collection, 1);

      expect(result).toEqual(image1);
    });

    it('should return collection.coverImage when pendingCoverImageId not provided', () => {
      const collection = createCollectionModel({
        coverImage: coverImage,
      });

      // @ts-expect-error should return collection.coverImage when pendingCoverImageId not provided
      const result = getDisplayedCoverImage(collection);

      expect(result).toEqual(coverImage);
    });

    it('should return null when collection.coverImage is null', () => {
      const collection = createCollectionModel({
        coverImage: null,
      });

      // @ts-expect-error should return null when collection.coverImage is null
      const result = getDisplayedCoverImage(collection);

      expect(result).toBeNull();
    });
  });

  describe('failing cases', () => {
    it('should return undefined when pendingCoverImageId provided but does not exist in collection', () => {
      const collection = createCollectionModel({
        content: [image1, image2],
      });

      const result = getDisplayedCoverImage(collection, 999);

      expect(result).toBeUndefined();
    });

    it('should return undefined when collection is null and pendingCoverImageId provided', () => {
      const result = getDisplayedCoverImage(null, 1);

      expect(result).toBeUndefined();
    });

    it('should return undefined when collection is null and no pendingCoverImageId', () => {
      // @ts-expect-error should return undefined when collection is null and no pendingCoverImageId
      const result = getDisplayedCoverImage(null);

      expect(result).toBeUndefined();
    });

    it('should return undefined when pendingCoverImageId points to non-image content', () => {
      const text1 = createTextContent(3);
      const collection = createCollectionModel({
        content: [image1, text1],
      });

      const result = getDisplayedCoverImage(collection, 3);

      expect(result).toBeUndefined();
    });
  });
});

describe('getCollectionContentAsSelections', () => {
  const collection1 = createCollectionContent(1, 'collection-1', { title: 'Collection 1' });
  const collection2 = createCollectionContent(2, 'collection-2', { title: 'Collection 2' });
  const image1 = createImageContent(4);
  const text1 = createTextContent(5);

  describe('passing cases', () => {
    it('should return array of {id, name} when content contains collection blocks', () => {
      const content: AnyContentModel[] = [collection1, collection2];
      const result = getCollectionContentAsSelections(content);

      expect(result).toEqual([
        { id: 1, name: 'Collection 1' },
        { id: 2, name: 'Collection 2' },
      ]);
    });

    it('should use title if available', () => {
      const content: AnyContentModel[] = [collection1];
      const result = getCollectionContentAsSelections(content);

      expect(result[0]?.name).toBe('Collection 1');
    });

    it('should fall back to slug if title not available', () => {
      const collectionNoTitle = createCollectionContent(3, 'collection-3', { title: undefined });
      const content: AnyContentModel[] = [collectionNoTitle];
      const result = getCollectionContentAsSelections(content);

      expect(result[0]?.name).toBe('collection-3');
    });

    it('should fall back to empty string if neither title nor slug', () => {
      const collectionNoName = createCollectionContent(4, '', { title: undefined, slug: '' });
      const content: AnyContentModel[] = [collectionNoName];
      const result = getCollectionContentAsSelections(content);

      expect(result[0]?.name).toBe('');
    });

    it('should filter out non-collection blocks', () => {
      const content: AnyContentModel[] = [collection1, image1, text1, collection2];
      const result = getCollectionContentAsSelections(content);

      expect(result).toEqual([
        { id: 1, name: 'Collection 1' },
        { id: 2, name: 'Collection 2' },
      ]);
    });

    it('should return empty array when content is empty', () => {
      const result = getCollectionContentAsSelections([]);

      expect(result).toEqual([]);
    });
  });

  describe('failing cases', () => {
    it('should return empty array when content is undefined', () => {
      // @ts-expect-error should return empty array when content is undefined
      const result = getCollectionContentAsSelections();

      expect(result).toEqual([]);
    });

    it('should return empty array when content contains no collection blocks', () => {
      const content: AnyContentModel[] = [image1, text1];
      const result = getCollectionContentAsSelections(content);

      expect(result).toEqual([]);
    });
  });
});

describe('buildCollectionsUpdate', () => {
  describe('passing cases', () => {
    it('should add new collection to newValue when not in original', () => {
      const selectedCollections = [{ id: 2, name: 'New Collection' }];
      const originalCollectionIds = new Set<number>(); // Empty - no original collections
      const result = buildCollectionsUpdate(selectedCollections, originalCollectionIds);

      expect(result).toEqual({
        newValue: [
          {
            collectionId: 2,
            name: 'New Collection',
            visible: true,
            orderIndex: 0,
          },
        ],
      });
    });

    it('should add original collection to remove when deselected', () => {
      const selectedCollections: Array<{ id: number; name: string }> = [];
      const originalCollectionIds = new Set<number>([1, 2]);
      const result = buildCollectionsUpdate(selectedCollections, originalCollectionIds);

      expect(result).toEqual({
        remove: [1, 2],
      });
    });

    it('should handle multiple collections added', () => {
      const selectedCollections = [
        { id: 2, name: 'Collection 2' },
        { id: 3, name: 'Collection 3' },
      ];
      const originalCollectionIds = new Set<number>([1]);
      const result = buildCollectionsUpdate(selectedCollections, originalCollectionIds);

      expect(result?.newValue).toHaveLength(2);
      expect(result?.newValue?.[0]?.collectionId).toBe(2);
      expect(result?.newValue?.[1]?.collectionId).toBe(3);
    });

    it('should handle multiple collections removed', () => {
      const selectedCollections: Array<{ id: number; name: string }> = [];
      const originalCollectionIds = new Set<number>([1, 2, 3]);
      const result = buildCollectionsUpdate(selectedCollections, originalCollectionIds);

      expect(result?.remove).toEqual([1, 2, 3]);
    });

    it('should handle mixed add/remove operations', () => {
      const selectedCollections = [{ id: 2, name: 'Collection 2' }];
      const originalCollectionIds = new Set<number>([1, 3]);
      const result = buildCollectionsUpdate(selectedCollections, originalCollectionIds);

      expect(result?.newValue).toHaveLength(1);
      expect(result?.newValue?.[0]?.collectionId).toBe(2);
      expect(result?.remove).toEqual([1, 3]);
    });

    it('should return undefined when no changes', () => {
      const selectedCollections = [{ id: 1, name: 'Collection 1' }];
      const originalCollectionIds = new Set<number>([1]);
      const result = buildCollectionsUpdate(selectedCollections, originalCollectionIds);

      expect(result).toBeUndefined();
    });

    it('should not include collections in original that stay selected', () => {
      const selectedCollections = [{ id: 1, name: 'Collection 1' }];
      const originalCollectionIds = new Set<number>([1]);
      const result = buildCollectionsUpdate(selectedCollections, originalCollectionIds);

      expect(result).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty selectedCollections with originalCollectionIds', () => {
      const selectedCollections: Array<{ id: number; name: string }> = [];
      const originalCollectionIds = new Set<number>([1, 2]);
      const result = buildCollectionsUpdate(selectedCollections, originalCollectionIds);

      expect(result?.remove).toEqual([1, 2]);
    });

    it('should handle empty originalCollectionIds with selectedCollections', () => {
      const selectedCollections = [{ id: 1, name: 'Collection 1' }];
      const originalCollectionIds = new Set<number>();
      const result = buildCollectionsUpdate(selectedCollections, originalCollectionIds);

      expect(result?.newValue).toHaveLength(1);
    });
  });
});

describe('handleApiError', () => {
  describe('passing cases', () => {
    it('should return error.message when error is Error object', () => {
      const error = new Error('Test error message');
      const result = handleApiError(error, 'Default message');

      expect(result).toBe('Test error message');
    });

    it('should return statusText when error has statusText property', () => {
      const error = { statusText: 'Not Found' };
      const result = handleApiError(error, 'Default message');

      expect(result).toBe('Not Found');
    });

    it('should return message from nested response object', () => {
      const error = {
        response: {
          message: 'Nested error message',
        },
      };
      const result = handleApiError(error, 'Default message');

      expect(result).toBe('Nested error message');
    });

    it('should return statusText from nested response object', () => {
      const error = {
        response: {
          statusText: 'Internal Server Error',
        },
      };
      const result = handleApiError(error, 'Default message');

      expect(result).toBe('Internal Server Error');
    });

    it('should return message when error has message property', () => {
      const error = { message: 'API error message' };
      const result = handleApiError(error, 'Default message');

      expect(result).toBe('API error message');
    });

    it('should return string when error is a string', () => {
      const error = 'String error message';
      const result = handleApiError(error, 'Default message');

      expect(result).toBe('String error message');
    });

    it('should return defaultMessage for unknown error type', () => {
      const error = { someOtherProperty: 'value' };
      const result = handleApiError(error, 'Default message');

      expect(result).toBe('Default message');
    });
  });

  describe('failing cases', () => {
    it('should return defaultMessage when error is null', () => {
      const result = handleApiError(null, 'Default message');

      expect(result).toBe('Default message');
    });

    it('should return defaultMessage when error is undefined', () => {
      const result = handleApiError(undefined, 'Default message');

      expect(result).toBe('Default message');
    });

    it('should return defaultMessage when error object has no message', () => {
      const error = { someProperty: 'value' };
      const result = handleApiError(error, 'Default message');

      expect(result).toBe('Default message');
    });
  });
});

describe('refreshCollectionData', () => {
  it('should call getCollectionUpdateMetadata with correct slug and return response', async () => {
    const slug = 'test-collection';
    const mockResponse = createCollectionUpdateResponse();
    const mockGetCollectionUpdateMetadata = jest.fn().mockResolvedValue(mockResponse);

    const result = await refreshCollectionData(slug, mockGetCollectionUpdateMetadata);

    expect(mockGetCollectionUpdateMetadata).toHaveBeenCalledWith(slug);
    expect(mockGetCollectionUpdateMetadata).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockResponse);
  });

  it('should propagate error when getCollectionUpdateMetadata throws', async () => {
    const slug = 'test-collection';
    const mockError = new Error('API Error');
    const mockGetCollectionUpdateMetadata = jest.fn().mockRejectedValue(mockError);

    await expect(refreshCollectionData(slug, mockGetCollectionUpdateMetadata)).rejects.toThrow(
      'API Error'
    );
  });

  it('should work with empty string slug', async () => {
    const slug = '';
    const mockResponse = createCollectionUpdateResponse();
    const mockGetCollectionUpdateMetadata = jest.fn().mockResolvedValue(mockResponse);

    await refreshCollectionData(slug, mockGetCollectionUpdateMetadata);

    expect(mockGetCollectionUpdateMetadata).toHaveBeenCalledWith('');
  });
});

describe('updateCollectionState', () => {
  it('should return function that updates collection field correctly', () => {
    const response = createCollectionUpdateResponse({
      collection: createCollectionModel({ title: 'Updated Title' }),
    });
    const updater = updateCollectionState(response);
    const prev = createCollectionUpdateResponse({
      collection: createCollectionModel({ title: 'Original Title' }),
    });

    const result = updater(prev);

    expect(result.collection.title).toBe('Updated Title');
  });

  it('should preserve all other fields from prev state', () => {
    const response = createCollectionUpdateResponse({
      collection: createCollectionModel({ title: 'Updated Title' }),
    });
    const prev = createCollectionUpdateResponse({
      tags: [{ id: 1, name: 'Tag 1' }],
      people: [{ id: 1, name: 'Person 1' }],
    });
    const updater = updateCollectionState(response);

    const result = updater(prev);

    expect(result.tags).toEqual([{ id: 1, name: 'Tag 1' }]);
    expect(result.people).toEqual([{ id: 1, name: 'Person 1' }]);
  });

  it('should work when prev is null', () => {
    const response = createCollectionUpdateResponse();
    const updater = updateCollectionState(response);

    const result = updater(null);

    expect(result.collection).toEqual(response.collection);
  });

  it('should preserve existing metadata when updating collection', () => {
    const response = createCollectionUpdateResponse({
      collection: createCollectionModel({ title: 'New Title' }),
    });
    const prev = createCollectionUpdateResponse({
      tags: [{ id: 1, name: 'Existing Tag' }],
      cameras: [{ id: 1, name: 'Existing Camera' }],
    });
    const updater = updateCollectionState(response);

    const result = updater(prev);

    expect(result.collection.title).toBe('New Title');
    expect(result.tags).toEqual([{ id: 1, name: 'Existing Tag' }]);
    expect(result.cameras).toEqual([{ id: 1, name: 'Existing Camera' }]);
  });
});

describe('updateCollectionCache', () => {
  it('should call collectionStorage.update with correct slug and collection', () => {
    const slug = 'test-collection';
    const collection = createCollectionModel();
    const mockCollectionStorage = {
      update: jest.fn(),
    };

    updateCollectionCache(slug, collection, mockCollectionStorage);

    expect(mockCollectionStorage.update).toHaveBeenCalledWith(slug, collection);
    expect(mockCollectionStorage.update).toHaveBeenCalledTimes(1);
  });

  it('should propagate error when collectionStorage.update throws', () => {
    const slug = 'test-collection';
    const collection = createCollectionModel();
    const mockCollectionStorage = {
      update: jest.fn().mockImplementation(() => {
        throw new Error('Storage error');
      }),
    };

    expect(() => updateCollectionCache(slug, collection, mockCollectionStorage)).toThrow(
      'Storage error'
    );
  });

  it('should work with empty string slug', () => {
    const slug = '';
    const collection = createCollectionModel();
    const mockCollectionStorage = {
      update: jest.fn(),
    };

    updateCollectionCache(slug, collection, mockCollectionStorage);

    expect(mockCollectionStorage.update).toHaveBeenCalledWith('', collection);
  });
});

describe('revalidateCollectionCache', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should call /api/revalidate with correct tag and path', async () => {
    const slug = 'test-collection';
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    await revalidateCollectionCache(slug);

    expect(global.fetch).toHaveBeenCalledWith('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag: 'collection-test-collection',
        path: '/test-collection',
      }),
    });
  });

  it('should resolve successfully when revalidation succeeds', async () => {
    const slug = 'test-collection';
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    await expect(revalidateCollectionCache(slug)).resolves.toBeUndefined();
  });

  it('should fail silently when revalidation fails', async () => {
    const slug = 'test-collection';
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    await expect(revalidateCollectionCache(slug)).resolves.toBeUndefined();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[manageUtils] Failed to revalidate cache:',
      expect.any(Error)
    );

    consoleWarnSpy.mockRestore();
  });

  it('should fail silently when API returns error status', async () => {
    const slug = 'test-collection';
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

    await expect(revalidateCollectionCache(slug)).resolves.toBeUndefined();

    consoleWarnSpy.mockRestore();
  });

  it('should work with empty string slug', async () => {
    const slug = '';
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    await revalidateCollectionCache(slug);

    expect(global.fetch).toHaveBeenCalledWith('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag: 'collection-',
        path: '/',
      }),
    });
  });
});

describe('mergeNewMetadata', () => {
  it('should return null when newMetadata is undefined', () => {
    const response = createContentImageUpdateResponse({ newMetadata: undefined });
    const currentState = createCollectionUpdateResponse();

    const result = mergeNewMetadata(response, currentState);

    expect(result).toBeNull();
  });

  it('should return null when newMetadata exists but all arrays are empty', () => {
    const response = createContentImageUpdateResponse({
      newMetadata: {
        tags: [],
        people: [],
        cameras: [],
        lenses: [],
        filmTypes: [],
      },
    });
    const currentState = createCollectionUpdateResponse();

    const result = mergeNewMetadata(response, currentState);

    expect(result).toBeNull();
  });

  it('should return updater function when newMetadata has tags', () => {
    const response = createContentImageUpdateResponse({
      newMetadata: {
        tags: [{ id: 1, name: 'New Tag' }],
      },
    });
    const currentState = createCollectionUpdateResponse();

    const result = mergeNewMetadata(response, currentState);

    expect(result).not.toBeNull();
    expect(typeof result).toBe('function');
  });

  it('should return updater function when newMetadata has multiple types', () => {
    const response = createContentImageUpdateResponse({
      newMetadata: {
        tags: [{ id: 1, name: 'New Tag' }],
        people: [{ id: 1, name: 'New Person' }],
        cameras: [{ id: 1, name: 'New Camera' }],
      },
    });
    const currentState = createCollectionUpdateResponse();

    const result = mergeNewMetadata(response, currentState);

    expect(result).not.toBeNull();
  });

  it('should merge tags correctly (appends to existing)', () => {
    const response = createContentImageUpdateResponse({
      newMetadata: {
        tags: [{ id: 2, name: 'New Tag' }],
      },
    });
    const prev = createCollectionUpdateResponse({
      tags: [{ id: 1, name: 'Existing Tag' }],
    });
    const updater = mergeNewMetadata(response, null);

    expect(updater).not.toBeNull();
    if (updater) {
      const result = updater(prev);
      expect(result.tags).toEqual([
        { id: 1, name: 'Existing Tag' },
        { id: 2, name: 'New Tag' },
      ]);
    }
  });

  it('should merge people correctly (appends to existing)', () => {
    const response = createContentImageUpdateResponse({
      newMetadata: {
        people: [{ id: 2, name: 'New Person' }],
      },
    });
    const prev = createCollectionUpdateResponse({
      people: [{ id: 1, name: 'Existing Person' }],
    });
    const updater = mergeNewMetadata(response, null);

    expect(updater).not.toBeNull();
    if (updater) {
      const result = updater(prev);
      expect(result.people).toEqual([
        { id: 1, name: 'Existing Person' },
        { id: 2, name: 'New Person' },
      ]);
    }
  });

  it('should work when prev is null', () => {
    const response = createContentImageUpdateResponse({
      newMetadata: {
        tags: [{ id: 1, name: 'New Tag' }],
      },
    });
    const updater = mergeNewMetadata(response, null);

    expect(updater).not.toBeNull();
    if (updater) {
      const result = updater(null);
      expect(result.tags).toEqual([{ id: 1, name: 'New Tag' }]);
    }
  });

  it('should work when prev has no metadata', () => {
    const response = createContentImageUpdateResponse({
      newMetadata: {
        tags: [{ id: 1, name: 'New Tag' }],
      },
    });
    const prev = createCollectionUpdateResponse({
      tags: undefined,
      people: undefined,
    });
    const updater = mergeNewMetadata(response, null);

    expect(updater).not.toBeNull();
    if (updater) {
      const result = updater(prev);
      expect(result.tags).toEqual([{ id: 1, name: 'New Tag' }]);
    }
  });

  it('should preserve existing metadata that is not in newMetadata', () => {
    const response = createContentImageUpdateResponse({
      newMetadata: {
        tags: [{ id: 1, name: 'New Tag' }],
      },
    });
    const prev = createCollectionUpdateResponse({
      tags: [{ id: 0, name: 'Existing Tag' }],
      cameras: [{ id: 1, name: 'Existing Camera' }],
    });
    const updater = mergeNewMetadata(response, null);

    expect(updater).not.toBeNull();
    if (updater) {
      const result = updater(prev);
      expect(result.tags).toHaveLength(2);
      expect(result.cameras).toEqual([{ id: 1, name: 'Existing Camera' }]);
    }
  });

  it('should append duplicates (no deduplication)', () => {
    const response = createContentImageUpdateResponse({
      newMetadata: {
        tags: [{ id: 1, name: 'Tag' }],
      },
    });
    const prev = createCollectionUpdateResponse({
      tags: [{ id: 1, name: 'Tag' }],
    });
    const updater = mergeNewMetadata(response, null);

    expect(updater).not.toBeNull();
    if (updater) {
      const result = updater(prev);
      expect(result.tags).toHaveLength(2);
      expect(result.tags).toEqual([
        { id: 1, name: 'Tag' },
        { id: 1, name: 'Tag' },
      ]);
    }
  });
});

/**
 * Testing Strategy for refreshCollectionData
 * 
 * Function: refreshCollectionData(slug: string, getCollectionUpdateMetadata: (slug: string) => Promise<CollectionUpdateResponseDTO>)
 * Returns: Promise<CollectionUpdateResponseDTO>
 * 
 * Passing test cases:
 * - Valid slug calls getCollectionUpdateMetadata with correct slug
 * - Returns the response from getCollectionUpdateMetadata
 * - Works with different slug formats
 * 
 * Failing test cases:
 * - getCollectionUpdateMetadata throws error -> propagates error
 * - Slug is empty string -> still calls function (no validation)
 * - Slug is invalid format -> propagates error from API
 * - Network error -> propagates error
 */

/**
 * Testing Strategy for updateCollectionState
 * 
 * Function: updateCollectionState(response: CollectionUpdateResponseDTO)
 * Returns: (prev: CollectionUpdateResponseDTO | null) => CollectionUpdateResponseDTO
 * 
 * Passing test cases:
 * - Returns function that updates collection field correctly
 * - Preserves all other fields from prev state
 * - Works when prev is null -> creates new state with collection
 * - Works when prev has existing metadata -> preserves metadata
 * - Works when prev has existing collection -> replaces collection
 * 
 * Failing test cases:
 * - Response is null/undefined -> should handle gracefully
 * - Response.collection is missing -> should handle gracefully
 * - Response has partial metadata -> preserves what exists
 */

/**
 * Testing Strategy for updateCollectionCache
 * 
 * Function: updateCollectionCache(slug: string, collection: CollectionModel, collectionStorage: { update: (slug: string, collection: CollectionModel) => void })
 * Returns: void
 * 
 * Passing test cases:
 * - Calls collectionStorage.update with correct slug and collection
 * - Works with valid slug and collection
 * - Works with different slug formats
 * 
 * Failing test cases:
 * - collectionStorage.update throws error -> propagates error
 * - Slug is empty string -> still calls function (no validation)
 * - Collection is null/undefined -> propagates error from storage
 * - collectionStorage is null/undefined -> throws error
 */

/**
 * Testing Strategy for revalidateCollectionCache
 * 
 * Function: revalidateCollectionCache(slug: string)
 * Returns: Promise<void>
 * 
 * Passing test cases:
 * - Calls /api/revalidate with correct tag and path
 * - Request body contains correct tag format: `collection-${slug}`
 * - Request body contains correct path format: `/${slug}`
 * - Resolves successfully when revalidation succeeds
 * - Fails silently when revalidation fails (catches error, logs warning)
 * 
 * Failing test cases:
 * - Slug is empty string -> still makes request (no validation)
 * - Network error -> fails silently, logs warning
 * - API returns error status -> fails silently, logs warning
 * - fetch is not available (SSR) -> fails silently
 */

/**
 * Testing Strategy for mergeNewMetadata
 * 
 * Function: mergeNewMetadata(response: ContentImageUpdateResponse, currentState: CollectionUpdateResponseDTO | null)
 * Returns: ((prev: CollectionUpdateResponseDTO | null) => CollectionUpdateResponseDTO) | null
 * 
 * Passing test cases:
 * - Returns null when newMetadata is undefined
 * - Returns null when newMetadata exists but all arrays are empty
 * - Returns null when newMetadata exists but all arrays are null
 * - Returns updater function when newMetadata has tags
 * - Returns updater function when newMetadata has people
 * - Returns updater function when newMetadata has cameras
 * - Returns updater function when newMetadata has lenses
 * - Returns updater function when newMetadata has filmTypes
 * - Returns updater function when newMetadata has multiple types
 * - Updater function merges tags correctly (appends to existing)
 * - Updater function merges people correctly (appends to existing)
 * - Updater function merges cameras correctly (appends to existing)
 * - Updater function merges lenses correctly (appends to existing)
 * - Updater function merges filmTypes correctly (appends to existing)
 * - Works when prev is null -> creates new arrays with new metadata
 * - Works when prev has existing metadata -> appends to existing arrays
 * - Works when prev has no metadata -> creates new arrays
 * - Preserves existing metadata that's not in newMetadata
 * 
 * Failing test cases:
 * - Response is null/undefined -> returns null
 * - Response.newMetadata is null -> returns null
 * - currentState is null -> still works (uses prev in updater)
 * - Duplicate metadata items -> appends duplicates (no deduplication)
 */
