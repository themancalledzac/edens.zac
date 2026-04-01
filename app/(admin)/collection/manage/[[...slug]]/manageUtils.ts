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

export const COVER_IMAGE_FLASH_DURATION = 500; // milliseconds
export const DEFAULT_PAGE_SIZE = 50;

/**
 * Build an update payload containing only changed fields.
 * Compares form data with original collection and only includes differences.
 *
 * @remarks
 * - `undefined` and `null` and `''` are treated as equivalent (normalized to `undefined`).
 * - `collectionDate`: `null` means "explicitly clear"; `''` means unchanged from a null original.
 *   When the date is cleared and was previously set, `clearCollectionDate: true` is sent instead.
 * - `coverImageId`, `collections`, and `location` use presence-check (`!== undefined`) rather
 *   than value-diff because each has its own update semantics.
 * - New text blocks are added via a separate POST endpoint, not through this payload.
 * - Content reordering is handled via the Image Update endpoint (orderIndex field).
 */
export function buildUpdatePayload(
  formData: CollectionUpdateRequest,
  originalCollection: CollectionModel
): CollectionUpdateRequest {
  const payload: CollectionUpdateRequest = {
    id: originalCollection.id,
  };

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

  for (const { key, original } of fieldMappings) {
    const formValue = formData[key];
    const normalizedOriginal =
      original === null || original === undefined || original === '' ? undefined : original;
    const normalizedFormValue =
      formValue === null || formValue === undefined || formValue === '' ? undefined : formValue;

    if (normalizedFormValue !== normalizedOriginal) {
      (payload as unknown as Record<string, unknown>)[key] = formData[key];
    }
  }

  if (formData.collectionDate !== undefined) {
    const originalDate = originalCollection.collectionDate || null;
    const newDate = formData.collectionDate === '' ? null : formData.collectionDate;
    if (newDate !== originalDate) {
      if (newDate === null && originalDate !== null) {
        payload.clearCollectionDate = true;
      } else {
        payload.collectionDate = newDate;
      }
    }
  }

  if (formData.coverImageId !== undefined) {
    payload.coverImageId = formData.coverImageId;
  }

  if (formData.collections !== undefined) {
    payload.collections = formData.collections;
  }

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
 * Get the displayed cover image - either pending selection or current.
 *
 * @remarks
 * Casts `collection.content` to `AnyContentModel[]` — safe because the API response
 * always populates content with `AnyContentModel` instances at runtime.
 */
export function getDisplayedCoverImage(
  collection: CollectionModel | null,
  pendingCoverImageId: number | undefined
): ContentImageModel | null | undefined {
  if (pendingCoverImageId) {
    const blocks = collection?.content;
    if (!blocks || !Array.isArray(blocks)) return undefined;
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
export function handleMultiSelectToggle(imageId: number, currentSelectedIds: number[]): number[] {
  if (currentSelectedIds.includes(imageId)) {
    return currentSelectedIds.filter(id => id !== imageId);
  }
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
      revalidate({ tag: `collection-${slug}`, path: `/${slug}` }),
      revalidate({ tag: 'collections-index' }),
      revalidate({ tag: 'collection-home' }),
    ]);
  } catch (error) {
    if (isLocalEnvironment()) {
      console.warn('[manageUtils] Failed to revalidate cache:', error);
    }
  }
}

/**
 * Revalidate Next.js cache for metadata (tags, people, cameras, locations, lenses, film)
 * Called after operations that create, update, or delete metadata entities.
 */
export async function revalidateMetadataCache(): Promise<void> {
  try {
    await fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tags: [
          'content-tags',
          'content-people',
          'content-cameras',
          'content-locations',
          'content-lenses',
          'content-film-metadata',
          'search-images',
        ],
      }),
    });
  } catch (error) {
    if (isLocalEnvironment()) {
      console.warn('[manageUtils] Failed to revalidate metadata cache:', error);
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
  getCollectionUpdateMetadata: (slug: string) => Promise<CollectionUpdateResponseDTO | null>,
  collectionStorage: {
    update: (slug: string, collection: CollectionModel) => void;
    updateFull: (slug: string, response: CollectionUpdateResponseDTO) => void;
  }
): Promise<CollectionUpdateResponseDTO> {
  await operation();

  const response = await getCollectionUpdateMetadata(slug);

  if (response === null) {
    throw new Error('No response received from server after operation');
  }

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

  const reorderMap = new Map(reorders.map(r => [r.contentId, r.newOrderIndex]));

  const updatedContent = (collection.content || []).map(block => {
    const newOrderIndex = reorderMap.get(block.id);
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
  const response = await reorderCollectionContent(
    collectionId,
    reorders.map(change => ({
      contentId: change.contentId,
      newOrderIndex: change.newOrderIndex,
    }))
  );

  if (response === null) {
    throw new Error('No response received from server after reorder operation');
  }

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
      console.warn(
        `[replayMoves] imageId ${move.imageId} not found in current order — move skipped`
      );
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
 *
 * @remarks Only items whose position actually changed (relative to `originalOrder`) are included.
 */
export function buildReorderChangesFromFinalOrder(
  finalOrder: number[],
  originalOrder: number[]
): ReorderChange[] {
  const changes: ReorderChange[] = [];
  for (let i = 0; i < finalOrder.length; i++) {
    const id = finalOrder[i]!;
    if (originalOrder.indexOf(id) !== i) {
      changes.push({ contentId: id, newOrderIndex: i });
    }
  }
  return changes;
}
