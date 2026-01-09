/**
 * Unit tests for contentComponentHandlers.ts
 * Tests handler creation and pure utility functions for Content Component
 */

import type { ChildCollection } from '@/app/types/Collection';
import type { ContentImageModel, ContentParallaxImageModel } from '@/app/types/Content';
import {
  checkImageVisibility,
  createContentClickHandler,
  createDragEndHandler,
  createDragHandlers,
  createDragOverHandler,
  createDragStartHandler,
  createDropHandler,
  getCollectionNavigationPath,
  hasSlug,
} from '@/app/utils/contentComponentHandlers';

// Test fixtures
const createImageContent = (
  id: number,
  overrides?: Partial<ContentImageModel>
): ContentImageModel => ({
  id,
  contentType: 'IMAGE',
  orderIndex: id,
  visible: true,
  imageUrl: `https://example.com/image-${id}.jpg`,
  imageWidth: 1920,
  imageHeight: 1080,
  title: `Image ${id}`,
  ...overrides,
});


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

describe('hasSlug', () => {
  it('should return true when content has slug', () => {
    expect(hasSlug({ slug: 'test-collection' })).toBe(true);
  });

  it('should return false when content has no slug', () => {
    expect(hasSlug({})).toBe(false);
  });

  it('should return false when slug is empty string', () => {
    expect(hasSlug({ slug: '' })).toBe(false);
  });

  it('should return false when slug is undefined', () => {
    expect(hasSlug({})).toBe(false);
  });
});

