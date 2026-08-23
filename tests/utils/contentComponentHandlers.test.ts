/**
 * Unit tests for contentComponentHandlers.ts
 * Tests handler creation and pure utility functions for Content Component
 */

import type { ContentImageModel, ContentParallaxImageModel } from '@/app/types/Content';
import { createContentClickHandler } from '@/app/utils/contentComponentHandlers';

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
