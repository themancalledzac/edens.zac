/**
 * Utility functions for ManageClient component
 * Handles data normalization, state management, and type guards
 */

import { reorderCollectionContent } from '@/app/lib/api/collections';
import {
  type CollectionModel,
  type CollectionUpdateRequest,
  type CollectionUpdateResponseDTO,
} from '@/app/types/Collection';
import {
  type AnyContentModel,
  type ContentCollectionModel,
  type ContentImageModel,
  type ContentImageUpdateResponse,
} from '@/app/types/Content';
import { isContentCollection, isContentImage } from '@/app/utils/contentTypeGuards';
import { isLocalEnvironment } from '@/app/utils/environment';

// Re-export handleApiError from shared utils so existing imports from this file remain valid
export { handleApiError } from '@/app/utils/apiUtils';

// Constants
export const COVER_IMAGE_FLASH_DURATION = 500; // milliseconds
export const DEFAULT_PAGE_SIZE = 50;


/**
 * Build an update payload containing only changed fields
 * Compares form data with original collection and only includes differences
 * Note: New text blocks are added via separate POST endpoint, not through update
 * Note: Content reordering is handled via Image Update endpoint where orderIndex is updated
 */
export function buildUpdatePayload(
  formData: CollectionUpdateRequest,
  originalCollection: CollectionModel
): CollectionUpdateRequest {
  const payload: CollectionUpdateRequest = {
    id: originalCollection.id, // ID is required for updates
  };

  // Field mappings: [formKey, originalValue]
  const fieldMappings: Array<{
    key: keyof CollectionUpdateRequest;
    original: unknown;
  }> = [
    { key: 'type', original: originalCollection.type },
    { key: 'title', original: originalCollection.title },
    { key: 'description', original: originalCollection.description },
    { key: 'visible', original: originalCollection.visible },
    { key: 'displayMode', original: originalCollection.displayMode },
    { key: 'rowsWide', original: originalCollection.rowsWide },
  ];

  // Only include fields that have actually changed
  for (const { key, original } of fieldMappings) {
    const formValue = formData[key];
    // Handle undefined/null comparison - treat undefined and null as equivalent
    // Also normalize empty strings for string fields
    const normalizedOriginal = original === null || original === undefined || original === '' ? undefined : original;
    const normalizedFormValue = formValue === null || formValue === undefined || formValue === '' ? undefined : formValue;
    
    if (normalizedFormValue !== normalizedOriginal) {
      // Type assertion needed since we're iterating dynamically
      (payload as unknown as Record<string, unknown>)[key] = formData[key];
    }
  }

  // Handle collectionDate separately: null means "explicitly clear", '' means "unchanged from null original"
  if (formData.collectionDate !== undefined) {
    const originalDate = originalCollection.collectionDate || null;
    const newDate = formData.collectionDate === '' ? null : formData.collectionDate;
    if (newDate !== originalDate) {
      payload.collectionDate = newDate;
    }
  }

  // Handle coverImageId separately (undefined vs missing distinction matters)
  if (formData.coverImageId !== undefined) {
    payload.coverImageId = formData.coverImageId;
  }

  // Handle collections separately - include if defined
  if (formData.collections !== undefined) {
    payload.collections = formData.collections;
  }

  // Handle location separately - include if defined (uses LocationUpdate pattern)
  if (formData.location !== undefined) {
    payload.location = formData.location;
  }

  return payload;
}

/**
 * Find an image block by ID from the collection's blocks
 * Returns the block if found and it's an image, otherwise undefined
 */
export function findImageBlockById(
  blocks: AnyContentModel[] | undefined,
  imageId: number | undefined
): ContentImageModel | undefined {
  if (!blocks || !imageId) return undefined;

  const block = blocks.find(b => b.id === imageId);
  return block && isContentImage(block) ? block : undefined;
}

/**
 * Get the displayed cover image - either pending selection or current
 */
export function getDisplayedCoverImage(
  collection: CollectionModel | null,
  pendingCoverImageId: number | undefined
): ContentImageModel | null | undefined {
  if (pendingCoverImageId) {
    // Type-safe check: only pass blocks if they exist and are the right type
    const blocks = collection?.content;
    if (!blocks || !Array.isArray(blocks)) return undefined;

    // Safe cast: ContentBlock[] from API response contains AnyContentModel instances at runtime
    return findImageBlockById(blocks as AnyContentModel[], pendingCoverImageId);
  }
  return collection?.coverImage;
}

