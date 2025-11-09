/**
 * Utility functions for ManageClient component
 * Handles data normalization, state management, and type guards
 */

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
  type ParallaxImageContentModel,
} from '@/app/types/Content';
import { isCollectionContent, isContentImage } from '@/app/utils/contentTypeGuards';

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
    if (formData[key] !== original) {
      // Type assertion needed since we're iterating dynamically
      (payload as unknown as Record<string, unknown>)[key] = formData[key];
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
 * Sync collection state after an update
 * Updates the collection object with new values from the update response
 */
export function syncCollectionState(
  collection: CollectionModel,
  updateResponse: CollectionModel,
  formData: CollectionUpdateRequest
): CollectionModel {
  return {
    ...collection,
    title: updateResponse.title,
    description: updateResponse.description || '',
    location: updateResponse.location || '',
    collectionDate: updateResponse.collectionDate || '',
    visible: formData.visible,
    displayMode: formData.displayMode,
    content: updateResponse.content || collection.content, // Sync content (includes updated child collections)
  };
}

/**
 * Type guard to check if a block is an ImageContentBlock
 * @deprecated Use isContentImage from @/app/utils/contentTypeGuards instead
 */
export function isImageContentBlock(block: unknown): block is ImageContentModel {
  // Re-export from contentTypeGuards for backward compatibility
  return isContentImage(block);
}

/**
 * Type guard to check if a block is a collection (ParallaxImageContentModel with slug)
 * Collections are now converted to Parallax type for unified rendering
 * This is different from isCollectionContent which checks for COLLECTION type
 */
export function isCollectionContentBlock(block: unknown): block is ParallaxImageContentModel {
  if (!block || typeof block !== 'object') return false;
  const candidate = block as Record<string, unknown>;
  return (
    candidate.contentType === 'PARALLAX' &&
    'slug' in candidate &&
    typeof candidate.slug === 'string' &&
    candidate.slug.length > 0
  );
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
 * Find an image block by ID from the collection's blocks
 * Returns the block if found and it's an image, otherwise undefined
 */
export function findImageBlockById(
  blocks: AnyContentModel[] | undefined,
  imageId: number | undefined
): ImageContentModel | undefined {
  if (!blocks || !imageId) return undefined;

  const block = blocks.find(b => b.id === imageId);
  return block && isImageContentBlock(block) ? block : undefined;
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
  
  if (imageBlock && isImageContentBlock(imageBlock)) {
    return imageBlock;
  }
  
  return null;
}

/**
 * Refresh collection data by fetching from the API
 * Re-fetches collection with full metadata using admin endpoint
 *
 * @param slug - Collection slug to fetch
 * @param getCollectionUpdateMetadata - Function to fetch collection data (injected for testability)
 * @returns Promise with CollectionUpdateResponseDTO containing collection and metadata
 */
export async function refreshCollectionData(
  slug: string,
  getCollectionUpdateMetadata: (slug: string) => Promise<CollectionUpdateResponseDTO>
): Promise<CollectionUpdateResponseDTO> {
  return await getCollectionUpdateMetadata(slug);
}

/**
 * Build updated collection state from API response
 * Returns a function that can be used with setState to update the collection
 *
 * @param response - CollectionUpdateResponseDTO from API
 * @returns State updater function for React setState
 */
export function updateCollectionState(
  response: CollectionUpdateResponseDTO
): (prev: CollectionUpdateResponseDTO | null) => CollectionUpdateResponseDTO {
  return (prev: CollectionUpdateResponseDTO | null) => ({
    ...prev!,
    collection: response.collection,
  });
}

/**
 * Update collection cache storage
 * Updates the sessionStorage cache with new collection data
 *
 * @param slug - Collection slug
 * @param collection - Updated collection data
 * @param collectionStorage - Collection storage instance (injected for testability)
 */
export function updateCollectionCache(
  slug: string,
  collection: CollectionModel,
  collectionStorage: { update: (slug: string, collection: CollectionModel) => void }
): void {
  collectionStorage.update(slug, collection);
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
    console.warn('[manageUtils] Failed to revalidate cache:', error);
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

