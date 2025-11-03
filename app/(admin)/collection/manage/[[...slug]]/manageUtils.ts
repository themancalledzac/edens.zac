/**
 * Utility functions for ManageClient component
 * Handles data normalization, state management, and type guards
 */

import { type CollectionModel as ContentCollectionFullModel } from '@/app/lib/api/collections';
import {
  type CollectionModel,
  CollectionType,
  type CollectionUpdateRequest,
  type DisplayMode,
} from '@/app/types/Collection';
import { type AnyContentModel, type ImageContentModel } from '@/app/types/Content';

// Constants
export const COVER_IMAGE_FLASH_DURATION = 500; // milliseconds
export const DEFAULT_PAGE_SIZE = 50;

/**
 * Form data type for managing collections
 * All fields are required/have defaults for form state management
 */
export interface ManageFormData {
  type: CollectionType;
  title: string;
  description: string;
  location: string;
  collectionDate: string;
  visible: boolean;
  displayMode: DisplayMode;
  coverImageId?: number;
}

/**
 * Initialize form data from a collection
 * Provides sensible defaults for all fields
 */
export function initializeUpdateFormData(
  collection?: ContentCollectionFullModel | null
): ManageFormData {
  console.log('[initializeUpdateFormData] collection.collectionDate:', collection?.collectionDate);

  const formData = {
    type: collection?.type ?? CollectionType.PORTFOLIO,
    title: collection?.title || '',
    description: collection?.description || '',
    location: collection?.location || '',
    collectionDate: collection?.collectionDate || '',
    visible: collection?.visible ?? true,
    displayMode: collection?.displayMode ?? 'CHRONOLOGICAL',
    coverImageId: undefined,
  };

  console.log('[initializeUpdateFormData] formData.collectionDate:', formData.collectionDate);

  return formData;
}

/**
 * Build an update payload containing only changed fields
 * Compares form data with original collection and only includes differences
 * Includes content block operations (reorder, remove)
 * Note: New text blocks are added via separate POST endpoint, not through update
 */
export function buildUpdatePayload(
  formData: ManageFormData,
  originalCollection: ContentCollectionFullModel,
  // reorderOperations: ContentReorderOperation[] = [],
  // contentIdsToRemove: number[] = []
): CollectionUpdateRequest {
  const payload: CollectionUpdateRequest = {
    id: originalCollection.id, // ID is required for updates
  };

  // Field mappings: [formKey, originalValue]
  const fieldMappings: Array<{
    key: keyof ManageFormData;
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

  // Content operations - include if any are present
  // TODO: Update location of Reorder operations: now take place in the Image Update endpoint, where we pass the images' collections.'prev(childCollection)'.orderIndex.
  //  - This will be a SMALL api call, JUST with that orderIndex change, so that reorders are EACH an api call, making them much faster/instant.
  // if (reorderOperations.length > 0) {
  //   payload.reorderOperations = reorderOperations;
  // }
  // if (contentIdsToRemove.length > 0) {
  //   payload.contentIdsToRemove = contentIdsToRemove; // Updated field name
  // }

  return payload;
}

/**
 * Sync collection state after an update
 * Updates the collection object with new values from the update response
 */
export function syncCollectionState(
  collection: ContentCollectionFullModel,
  updateResponse: CollectionModel,
  formData: ManageFormData
): ContentCollectionFullModel {
  return {
    ...collection,
    title: updateResponse.title,
    description: updateResponse.description || '',
    location: updateResponse.location || '',
    collectionDate: updateResponse.collectionDate || '',
    visible: formData.visible,
    displayMode: formData.displayMode,
  };
}

/**
 * Type guard to check if a block is an ImageContentBlock
 */
export function isImageContentBlock(block: unknown): block is ImageContentModel {
  return (
    block !== null &&
    block !== undefined &&
    typeof block === 'object' &&
    'blockType' in block &&
    (block as { blockType: string }).blockType === 'IMAGE' &&
    'imageUrlWeb' in block
  );
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
  collection: ContentCollectionFullModel | null,
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
