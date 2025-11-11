/**
 * Utility functions for ManageClient component
 * Handles data normalization, state management, and type guards
 */

import { reorderCollectionImages } from '@/app/lib/api/collections';
import {
  type ChildCollection,
  type CollectionModel,
  type CollectionUpdateRequest,
  type CollectionUpdateResponseDTO,
} from '@/app/types/Collection';
import {
  type AnyContentModel,
  type CollectionContentModel,
  type ContentImageUpdateResponse,
  type ImageContentModel,
} from '@/app/types/Content';
import { isCollectionContent, isContentImage } from '@/app/utils/contentTypeGuards';
import { isLocalEnvironment } from '@/app/utils/environment';

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
    { key: 'description', original: originalCollection.description || '' },
    { key: 'location', original: originalCollection.location || '' },
    { key: 'collectionDate', original: originalCollection.collectionDate || '' },
    { key: 'visible', original: originalCollection.visible },
    { key: 'displayMode', original: originalCollection.displayMode },
  ];

  // Only include fields that have actually changed
  for (const { key, original } of fieldMappings) {
    const formValue = formData[key];
    // Handle undefined/null comparison - treat undefined and null as equivalent
    // Also normalize empty strings for string fields
    const normalizedOriginal = original === null || original === undefined ? undefined : original;
    const normalizedFormValue = formValue === null || formValue === undefined ? undefined : formValue;
    
    if (normalizedFormValue !== normalizedOriginal) {
      // Type assertion needed since we're iterating dynamically
      (payload as unknown as Record<string, unknown>)[key] = formData[key];
      
      // DEBUG: Log displayMode changes specifically
      if (key === 'displayMode' && isLocalEnvironment()) {
        console.log('[buildUpdatePayload] displayMode change detected:', {
          key,
          original,
          formValue,
          normalizedOriginal,
          normalizedFormValue,
          willInclude: true,
        });
      }
    } else if (key === 'displayMode' && isLocalEnvironment()) {
      // DEBUG: Log when displayMode is NOT included
      console.log('[buildUpdatePayload] displayMode NOT changed (not included):', {
        key,
        original,
        formValue,
        normalizedOriginal,
        normalizedFormValue,
        areEqual: normalizedFormValue === normalizedOriginal,
      });
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


  return payload;
}

/**
 * Extract collection content blocks from a content array
 * Filters content to only CollectionContentModel items (child collections) and maps to selector format
 * Child collections are stored as COLLECTION type in the content array
 *
 * @param content - Array of content blocks from a collection
 * @returns Array of {id, name} objects for use in UnifiedMetadataSelector
 */
export function getCollectionContentAsSelections(
  content: AnyContentModel[] | undefined
): Array<{ id: number; name: string }> {
  if (!content) return [];

  return content
    .filter(isCollectionContent)
    .map((collection: CollectionContentModel) => ({
      id: collection.id,
      name: collection.title || collection.slug || '', // Use title if available, fallback to slug
    }));
}

/**
 * Get current selected collections by applying changes to original collection
 * Combines original collections (minus removals) with newly added collections
 *
 * @param collectionContent - Array of content blocks from the collection (to extract original collections)
 * @param updateDataCollections - Collections update object with remove and newValue arrays
 * @returns Array of currently selected collections for display in UI
 */
export function getCurrentSelectedCollections(
  collectionContent: AnyContentModel[] | undefined,
  updateDataCollections: CollectionUpdateRequest['collections'] | undefined
): Array<{ id: number; name: string }> {
  // Get original collections from collection content
  const selected = getCollectionContentAsSelections(collectionContent);
  
  // Filter out collections that are marked for removal
  const removeIds = new Set(updateDataCollections?.remove || []);
  const filtered = selected.filter(c => !removeIds.has(c.id));

  // Add new collections from newValue that aren't already in the filtered list
  const newCollections = updateDataCollections?.newValue || [];
  for (const newCollection of newCollections) {
    if (!filtered.some(c => c.id === newCollection.collectionId)) {
      filtered.push({
        id: newCollection.collectionId,
        name: newCollection.name || '',
      });
    }
  }

  return filtered;
}

/**
 * Find an image block by ID from the collection's blocks
 * Returns the block if found and it's an image, otherwise undefined
 */
export function findImageBlockById(
  blocks: AnyContentModel[] | undefined,
  imageId: number | undefined
): ImageContentModel | undefined {
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
): ImageContentModel | null | undefined {
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
 * Standardized error handling helper
 * Extracts error message from various error types or provides default
 * Handles: Error objects, fetch Response errors, API error objects, and strings
 */
export function handleApiError(error: unknown, defaultMessage: string): string {
  // Handle standard Error objects
  if (error instanceof Error) {
    return error.message;
  }

  // Handle fetch Response errors and API error responses
  if (typeof error === 'object' && error !== null) {
    // Check for nested response object (common in fetch errors)
    if ('response' in error && typeof (error as { response: unknown }).response === 'object') {
      const response = (error as { response: Record<string, unknown> }).response;
      if (response && 'statusText' in response && typeof response.statusText === 'string') {
        return response.statusText;
      }
      if (response && 'message' in response && typeof response.message === 'string') {
        return response.message;
      }
    }

    // Check for direct message property (API errors often have this)
    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      return (error as { message: string }).message;
    }

    // Check for status text (fetch Response objects)
    if ('statusText' in error && typeof (error as { statusText: unknown }).statusText === 'string') {
      return (error as { statusText: string }).statusText;
    }
  }

  // Handle string errors (sometimes thrown as strings)
  if (typeof error === 'string') {
    return error;
  }

  // Fallback to default message
  return defaultMessage;
}

/**
 * Build collections update object from selection changes
 * Implements simple toggle logic:
 * - Collections in original: deselected -> add to remove, selected -> remove from remove
 * - Collections NOT in original: selected -> add to newValue, deselected -> remove from newValue
 *
 * @param selectedCollections - Currently selected collections from the UI
 * @param originalCollectionIds - Set of collection IDs that exist in the original collection
 * @param currentCollectionsUpdate - Current collections update state from updateData
 * @returns New collections update object for CollectionUpdateRequest
 */
export function buildCollectionsUpdate(
  selectedCollections: Array<{ id: number; name: string }>,
  originalCollectionIds: Set<number>,
  currentCollectionsUpdate?: CollectionUpdateRequest['collections']
): CollectionUpdateRequest['collections'] | undefined {
  const selectedIds = new Set(selectedCollections.map(c => c.id));

  // Get current state from updateData
  const currentRemove = new Set(currentCollectionsUpdate?.remove || []);
  const currentNewValue = currentCollectionsUpdate?.newValue || [];

  // Build new state by comparing current selection with original
  const newRemove = new Set<number>();
  const newNewValue: ChildCollection[] = [];

  // Process each selected collection
  for (const [index, selected] of selectedCollections.entries()) {
    // Collection does NOT exist in original - add to newValue
    if (!originalCollectionIds.has(selected.id) && !currentNewValue.some(c => c.collectionId === selected.id)) {
      newNewValue.push({
        collectionId: selected.id,
        name: selected.name,
        visible: true,
        orderIndex: index,
      });
    }
    // If it exists in original, it stays in original (no action needed)
  }

  // Process collections that should be removed
  for (const originalId of originalCollectionIds) {
    // Original collection is not selected - should be in remove
    if (!selectedIds.has(originalId) && !currentRemove.has(originalId)) {
      newRemove.add(originalId);
    }
    // If selected, it stays in original (removed from remove list if it was there)
  }

  // Process collections that should be removed from newValue
  for (const newCollection of currentNewValue) {
    // Still selected - keep it
    if (selectedIds.has(newCollection.collectionId) && !newNewValue.some(c => c.collectionId === newCollection.collectionId)) {
      newNewValue.push(newCollection);
    }
    // If not selected, remove it (by not including in newNewValue)
  }

  // Build final state
  const finalRemove = Array.from(new Set([...currentRemove, ...newRemove])).filter(id => {
    // Only keep removals for collections that are still not selected
    return !selectedIds.has(id);
  });

  // Build the update object
  const collectionsUpdate: CollectionUpdateRequest['collections'] = {};
  if (finalRemove.length > 0) {
    collectionsUpdate.remove = finalRemove;
  }
  if (newNewValue.length > 0) {
    collectionsUpdate.newValue = newNewValue;
  }

  return Object.keys(collectionsUpdate).length > 0 ? collectionsUpdate : undefined;
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
  if (originalBlock && isCollectionContent(originalBlock)) {
    const collectionBlock = originalBlock as CollectionContentModel;
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
): ImageContentModel | null {
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
  try {
    await fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag: `collection-${slug}`,
        path: `/${slug}`,
      }),
    });
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
  collectionStorage: { update: (slug: string, collection: CollectionModel) => void }
): Promise<CollectionUpdateResponseDTO> {
  // Execute the operation first
  await operation();

  // Re-fetch collection using admin endpoint to get full data with collections arrays
  const response = await getCollectionUpdateMetadata(slug);

  // Update cache with full admin data (includes collections arrays)
  collectionStorage.update(slug, response.collection);

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
 * Calculate which images need to be reordered when dragging one image to another's position
 * Returns array of changes needed for the API call
 * 
 * Simple logic:
 * - If moving FORWARD (lower index → higher index): dragged item takes target position, 
 *   all items between (including target) move BACK by 1
 * - If moving BACKWARD (higher index → lower index): dragged item takes target position,
 *   all items between (including target) move FORWARD by 1
 * 
 * @param draggedContentId - ID of the content being dragged
 * @param targetContentId - ID of the content being dropped on
 * @param collection - Current collection state
 * @param collectionId - Collection ID
 * @returns Array of reorder changes to send to API
 */
export function calculateReorderChanges(
  draggedContentId: number,
  targetContentId: number,
  collection: CollectionModel,
  collectionId: number
): ReorderChange[] {
  const blocks = collection.content || [];
  const draggedBlock = blocks.find(b => b.id === draggedContentId);
  const targetBlock = blocks.find(b => b.id === targetContentId);

  if (!draggedBlock || !targetBlock) return [];

  const originalIndex = getContentOrderIndex(draggedBlock, collectionId);
  const targetIndex = getContentOrderIndex(targetBlock, collectionId);

  if (originalIndex === undefined || targetIndex === undefined) return [];
  if (originalIndex === targetIndex) return []; // No change needed

  const changes: ReorderChange[] = [];

  if (originalIndex < targetIndex) {
    // Moving FORWARD (e.g., position 2 → position 5)
    // Dragged item takes target position
    changes.push({ contentId: draggedContentId, newOrderIndex: targetIndex });
    
    // All items between original and target (including target) move BACK by 1
    for (let i = originalIndex + 1; i <= targetIndex; i++) {
      const block = blocks.find(b => getContentOrderIndex(b, collectionId) === i);
      if (block) {
        changes.push({ contentId: block.id, newOrderIndex: i - 1 });
      }
    }
  } else {
    // Moving BACKWARD (e.g., position 5 → position 2)
    // Dragged item takes target position
    changes.push({ contentId: draggedContentId, newOrderIndex: targetIndex });
    
    // All items between target and original (including target) move FORWARD by 1
    for (let i = targetIndex; i < originalIndex; i++) {
      const block = blocks.find(b => getContentOrderIndex(b, collectionId) === i);
      if (block) {
        changes.push({ contentId: block.id, newOrderIndex: i + 1 });
      }
    }
  }

  return changes;
}

/**
 * Apply reorder changes directly to a collection model (for optimistic updates)
 * Simply updates each block's orderIndex according to the provided changes
 * 
 * @param collection - Collection model to update
 * @param reorders - Array of ReorderChange with new orderIndex values
 * @param collectionId - Collection ID for updating image collection entries
 * @returns Updated collection model with new orderIndex values
 */
export function applyReorderChangesOptimistically(
  collection: CollectionModel,
  reorders: ReorderChange[],
  collectionId: number
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
    return updateBlockOrderIndex(block, collectionId, newOrderIndex);
  });

  return {
    ...collection,
    content: updatedContent,
  };
}