/**
 * Validate that a cover image selection is valid
 * Returns true if the image exists and is an image block
 */
export function validateCoverImageSelection(
  imageId: number | undefined,
  blocks: AnyContentModel[] | undefined
): boolean {
  if (!imageId || !blocks) return false;
  const imageBlock = findImageBlockById(blocks, imageId);
  return imageBlock !== undefined;
}

/**
 * Handle cover image selection
 * Validates the selection and returns the result
 *
 * @param imageId - ID of the image to set as cover
 * @param content - Array of content blocks from the collection
 * @returns Object with success status and coverImageId if valid, or error message if invalid
 */
export function handleCoverImageSelection(
  imageId: number,
  content: AnyContentModel[] | undefined
): { success: true; coverImageId: number } | { success: false; error: string } {
  // Validate that the selected image exists and is an image block
  if (!validateCoverImageSelection(imageId, content)) {
    return {
      success: false,
      error: 'Invalid cover image selection. Please try again.',
    };
  }

  return {
    success: true,
    coverImageId: imageId,
  };
}

/**
 * Handle collection navigation
 * Finds the collection block and returns the navigation path
 *
 * @param imageId - ID of the clicked image (which may be a collection block)
 * @param content - Array of content blocks from the collection
 * @returns Collection slug if found, null otherwise
 */
export function handleCollectionNavigation(
  imageId: number,
  content: AnyContentModel[] | undefined
): string | null {
  const originalBlock = content?.find(block => block.id === imageId);
  if (originalBlock && isContentCollection(originalBlock)) {
    const collectionBlock = originalBlock as ContentCollectionModel;
    return collectionBlock.slug || null;
  }
  return null;
}

/**
 * Handle multi-select toggle
 * Returns the new array of selected image IDs after toggling
 *
 * @param imageId - ID of the image to toggle
 * @param currentSelectedIds - Current array of selected image IDs
 * @returns New array of selected image IDs
 */
export function handleMultiSelectToggle(
  imageId: number,
  currentSelectedIds: number[]
): number[] {
  if (currentSelectedIds.includes(imageId)) {
    // Deselect
    return currentSelectedIds.filter(id => id !== imageId);
  }
  // Select
  return [...currentSelectedIds, imageId];
}

/**
 * Handle single image edit
 * Finds the image block and returns it for editing
 *
 * @param imageId - ID of the image to edit
 * @param content - Array of content blocks from the collection
 * @param processedContent - Processed content array (may contain converted collection blocks)
 * @returns Image block if found, null otherwise
 */
export function handleSingleImageEdit(
  imageId: number,
  content: AnyContentModel[] | undefined,
  processedContent: AnyContentModel[]
): ContentImageModel | null {
  // Find block in original content or processed content
  const imageBlock =
    content?.find(block => block.id === imageId) ||
    processedContent.find(block => block.id === imageId);
  
  if (imageBlock && isContentImage(imageBlock)) {
    return imageBlock;
  }
  
  return null;
}

/**
 * Revalidate Next.js cache for a collection
 * Calls the revalidate API endpoint to invalidate Next.js cache
 *
 * @param slug - Collection slug to revalidate
 * @returns Promise that resolves when revalidation is complete (or fails silently)
 */
export async function revalidateCollectionCache(slug: string): Promise<void> {
  const revalidate = (body: Record<string, string>) =>
    fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  try {
    await Promise.all([
      // Revalidate the specific collection page
      revalidate({ tag: `collection-${slug}`, path: `/${slug}` }),
      // Revalidate the collections index (home page, type listings)
      revalidate({ tag: 'collections-index' }),
    ]);
  } catch (error) {
    // Fail silently - revalidation is not critical for functionality
    if (isLocalEnvironment()) {
      console.warn('[manageUtils] Failed to revalidate cache:', error);
    }
  }
}

/**
 * Merge new metadata entities into current state
 * Combines new metadata from API response with existing metadata in state
 *
 * @param response - ContentImageUpdateResponse containing newMetadata
 * @param _currentState - Current CollectionUpdateResponseDTO state (unused, kept for API compatibility)
 * @returns State updater function for React setState, or null if no new metadata
 */
