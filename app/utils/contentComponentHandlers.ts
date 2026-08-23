/**
 * Utility functions for Content Component handlers
 * Extracts business logic from React component code
 *
 * Design principles:
 * - Pure functions where possible (no side effects)
 * - Single responsibility per function
 * - Handler creators are higher-order functions that return event handlers
 */

import { type ViewableContent } from '@/app/types/Content';

/**
 * Create a unified click handler for any content type (IMAGE, COLLECTION, GIF, TEXT).
 * Delegates to parent via onContentClick callback.
 * Navigation/editing decisions are made by the parent component (the collection edit surface).
 *
 * Priority 1: If onContentClick is provided (admin/manage pages), the parent
 * component decides whether to navigate (collection) or edit metadata (image).
 * Priority 2: If fullscreen is enabled (public collection pages), call fullscreen handler.
 *
 * @param contentId - The content ID being clicked
 * @param onContentClick - Handler for content clicks (parent decides what to do based on content type)
 * @param enableFullScreenView - Whether fullscreen view is enabled (fallback for public pages)
 * @param onFullScreenClick - Optional handler for fullscreen (fallback for public pages)
 * @param fullScreenContent - Content to pass to fullscreen handler
 * @returns Click handler function or undefined
 */
export function createContentClickHandler(
  contentId: number,
  onContentClick?: (contentId: number) => void,
  enableFullScreenView?: boolean,
  onFullScreenClick?: (content: ViewableContent) => void,
  fullScreenContent?: ViewableContent
): (() => void) | undefined {
  if (onContentClick) {
    return () => onContentClick(contentId);
  }

  if (enableFullScreenView && onFullScreenClick && fullScreenContent) {
    return () => onFullScreenClick(fullScreenContent);
  }

  return undefined;
}
