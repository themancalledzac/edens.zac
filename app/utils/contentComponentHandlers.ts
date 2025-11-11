/**
 * Utility functions for Content Component handlers
 * Extracts business logic from React component code
 * 
 * Design principles:
 * - Pure functions where possible (no side effects)
 * - Single responsibility per function
 * - Handler creators are higher-order functions that return event handlers
 */

import {
  type AnyContentModel,
  type CollectionContentModel,
  type ImageContentModel,
  type ParallaxImageContentModel,
} from '@/app/types/Content';
import { convertCollectionContentToParallax } from '@/app/utils/contentLayout';

/**
 * Check if an image is not visible (either globally or collection-specific)
 * @param itemContent - The image content to check
 * @param currentCollectionId - Optional collection ID to check collection-specific visibility
 * @returns true if the image is not visible
 */
export function checkImageVisibility(
  itemContent: ImageContentModel,
  currentCollectionId?: number
): boolean {
  // Check direct visibility first
  if (itemContent.visible === false) {
    return true;
  }

  // If we have a collection ID, also check collection-specific visibility
  if (currentCollectionId && itemContent.collections) {
    const collectionEntry = itemContent.collections.find(
      c => c.collectionId === currentCollectionId
    );
    if (collectionEntry?.visible === false) {
      return true;
    }
  }

  return false;
}

/**
 * Check if content has a slug (indicating it's a collection)
 * @param itemContent - The content to check
 * @returns true if the content has a slug
 */
export function hasSlug(itemContent: { slug?: string }): boolean {
  return !!itemContent.slug;
}

/**
 * Determine which click action to use for an image
 * Pure function - no side effects
 * @param onImageClick - Optional handler for image clicks
 * @param enableFullScreenView - Whether fullscreen view is enabled
 * @param onFullScreenImageClick - Optional handler for fullscreen image clicks
 * @returns 'imageClick' | 'fullscreen' | 'none'
 */
export function determineImageClickAction(
  onImageClick?: (imageId: number) => void,
  enableFullScreenView?: boolean,
  onFullScreenImageClick?: (image: ImageContentModel) => void
): 'imageClick' | 'fullscreen' | 'none' {
  if (onImageClick) {
    return 'imageClick';
  }
  if (enableFullScreenView && onFullScreenImageClick) {
    return 'fullscreen';
  }
  return 'none';
}

/**
 * Create a click handler for image content
 * Handles drag state checking and routes to appropriate handler
 * Note: This function has side effects (mutates ref and calls callbacks) as required by React
 * @param itemContent - The image content being clicked
 * @param isDraggingRef - Ref to track if dragging is in progress
 * @param onImageClick - Optional handler for image clicks (cover selection, metadata editing)
 * @param enableFullScreenView - Whether fullscreen view is enabled
 * @param onFullScreenImageClick - Optional handler for fullscreen image clicks
 * @returns Click handler function or undefined
 */
export function createImageClickHandler(
  itemContent: ImageContentModel,
  isDraggingRef: React.MutableRefObject<boolean>,
  onImageClick?: (imageId: number) => void,
  enableFullScreenView?: boolean,
  onFullScreenImageClick?: (image: ImageContentModel) => void
): (() => void) | undefined {
  const action = determineImageClickAction(onImageClick, enableFullScreenView, onFullScreenImageClick);
  
  if (action === 'none') {
    return undefined;
  }

  return () => {
    // Don't trigger click if we just finished dragging
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      return;
    }
    
    if (action === 'imageClick' && onImageClick) {
      onImageClick(itemContent.id);
    } else if (action === 'fullscreen' && onFullScreenImageClick) {
      onFullScreenImageClick(itemContent);
    }
  };
}

/**
 * Create drag start handler for drag-and-drop reordering
 * Note: This function has side effects (mutates ref and calls callbacks) as required by React
 * @param itemContent - The content being dragged (IMAGE or COLLECTION)
 * @param isDraggingRef - Ref to track if dragging is in progress
 * @param onDragStart - Handler for drag start events
 * @returns Drag start handler function or undefined
 */
export function createDragStartHandler(
  itemContent: AnyContentModel,
  isDraggingRef: React.MutableRefObject<boolean>,
  onDragStart?: (contentId: number) => void
): ((e: React.DragEvent) => void) | undefined {
  if (!onDragStart) {
    return undefined;
  }

  return (e: React.DragEvent) => {
    e.stopPropagation();
    isDraggingRef.current = true;
    onDragStart(itemContent.id);
  };
}

