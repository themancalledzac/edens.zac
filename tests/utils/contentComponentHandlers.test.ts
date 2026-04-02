/**
 * Unit tests for contentComponentHandlers.ts
 * Tests handler creation and pure utility functions for Content Component
 */

import type { ChildCollection } from '@/app/types/Collection';
import type { ContentImageModel, ContentParallaxImageModel } from '@/app/types/Content';
import {
  checkImageVisibility,
  createContentClickHandler,
  getCollectionNavigationPath,
} from '@/app/utils/contentComponentHandlers';
import { createImageContent } from '@/tests/fixtures/contentFixtures';

const createChildCollection = (
  collectionId: number,
  overrides?: Partial<ChildCollection>
): ChildCollection => ({
  collectionId,
  name: `Collection ${collectionId}`,
  visible: true,
  orderIndex: 0,
  ...overrides,
});

describe('checkImageVisibility', () => {
  describe('direct visibility', () => {
    it('should return true when image visible is false', () => {
      const image = createImageContent(1, { visible: false });
      expect(checkImageVisibility(image)).toBe(true);
    });

    it('should return false when image visible is true', () => {
      const image = createImageContent(1, { visible: true });
      expect(checkImageVisibility(image)).toBe(false);
    });

    it('should return false when image visible is undefined', () => {
      const image = createImageContent(1, { visible: undefined });
      expect(checkImageVisibility(image)).toBe(false);
    });
  });

  describe('collection-specific visibility', () => {
    it('should return true when collection entry has visible: false', () => {
      const image = createImageContent(1, {
        visible: true,
        collections: [createChildCollection(1, { visible: false })],
      });
      expect(checkImageVisibility(image, 1)).toBe(true);
    });

    it('should return false when collection entry has visible: true', () => {
      const image = createImageContent(1, {
        visible: true,
        collections: [createChildCollection(1, { visible: true })],
      });
      expect(checkImageVisibility(image, 1)).toBe(false);
    });

    it('should return false when collection entry visible is undefined', () => {
      const image = createImageContent(1, {
        visible: true,
        collections: [createChildCollection(1, { visible: undefined })],
      });
      expect(checkImageVisibility(image, 1)).toBe(false);
    });

    it('should return false when collection entry not found', () => {
      const image = createImageContent(1, {
        visible: true,
        collections: [createChildCollection(2, { visible: false })],
      });
      expect(checkImageVisibility(image, 1)).toBe(false);
    });

    it('should return false when collections array is empty', () => {
      const image = createImageContent(1, {
        visible: true,
        collections: [],
      });
      expect(checkImageVisibility(image, 1)).toBe(false);
    });

    it('should return false when collections is undefined', () => {
      const image = createImageContent(1, {
        visible: true,
        collections: undefined,
      });
      expect(checkImageVisibility(image, 1)).toBe(false);
    });

    it('should ignore collection visibility when collectionId is not provided', () => {
      const image = createImageContent(1, {
        visible: true,
        collections: [createChildCollection(1, { visible: false })],
      });
      expect(checkImageVisibility(image)).toBe(false);
    });

    it('should prioritize direct visibility over collection visibility', () => {
      const image = createImageContent(1, {
        visible: false,
        collections: [createChildCollection(1, { visible: true })],
      });
      expect(checkImageVisibility(image, 1)).toBe(true);
    });
  });
});

describe('createContentClickHandler', () => {
  const createFullScreenContent = (id: number): ContentImageModel | ContentParallaxImageModel =>
    ({
      id,
      contentType: 'IMAGE',
      imageUrl: `https://example.com/image-${id}.jpg`,
      title: `Image ${id}`,
      orderIndex: 0,
      visible: true,
    }) as ContentImageModel;

  it('should return undefined when no handlers are provided', () => {
    const handler = createContentClickHandler(1);
    expect(handler).toBeUndefined();
  });

  it('should call onContentClick when provided', () => {
    const onContentClick = jest.fn();
    const handler = createContentClickHandler(1, onContentClick);

    expect(handler).toBeDefined();
    handler?.();
    expect(onContentClick).toHaveBeenCalledWith(1);
  });

  it('should call onFullScreenClick when onContentClick is not provided', () => {
    const onFullScreenClick = jest.fn();
    const fullScreenContent = createFullScreenContent(1);
    const handler = createContentClickHandler(
      1,
      undefined,
      true,
      onFullScreenClick,
      fullScreenContent
    );

    expect(handler).toBeDefined();
    handler?.();
    expect(onFullScreenClick).toHaveBeenCalledWith(fullScreenContent);
  });

  it('should prioritize onContentClick over onFullScreenClick', () => {
    const onContentClick = jest.fn();
    const onFullScreenClick = jest.fn();
    const fullScreenContent = createFullScreenContent(1);
    const handler = createContentClickHandler(
      1,
      onContentClick,
      true,
      onFullScreenClick,
      fullScreenContent
    );

    expect(handler).toBeDefined();
    handler?.();
    expect(onContentClick).toHaveBeenCalledWith(1);
    expect(onFullScreenClick).not.toHaveBeenCalled();
  });

  it('should return undefined when enableFullScreenView is false and no onContentClick', () => {
    const onFullScreenClick = jest.fn();
    const fullScreenContent = createFullScreenContent(1);
    const handler = createContentClickHandler(
      1,
      undefined,
      false,
      onFullScreenClick,
      fullScreenContent
    );
    expect(handler).toBeUndefined();
  });

  it('should return undefined when fullScreenContent is not provided', () => {
    const onFullScreenClick = jest.fn();
    const handler = createContentClickHandler(1, undefined, true, onFullScreenClick);
    expect(handler).toBeUndefined();
  });
});

describe('getCollectionNavigationPath', () => {
  it('should return admin path when isAdminContext is true', () => {
    expect(getCollectionNavigationPath('test-collection', true)).toBe(
      '/collection/manage/test-collection'
    );
  });

  it('should return public path when isAdminContext is false', () => {
    expect(getCollectionNavigationPath('test-collection', false)).toBe('/test-collection');
  });
});
