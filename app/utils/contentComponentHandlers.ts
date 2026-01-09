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
  type ContentCollectionModel,
  type ContentImageModel,
  type ContentParallaxImageModel,
} from '@/app/types/Content';
import { convertCollectionContentToParallax } from '@/app/utils/contentLayout';

/**
 * Check if an image is not visible (either globally or collection-specific)
 * @param itemContent - The image content to check
 * @param currentCollectionId - Optional collection ID to check collection-specific visibility
 * @returns true if the image is not visible
 */
export function checkImageVisibility(
  itemContent: ContentImageModel,
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
 * Create a unified click handler for any content type (IMAGE, COLLECTION, GIF, TEXT)
 * Handles drag state checking and delegates to parent via onContentClick callback.
 * Navigation/editing decisions are made by the parent component (ManageClient).
 * 
 * Priority:
 * 1. If onContentClick is provided (admin/manage pages) -> call it with contentId
 * 2. If fullscreen is enabled (public collection pages) -> call fullscreen handler
 * 3. Otherwise -> no click handler
 * 
 * Note: This function has side effects (mutates ref and calls callbacks) as required by React
 * 
 * @param contentId - The content ID being clicked
 * @param isDraggingRef - Ref to track if dragging is in progress
 * @param onContentClick - Handler for content clicks (parent decides what to do based on content type)
 * @param enableFullScreenView - Whether fullscreen view is enabled (fallback for public pages)
 * @param onFullScreenClick - Optional handler for fullscreen (fallback for public pages)
 * @param fullScreenContent - Content to pass to fullscreen handler
 * @returns Click handler function or undefined
 */
export function createContentClickHandler(
  contentId: number,
  isDraggingRef: React.MutableRefObject<boolean>,
  onContentClick?: (contentId: number) => void,
  enableFullScreenView?: boolean,
  onFullScreenClick?: (content: ContentImageModel | ContentParallaxImageModel) => void,
  fullScreenContent?: ContentImageModel | ContentParallaxImageModel
): (() => void) | undefined {
  // Priority 1: Parent-provided click handler (manage pages)
  // Parent component decides: navigate for collection, edit metadata for image
  if (onContentClick) {
    return () => {
      // Don't trigger click if we just finished dragging
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        return;
      }
      onContentClick(contentId);
    };
  }
  
  // Priority 2: Fullscreen view (public collection pages)
  if (enableFullScreenView && onFullScreenClick && fullScreenContent) {
    return () => {
      // Don't trigger click if we just finished dragging
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        return;
      }
      onFullScreenClick(fullScreenContent);
    };
  }
  
  return undefined;
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
    e.preventDefault();
    onDrop(e, itemContent.id);
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
 * Prepare all data and handlers needed to render COLLECTION content
 * Extracts all logic from React component
 * @param itemContent - The collection content to prepare
 * @param width - Content width
 * @param height - Content height
 * @param isMobile - Whether on mobile device
 * @param enableDragAndDrop - Whether drag-and-drop is enabled
 * @param draggedImageId - ID of content currently being dragged
 * @param isDraggingRef - Ref to track if dragging is in progress
 * @param onContentClick - Optional handler for content clicks (parent decides what to do)
 * @param enableFullScreenView - Whether fullscreen view is enabled
 * @param onFullScreenClick - Optional handler for fullscreen clicks
 * @param onDragStart - Handler for drag start events
 * @param onDragOver - Handler for drag over events
 * @param onDrop - Handler for drop events
 * @param onDragEnd - Handler for drag end events
 * @returns Object containing all data needed to render the collection content
 */
export function prepareCollectionContentRender(
  itemContent: ContentCollectionModel,
  width: number,
  height: number,
  isMobile: boolean,
  enableDragAndDrop: boolean,
  draggedImageId: number | null | undefined,
  isDraggingRef: React.MutableRefObject<boolean>,
  onContentClick?: (contentId: number) => void,
  enableFullScreenView?: boolean,
  onFullScreenClick?: (image: ContentImageModel | ContentParallaxImageModel) => void,
  onDragStart?: (contentId: number) => void,
  onDragOver?: (e: React.DragEvent, contentId: number) => void,
  onDrop?: (e: React.DragEvent, contentId: number) => void,
  onDragEnd?: () => void
) {
  // Convert to parallax content for display
  const parallaxContent = convertCollectionContentToParallax(itemContent);
  
  // Create unified click handler - delegates to parent via callback
  const handleClick = createContentClickHandler(
    itemContent.id,
    isDraggingRef,
    onContentClick,
    enableFullScreenView,
    onFullScreenClick,
    parallaxContent
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