/**
 * Create drag over handler for drag-and-drop reordering
 * Note: This function has side effects (calls callbacks) as required by React
 * @param itemContent - The content being dragged over (IMAGE or COLLECTION)
 * @param draggedContentId - ID of the content currently being dragged
 * @param onDragOver - Handler for drag over events
 * @returns Drag over handler function or undefined
 */
export function createDragOverHandler(
  itemContent: AnyContentModel,
  draggedContentId: number | null | undefined,
  onDragOver?: (e: React.DragEvent, contentId: number) => void
): ((e: React.DragEvent) => void) | undefined {
  if (!onDragOver || !draggedContentId || draggedContentId === itemContent.id) {
    return undefined;
  }

  return (e: React.DragEvent) => {
    e.preventDefault(); // Required to allow drop
    onDragOver(e, itemContent.id);
  };
}

/**
 * Create drop handler for drag-and-drop reordering
 * Note: This function has side effects (mutates ref and calls callbacks) as required by React
 * @param itemContent - The content being dropped on (IMAGE or COLLECTION)
 * @param draggedContentId - ID of the content currently being dragged
 * @param isDraggingRef - Ref to track if dragging is in progress
 * @param onDrop - Handler for drop events
 * @returns Drop handler function or undefined
 */
export function createDropHandler(
  itemContent: AnyContentModel,
  draggedContentId: number | null | undefined,
  isDraggingRef: React.MutableRefObject<boolean>,
  onDrop?: (e: React.DragEvent, contentId: number) => void
): ((e: React.DragEvent) => void) | undefined {
  if (!onDrop || !draggedContentId || draggedContentId === itemContent.id) {
    return undefined;
  }

  return (e: React.DragEvent) => {
    e.preventDefault(); // Required for drop to work
    onDrop(e, itemContent.id);
    isDraggingRef.current = false;
  };
}

/**
 * Create drag end handler for drag-and-drop reordering
 * @param isDraggingRef - Ref to track if dragging is in progress
 * @param onDragEnd - Handler for drag end events
 * @returns Drag end handler function or undefined
 */
export function createDragEndHandler(
  isDraggingRef: React.MutableRefObject<boolean>,
  onDragEnd?: () => void
): (() => void) | undefined {
  if (!onDragEnd) return undefined;

  return () => {
    // Use setTimeout to allow drop event to fire first
    setTimeout(() => {
      isDraggingRef.current = false;
      onDragEnd();
    }, 0);
  };
}

/**
 * Create drag handlers object for a content item (IMAGE or COLLECTION)
 * Consolidates all drag-and-drop handler creation logic
 * @param itemContent - The content item (IMAGE or COLLECTION)
 * @param enableDragAndDrop - Whether drag-and-drop is enabled
 * @param draggedContentId - ID of the content currently being dragged
 * @param isDraggingRef - Ref to track if dragging is in progress
 * @param onDragStart - Handler for drag start events
 * @param onDragOver - Handler for drag over events
 * @param onDrop - Handler for drop events
 * @param onDragEnd - Handler for drag end events
 * @returns Object containing all drag handlers or undefined handlers
 */
export function createDragHandlers(
  itemContent: AnyContentModel,
  enableDragAndDrop: boolean,
  draggedContentId: number | null | undefined,
  isDraggingRef: React.MutableRefObject<boolean>,
  onDragStart?: (contentId: number) => void,
  onDragOver?: (e: React.DragEvent, contentId: number) => void,
  onDrop?: (e: React.DragEvent, contentId: number) => void,
  onDragEnd?: () => void
) {
  if (!enableDragAndDrop) {
    return {
      handleDragStartEvent: undefined,
      handleDragOverEvent: undefined,
      handleDropEvent: undefined,
      handleDragEndEvent: undefined,
    };
  }

  return {
    handleDragStartEvent: createDragStartHandler(itemContent, isDraggingRef, onDragStart),
    handleDragOverEvent: createDragOverHandler(itemContent, draggedContentId, onDragOver),
    handleDropEvent: createDropHandler(itemContent, draggedContentId, isDraggingRef, onDrop),
    handleDragEndEvent: createDragEndHandler(isDraggingRef, onDragEnd),
  };
}

/**
 * Determine the navigation path for a collection
 * @param slug - The collection slug
 * @param isAdminContext - Whether we're in an admin context
 * @returns The navigation path
 */