export function mergeNewMetadata(
  response: ContentImageUpdateResponse,
  _currentState: CollectionUpdateResponseDTO | null
): ((prev: CollectionUpdateResponseDTO | null) => CollectionUpdateResponseDTO) | null {
  const { newMetadata } = response;
  
  // Check if there's any new metadata to merge
  if (!newMetadata || !Object.values(newMetadata).some(arr => arr && arr.length > 0)) {
    return null;
  }

  return (prev: CollectionUpdateResponseDTO | null) => ({
    ...prev!,
    tags: [...(prev?.tags || []), ...(newMetadata.tags || [])],
    people: [...(prev?.people || []), ...(newMetadata.people || [])],
    locations: [...(prev?.locations || []), ...(newMetadata.locations || [])],
    cameras: [...(prev?.cameras || []), ...(newMetadata.cameras || [])],
    lenses: [...(prev?.lenses || []), ...(newMetadata.lenses || [])],
    filmTypes: [...(prev?.filmTypes || []), ...(newMetadata.filmTypes || [])],
  });
}

/**
 * Refresh collection data after an operation
 * Common pattern used by handleImageUpload, handleTextBlockSubmit, etc.
 * 
 * Pattern:
 * 1. Execute the operation (async function)
 * 2. Re-fetch collection using admin endpoint
 * 3. Update state with refreshed collection (preserving metadata)
 * 4. Update cache with full admin data
 * 
 * @param slug - Collection slug
 * @param operation - Async function to execute before refresh
 * @param getCollectionUpdateMetadata - Function to fetch collection data (injected for testability)
 * @param collectionStorage - Collection storage instance (injected for testability)
 * @returns Promise that resolves with the refreshed CollectionUpdateResponseDTO
 * @throws Error if operation or refresh fails
 */
export async function refreshCollectionAfterOperation(
  slug: string,
  operation: () => Promise<void>,
  getCollectionUpdateMetadata: (slug: string) => Promise<CollectionUpdateResponseDTO>,
  collectionStorage: { update: (slug: string, collection: CollectionModel) => void; updateFull: (slug: string, response: CollectionUpdateResponseDTO) => void }
): Promise<CollectionUpdateResponseDTO> {
  // Execute the operation first
  await operation();

  // Re-fetch collection using admin endpoint to get full data with collections arrays
  const response = await getCollectionUpdateMetadata(slug);

  // Update both caches with full admin data (includes collections arrays)
  collectionStorage.update(slug, response.collection);
  collectionStorage.updateFull(slug, response);

  return response;
}

// ============================================================================
// Reorder Utilities
// ============================================================================

/**
 * Type for reorder changes (contentId can be image or collection ID)
 */
export type ReorderChange = { contentId: number; newOrderIndex: number };

/**
 * Apply reorder changes directly to a collection model (for optimistic updates)
 * Simply updates each block's orderIndex according to the provided changes
 * 
 * @param collection - Collection model to update
 * @param reorders - Array of ReorderChange with new orderIndex values
 * @returns Updated collection model with new orderIndex values
 */
export function applyReorderChangesOptimistically(
  collection: CollectionModel,
  reorders: ReorderChange[]
): CollectionModel {
  if (reorders.length === 0) return collection;

  // Create a map of contentId -> newOrderIndex for quick lookup
  const reorderMap = new Map(reorders.map(r => [r.contentId, r.newOrderIndex]));

  // Update all content blocks with new orderIndex values
  const updatedContent = (collection.content || []).map(block => {
    const newOrderIndex = reorderMap.get(block.id);
    
    // If this block is not in the reorder map, return as-is
    if (newOrderIndex === undefined) return block;

    // All content types have orderIndex in collections array (collection-specific)
    return updateBlockOrderIndex(block, newOrderIndex);
  });

  return {
    ...collection,
    content: updatedContent,
  };
}



/**
 * Get the orderIndex for a content block
 * Uses direct orderIndex property - works for all content types (images, collections, text, GIFs)
 *
 * @param block - Content block (any type)
 * @returns orderIndex value, or undefined if not found
 */
export function getContentOrderIndex(block: AnyContentModel): number | undefined {
  return block.orderIndex;
}




