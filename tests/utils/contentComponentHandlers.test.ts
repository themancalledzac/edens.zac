/**
 * Unit tests for contentComponentHandlers.ts
 * Tests handler creation and pure utility functions for Content Component
 */

import type { ChildCollection } from '@/app/types/Collection';
import type { ImageContentModel } from '@/app/types/Content';
import {
  checkImageVisibility,
  createDragEndHandler,
  createDragHandlers,
  createDragOverHandler,
  createDragStartHandler,
  createDropHandler,
  createImageClickHandler,
  createParallaxImageClickHandler,
  determineImageClickAction,
  getCollectionNavigationPath,
  hasSlug,
} from '@/app/utils/contentComponentHandlers';

// Test fixtures
const createImageContent = (
  id: number,
  overrides?: Partial<ImageContentModel>
): ImageContentModel => ({
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

describe('determineImageClickAction', () => {
  it('should return "imageClick" when onImageClick is provided', () => {
    const onImageClick = jest.fn();
    expect(determineImageClickAction(onImageClick)).toBe('imageClick');
  });

  it('should return "fullscreen" when enableFullScreenView and onFullScreenImageClick are provided', () => {
    const onFullScreenImageClick = jest.fn();
    expect(
      determineImageClickAction(undefined, true, onFullScreenImageClick)
    ).toBe('fullscreen');
  });

  it('should return "none" when no handlers are provided', () => {
    expect(determineImageClickAction()).toBe('none');
  });

  it('should prioritize onImageClick over fullscreen', () => {
    const onImageClick = jest.fn();
    const onFullScreenImageClick = jest.fn();
    expect(
      determineImageClickAction(
        onImageClick,
        true,
        onFullScreenImageClick
      )
    ).toBe('imageClick');
  });

  it('should return "none" when enableFullScreenView is false', () => {
    const onFullScreenImageClick = jest.fn();
    expect(
      determineImageClickAction(undefined, false, onFullScreenImageClick)
    ).toBe('none');
  });

  it('should return "none" when onFullScreenImageClick is undefined', () => {
    expect(determineImageClickAction(undefined, true)).toBe('none');
  });
});

describe('createImageClickHandler', () => {
  it('should return undefined when no handlers are provided', () => {
    const isDraggingRef = { current: false };
    const handler = createImageClickHandler(
      createImageContent(1),
      isDraggingRef
    );
    expect(handler).toBeUndefined();
  });

  it('should call onImageClick when provided and not dragging', () => {
    const isDraggingRef = { current: false };
    const onImageClick = jest.fn();
    const image = createImageContent(1);
    const handler = createImageClickHandler(
      image,
      isDraggingRef,
      onImageClick
    );

    expect(handler).toBeDefined();
    handler?.();
    expect(onImageClick).toHaveBeenCalledWith(1);
  });

  it('should not call onImageClick when dragging', () => {
    const isDraggingRef = { current: true };
    const onImageClick = jest.fn();
    const image = createImageContent(1);
    const handler = createImageClickHandler(
      image,
      isDraggingRef,
      onImageClick
    );

    expect(handler).toBeDefined();
    handler?.();
    expect(onImageClick).not.toHaveBeenCalled();
    expect(isDraggingRef.current).toBe(false);
  });

  it('should call onFullScreenImageClick when onImageClick is not provided', () => {
    const isDraggingRef = { current: false };
    const onFullScreenImageClick = jest.fn();
    const image = createImageContent(1);
    const handler = createImageClickHandler(
      image,
      isDraggingRef,
      undefined,
      true,
      onFullScreenImageClick
    );

    expect(handler).toBeDefined();
    handler?.();
    expect(onFullScreenImageClick).toHaveBeenCalledWith(image);
  });

  it('should prioritize onImageClick over onFullScreenImageClick', () => {
    const isDraggingRef = { current: false };
    const onImageClick = jest.fn();
    const onFullScreenImageClick = jest.fn();
    const image = createImageContent(1);
    const handler = createImageClickHandler(
      image,
      isDraggingRef,
      onImageClick,
      true,
      onFullScreenImageClick
    );

    expect(handler).toBeDefined();
    handler?.();
    expect(onImageClick).toHaveBeenCalledWith(1);
    expect(onFullScreenImageClick).not.toHaveBeenCalled();
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

  it('should create handler that calls onDrop and sets isDraggingRef to false', () => {
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
    expect(isDraggingRef.current).toBe(false);
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

describe('createParallaxImageClickHandler', () => {
  it('should return undefined when no handlers are provided', () => {
    const handler = createParallaxImageClickHandler({});
    expect(handler).toBeUndefined();
  });

  it('should return collection navigation handler when slug is provided', () => {
    const routerPush = jest.fn();
    const handler = createParallaxImageClickHandler(
      { slug: 'test-collection' },
      undefined,
      false,
      undefined,
      routerPush
    );

    expect(handler).toBeDefined();
    handler?.();
    expect(routerPush).toHaveBeenCalledWith('/test-collection');
  });

  it('should return admin collection navigation handler when slug and onImageClick are provided', () => {
    const routerPush = jest.fn();
    const onImageClick = jest.fn();
    const handler = createParallaxImageClickHandler(
      { slug: 'test-collection' },
      onImageClick,
      false,
      undefined,
      routerPush
    );

    expect(handler).toBeDefined();
    handler?.();
    expect(routerPush).toHaveBeenCalledWith('/collection/manage/test-collection');
  });

  it('should return fullscreen handler when enableFullScreenView is true', () => {
    const onFullScreenImageClick = jest.fn();
    const itemContent = { slug: undefined };
    const handler = createParallaxImageClickHandler(
      itemContent,
      undefined,
      true,
      onFullScreenImageClick
    );

    expect(handler).toBeDefined();
    handler?.();
    expect(onFullScreenImageClick).toHaveBeenCalled();
  });

  it('should prioritize collection navigation over fullscreen', () => {
    const routerPush = jest.fn();
    const onFullScreenImageClick = jest.fn();
    const handler = createParallaxImageClickHandler(
      { slug: 'test-collection' },
      undefined,
      true,
      onFullScreenImageClick,
      routerPush
    );

    expect(handler).toBeDefined();
    handler?.();
    expect(routerPush).toHaveBeenCalledWith('/test-collection');
    expect(onFullScreenImageClick).not.toHaveBeenCalled();
  });

  it('should return undefined when slug is empty string', () => {
    const routerPush = jest.fn();
    const handler = createParallaxImageClickHandler(
      { slug: '' },
      undefined,
      false,
      undefined,
      routerPush
    );
    expect(handler).toBeUndefined();
  });
});