describe('createContentClickHandler', () => {
  const createFullScreenContent = (id: number): ContentImageModel | ContentParallaxImageModel => ({
    id,
    contentType: 'IMAGE',
    imageUrl: `https://example.com/image-${id}.jpg`,
    title: `Image ${id}`,
    orderIndex: 0,
    visible: true,
  }) as ContentImageModel;

  it('should return undefined when no handlers are provided', () => {
    const isDraggingRef = { current: false };
    const handler = createContentClickHandler(
      1,
      isDraggingRef
    );
    expect(handler).toBeUndefined();
  });

  it('should call onContentClick when provided and not dragging', () => {
    const isDraggingRef = { current: false };
    const onContentClick = jest.fn();
    const handler = createContentClickHandler(
      1,
      isDraggingRef,
      onContentClick
    );

    expect(handler).toBeDefined();
    handler?.();
    expect(onContentClick).toHaveBeenCalledWith(1);
  });

  it('should not call onContentClick when dragging', () => {
    const isDraggingRef = { current: true };
    const onContentClick = jest.fn();
    const handler = createContentClickHandler(
      1,
      isDraggingRef,
      onContentClick
    );

    expect(handler).toBeDefined();
    handler?.();
    expect(onContentClick).not.toHaveBeenCalled();
    expect(isDraggingRef.current).toBe(false);
  });

  it('should call onFullScreenClick when onContentClick is not provided', () => {
    const isDraggingRef = { current: false };
    const onFullScreenClick = jest.fn();
    const fullScreenContent = createFullScreenContent(1);
    const handler = createContentClickHandler(
      1,
      isDraggingRef,
      undefined,
      true,
      onFullScreenClick,
      fullScreenContent
    );

    expect(handler).toBeDefined();
    handler?.();
    expect(onFullScreenClick).toHaveBeenCalledWith(fullScreenContent);
  });

  it('should not call onFullScreenClick when dragging', () => {
    const isDraggingRef = { current: true };
    const onFullScreenClick = jest.fn();
    const fullScreenContent = createFullScreenContent(1);
    const handler = createContentClickHandler(
      1,
      isDraggingRef,
      undefined,
      true,
      onFullScreenClick,
      fullScreenContent
    );

    expect(handler).toBeDefined();
    handler?.();
    expect(onFullScreenClick).not.toHaveBeenCalled();
    expect(isDraggingRef.current).toBe(false);
  });

  it('should prioritize onContentClick over onFullScreenClick', () => {
    const isDraggingRef = { current: false };
    const onContentClick = jest.fn();
    const onFullScreenClick = jest.fn();
    const fullScreenContent = createFullScreenContent(1);
    const handler = createContentClickHandler(
      1,
      isDraggingRef,
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
    const isDraggingRef = { current: false };
    const onFullScreenClick = jest.fn();
    const fullScreenContent = createFullScreenContent(1);
    const handler = createContentClickHandler(
      1,
      isDraggingRef,
      undefined,
      false,
      onFullScreenClick,
      fullScreenContent
    );
    expect(handler).toBeUndefined();
  });

  it('should return undefined when fullScreenContent is not provided', () => {
    const isDraggingRef = { current: false };
    const onFullScreenClick = jest.fn();
    // Omit fullScreenContent to test the undefined case
    const handler = createContentClickHandler(
      1,
      isDraggingRef,
      /* onContentClick */ undefined,
      /* enableFullScreenView */ true,
      onFullScreenClick
      // fullScreenContent omitted
    );
    expect(handler).toBeUndefined();
  });
});

describe('createDragStartHandler', () => {
  it('should return undefined when onDragStart is not provided', () => {
    const isDraggingRef = { current: false };
    const handler = createDragStartHandler(
      createImageContent(1),
      isDraggingRef
    );
    expect(handler).toBeUndefined();
  });

  it('should create handler that sets isDraggingRef to true', () => {
    const isDraggingRef = { current: false };
    const onDragStart = jest.fn();
    const image = createImageContent(1);
    const handler = createDragStartHandler(image, isDraggingRef, onDragStart);

    expect(handler).toBeDefined();
    const mockEvent = {
      stopPropagation: jest.fn(),
    } as unknown as React.DragEvent;
    handler?.(mockEvent);

    expect(isDraggingRef.current).toBe(true);
    expect(onDragStart).toHaveBeenCalledWith(1);
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
  });
});

describe('createDragOverHandler', () => {
  it('should return undefined when onDragOver is not provided', () => {
    const handler = createDragOverHandler(createImageContent(1), 2);
    expect(handler).toBeUndefined();
  });

  it('should return undefined when draggedImageId is null', () => {
    const onDragOver = jest.fn();
    const handler = createDragOverHandler(createImageContent(1), null, onDragOver);
    expect(handler).toBeUndefined();
  });

  it('should return undefined when draggedImageId is undefined', () => {
    const onDragOver = jest.fn();
    const handler = createDragOverHandler(createImageContent(1), undefined, onDragOver);
    expect(handler).toBeUndefined();
  });

  it('should return undefined when draggedImageId equals itemContent.id', () => {
    const onDragOver = jest.fn();
    const handler = createDragOverHandler(createImageContent(1), 1, onDragOver);
    expect(handler).toBeUndefined();
  });

  it('should create handler that calls onDragOver', () => {
    const onDragOver = jest.fn();
    const image = createImageContent(1);
    const handler = createDragOverHandler(image, 2, onDragOver);

    expect(handler).toBeDefined();
    const mockEvent = {
      preventDefault: jest.fn(),
    } as unknown as React.DragEvent;
    handler?.(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(onDragOver).toHaveBeenCalledWith(mockEvent, 1);
  });
});

describe('createDropHandler', () => {
  it('should return undefined when onDrop is not provided', () => {
    const isDraggingRef = { current: false };
    const handler = createDropHandler(createImageContent(1), 2, isDraggingRef);
    expect(handler).toBeUndefined();
  });

  it('should return undefined when draggedImageId is null', () => {
    const isDraggingRef = { current: false };
    const onDrop = jest.fn();
    const handler = createDropHandler(createImageContent(1), null, isDraggingRef, onDrop);
    expect(handler).toBeUndefined();
  });

  it('should return undefined when draggedImageId equals itemContent.id', () => {
    const isDraggingRef = { current: false };
    const onDrop = jest.fn();
    const handler = createDropHandler(createImageContent(1), 1, isDraggingRef, onDrop);
    expect(handler).toBeUndefined();
  });

  it('should create handler that calls onDrop but NOT reset isDraggingRef (dragEnd handles that)', () => {
    const isDraggingRef = { current: true };
    const onDrop = jest.fn();
    const image = createImageContent(1);
    const handler = createDropHandler(image, 2, isDraggingRef, onDrop);

    expect(handler).toBeDefined();
    const mockEvent = {
      preventDefault: jest.fn(),
    } as unknown as React.DragEvent;
    handler?.(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(onDrop).toHaveBeenCalledWith(mockEvent, 1);
    // isDraggingRef should still be true - dragEnd handler resets it with setTimeout
    // This allows click events (which fire after drop) to see isDraggingRef.current = true
    expect(isDraggingRef.current).toBe(true);
  });
});

describe('createDragEndHandler', () => {
  it('should return undefined when onDragEnd is not provided', () => {
    const isDraggingRef = { current: false };
    const handler = createDragEndHandler(isDraggingRef);
    expect(handler).toBeUndefined();
  });

  it('should create handler that calls onDragEnd and sets isDraggingRef to false', (done) => {
    const isDraggingRef = { current: true };
    const onDragEnd = jest.fn(() => {
      expect(isDraggingRef.current).toBe(false);
      expect(onDragEnd).toHaveBeenCalled();
      done();
    });
    const handler = createDragEndHandler(isDraggingRef, onDragEnd);

    expect(handler).toBeDefined();
    handler?.();
  });
});

describe('createDragHandlers', () => {
  it('should return all undefined handlers when enableDragAndDrop is false', () => {
    const isDraggingRef = { current: false };
    const image = createImageContent(1);
    const handlers = createDragHandlers(
      image,
      false,
      null,
      isDraggingRef
    );

    expect(handlers.handleDragStartEvent).toBeUndefined();
    expect(handlers.handleDragOverEvent).toBeUndefined();
    expect(handlers.handleDropEvent).toBeUndefined();
    expect(handlers.handleDragEndEvent).toBeUndefined();
  });

  it('should create all handlers when enableDragAndDrop is true', () => {
    const isDraggingRef = { current: false };
    const onDragStart = jest.fn();
    const onDragOver = jest.fn();
    const onDrop = jest.fn();
    const onDragEnd = jest.fn();
    const image = createImageContent(1);
    const handlers = createDragHandlers(
      image,
      true,
      2,
      isDraggingRef,
      onDragStart,
      onDragOver,
      onDrop,
      onDragEnd
    );

    expect(handlers.handleDragStartEvent).toBeDefined();
    expect(handlers.handleDragOverEvent).toBeDefined();
    expect(handlers.handleDropEvent).toBeDefined();
    expect(handlers.handleDragEndEvent).toBeDefined();
  });
});

describe('getCollectionNavigationPath', () => {
  it('should return admin path when isAdminContext is true', () => {
    expect(getCollectionNavigationPath('test-collection', true)).toBe(
      '/collection/manage/test-collection'
    );
  });

  it('should return public path when isAdminContext is false', () => {
    expect(getCollectionNavigationPath('test-collection', false)).toBe(
      '/test-collection'
    );
  });
});