/**
 * Execute reorder operation - calls the API and returns the updated collection
 * @param collectionId - ID of the collection
 * @param reorders - Array of {contentId, newOrderIndex} changes
 * @param slug - Collection slug for cache revalidation
 */
export async function executeReorderOperation(
  collectionId: number,
  reorders: ReorderChange[],
  slug: string
): Promise<CollectionModel> {
  const response = await reorderCollectionContent(collectionId, reorders.map(change => ({
    contentId: change.contentId,
    newOrderIndex: change.newOrderIndex,
  })));

  void revalidateCollectionCache(slug);

  return response;
}

/**
 * Update orderIndex for a content block
 * Updates the direct orderIndex property - works for all content types
 * @param block - Content block (any type) to update
 * @param newOrderIndex - New orderIndex value
 * @returns Updated content block
 */
export function updateBlockOrderIndex(
  block: AnyContentModel,
  newOrderIndex: number
): AnyContentModel {
  return {
    ...block,
    orderIndex: newOrderIndex,
  };
}

// ===================== Reorder Mode Utilities =====================

export interface ReorderMove {
  imageId: number;
  toIndex: number;
}

/**
 * Replay a list of moves against an original order to produce the current display order.
 * Each move removes the image from its current position and inserts it at toIndex.
 */
export function replayMoves(originalOrder: number[], moves: ReorderMove[]): number[] {
  const order = [...originalOrder];
  for (const move of moves) {
    const fromIndex = order.indexOf(move.imageId);
    if (fromIndex === -1) {
      console.warn(`[replayMoves] imageId ${move.imageId} not found in current order — move skipped`);
      continue;
    }
    // Remove from current position
    order.splice(fromIndex, 1);
    // Insert at target position
    order.splice(move.toIndex, 0, move.imageId);
  }
  return order;
}

/**
 * Apply an arrow move (shift ±1 position) to an image in the current order.
 * Returns the new order and the move entry to append.
 */
export function applyArrowMove(
  currentOrder: number[],
  imageId: number,
  direction: -1 | 1
): { newOrder: number[]; move: ReorderMove } | null {
  const fromIndex = currentOrder.indexOf(imageId);
  if (fromIndex === -1) return null;

  const toIndex = fromIndex + direction;
  if (toIndex < 0 || toIndex >= currentOrder.length) return null;

  const newOrder = [...currentOrder];
  // Swap adjacent items
  newOrder[fromIndex] = currentOrder[toIndex]!;
  newOrder[toIndex] = imageId;

  return { newOrder, move: { imageId, toIndex } };
}

/**
 * Apply pick-and-place: remove pickedId from its current position and insert at targetId's position.
 * Everything between shifts to fill the gap (splice/insert semantics).
 */
export function applyPickAndPlace(
  currentOrder: number[],
  pickedId: number,
  targetId: number
): { newOrder: number[]; move: ReorderMove } | null {
  const fromIndex = currentOrder.indexOf(pickedId);
  const targetIndex = currentOrder.indexOf(targetId);
  if (fromIndex === -1 || targetIndex === -1 || fromIndex === targetIndex) return null;

  const newOrder = [...currentOrder];
  // Remove from current position
  newOrder.splice(fromIndex, 1);
  // Insert at target position (targetIndex may have shifted after splice)
  const insertIndex = newOrder.indexOf(targetId);
  newOrder.splice(insertIndex, 0, pickedId);

  return { newOrder, move: { imageId: pickedId, toIndex: insertIndex } };
}

/**
 * Cancel all moves for a given image. Returns the filtered moves array.
 */
export function cancelImageMoves(moves: ReorderMove[], imageId: number): ReorderMove[] {
  return moves.filter(m => m.imageId !== imageId);
}

/**
 * Convert a final display order to ReorderChange[] for the API.
 * Each item gets a newOrderIndex matching its position in the final array.
 */
export function buildReorderChangesFromFinalOrder(
  finalOrder: number[],
  originalOrder: number[]
): ReorderChange[] {
  const changes: ReorderChange[] = [];
  for (let i = 0; i < finalOrder.length; i++) {
    const id = finalOrder[i]!;
    // Only include items whose position actually changed
    if (originalOrder.indexOf(id) !== i) {
      changes.push({ contentId: id, newOrderIndex: i });
    }
  }
  return changes;
}