/**
 * Get the orderIndex for a content block
 * All content types have orderIndex in collections array (collection-specific)
 *
 * @param block - Content block (any type)
 * @param collectionId - ID of the collection to get orderIndex for
 * @returns orderIndex value, or undefined if not found
 */
export function getContentOrderIndex(
  block: AnyContentModel,
  collectionId: number
): number | undefined {
  // All content has orderIndex in collections array (collection-specific)
  // Type assertion needed since not all content types have collections in their type definition
  const blockWithCollections = block as AnyContentModel & { collections?: Array<{ collectionId: number; orderIndex?: number }> };
  const collectionEntry = blockWithCollections.collections?.find((c: { collectionId: number }) => c.collectionId === collectionId);
  return collectionEntry?.orderIndex;
}




/**
 * Execute reorder operation
 * Calls the API and refreshes collection data
 *
 * @param collectionId - ID of the collection
 * @param reorders - Array of reorder changes (ReorderChange format)
 * @param slug - Collection slug for cache refresh
 * @param getCollectionUpdateMetadata - Function to fetch collection data (injected for testability)
 * @param collectionStorage - Collection storage instance (injected for testability)
 * @returns Promise that resolves with refreshed CollectionUpdateResponseDTO
 */
export async function executeReorderOperation(
  collectionId: number,
  reorders: ReorderChange[],
  slug: string,
  getCollectionUpdateMetadata: (slug: string) => Promise<CollectionUpdateResponseDTO>,
  collectionStorage: { update: (slug: string, collection: CollectionModel) => void }
): Promise<CollectionUpdateResponseDTO> {
  // Convert to API format and call the reorder API
  await reorderCollectionImages(collectionId, reorders.map(change => ({
    imageId: change.contentId,
    newOrderIndex: change.newOrderIndex,
  })));

  // Refresh collection data to get updated orderIndex values
  const fullResponse = await getCollectionUpdateMetadata(slug);

  // Update cache
  collectionStorage.update(slug, fullResponse.collection);
  await revalidateCollectionCache(slug);

  return fullResponse;
}