export function getCollectionNavigationPath(slug: string, isAdminContext: boolean): string {
  return isAdminContext ? `/collection/manage/${slug}` : `/${slug}`;
}

/**
 * Create click handler for parallax image content
 * Note: This function has side effects (calls callbacks) as required by React
 * @param itemContent - The parallax image content
 * @param onImageClick - Optional handler for image clicks (used to detect admin context)
 * @param enableFullScreenView - Whether fullscreen view is enabled
 * @param onFullScreenImageClick - Optional handler for fullscreen image clicks
 * @param routerPush - Function to navigate (router.push)
 * @returns Click handler function or undefined
 */
export function createParallaxImageClickHandler(
  itemContent: { slug?: string },
  onImageClick?: (imageId: number) => void,
  enableFullScreenView?: boolean,
  onFullScreenImageClick?: (image: ImageContentModel | ParallaxImageContentModel) => void,
  routerPush?: (path: string) => void
): (() => void) | undefined {
  const isCollection = hasSlug(itemContent);
  const isAdmin = !!onImageClick;
  
  if (isCollection && routerPush && itemContent.slug) {
    const path = getCollectionNavigationPath(itemContent.slug, isAdmin);
    return () => routerPush(path);
  }
  
  if (enableFullScreenView && onFullScreenImageClick) {
    return () => {
      onFullScreenImageClick(itemContent as ImageContentModel | ParallaxImageContentModel);
    };
  }
  
  return undefined;
}

/**
 * Prepare all data and handlers needed to render COLLECTION content
 * Extracts all logic from React component
 * @param itemContent - The collection content to prepare
 * @param width - Content width
 * @param height - Content height
 * @param isMobile - Whether on mobile device
 * @param enableDragAndDrop - Whether drag-and-drop is enabled
 * @param draggedImageId - ID of content currently being dragged
 * @param isDraggingRef - Ref to track if dragging is in progress
 * @param onImageClick - Optional handler for image clicks
 * @param enableFullScreenView - Whether fullscreen view is enabled
 * @param onFullScreenImageClick - Optional handler for fullscreen image clicks
 * @param routerPush - Function to navigate (router.push)
 * @param onDragStart - Handler for drag start events
 * @param onDragOver - Handler for drag over events
 * @param onDrop - Handler for drop events
 * @param onDragEnd - Handler for drag end events
 * @returns Object containing all data needed to render the collection content
 */
export function prepareCollectionContentRender(
  itemContent: CollectionContentModel,
  width: number,
  height: number,
  isMobile: boolean,
  enableDragAndDrop: boolean,
  draggedImageId: number | null | undefined,
  isDraggingRef: React.MutableRefObject<boolean>,
  onImageClick?: (imageId: number) => void,
  enableFullScreenView?: boolean,
  onFullScreenImageClick?: (image: ImageContentModel | ParallaxImageContentModel) => void,
  routerPush?: (path: string) => void,
  onDragStart?: (contentId: number) => void,
  onDragOver?: (e: React.DragEvent, contentId: number) => void,
  onDrop?: (e: React.DragEvent, contentId: number) => void,
  onDragEnd?: () => void
) {
  const handleClick = createParallaxImageClickHandler(
    itemContent,
    onImageClick,
    enableFullScreenView,
    onFullScreenImageClick,
    routerPush
  );

  const isDragged = enableDragAndDrop && draggedImageId === itemContent.id;
  const {
    handleDragStartEvent,
    handleDragOverEvent,
    handleDropEvent,
    handleDragEndEvent,
  } = createDragHandlers(
    itemContent,
    enableDragAndDrop,
    draggedImageId,
    isDraggingRef,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd
  );

  const parallaxContent = convertCollectionContentToParallax(itemContent);

  return {
    handleClick,
    isDragged,
    handleDragStartEvent,
    handleDragOverEvent,
    handleDropEvent,
    handleDragEndEvent,
    parallaxContent,
    containerStyle: {
      width: isMobile ? '100%' : width,
      height: isMobile ? 'auto' : height,
      aspectRatio: isMobile ? width / height : undefined,
      cursor: enableDragAndDrop ? 'grab' : (handleClick ? 'pointer' : 'default'),
      boxSizing: 'border-box' as const,
      position: 'relative' as const,
      opacity: isDragged ? 0.5 : 1,
    },
    cardTypeBadge: itemContent.collectionType,
  };
}