/**
 * Update orderIndex for a content block
 * Updates the collection entry in the collections array (collection-specific)
 * @param block - Content block (any type) to update
 * @param collectionId - Collection ID to find the correct collection entry
 * @param newOrderIndex - New orderIndex value
 * @returns Updated content block
 */
export function updateBlockOrderIndex(
  block: AnyContentModel,
  collectionId: number,
  newOrderIndex: number
): AnyContentModel {
  // All content has orderIndex in collections array (collection-specific)
  // Type assertion needed since not all content types have collections in their type definition
  const blockWithCollections = block as AnyContentModel & { collections?: Array<{ collectionId: number; orderIndex?: number; name?: string; visible?: boolean; [key: string]: unknown }> };
  const existingCollections = blockWithCollections.collections || [];
  
  // Check if collection entry already exists
  const existingIndex = existingCollections.findIndex(
    (entry: { collectionId: number }) => entry.collectionId === collectionId
  );

  // Update existing entry or create new one if it doesn't exist
  const updatedCollections: Array<{ collectionId: number; orderIndex?: number; name?: string; visible?: boolean; [key: string]: unknown }> = existingIndex >= 0
    ? existingCollections.map((collectionEntry, index) => {
        if (index === existingIndex) {
          return {
            ...collectionEntry,
            orderIndex: newOrderIndex,
          };
        }
        return collectionEntry;
      })
    : [
        ...existingCollections,
        {
          collectionId,
          orderIndex: newOrderIndex,
          name: '',
          visible: true,
        },
      ];

  return {
    ...block,
    collections: updatedCollections,
  } as AnyContentModel;
}


