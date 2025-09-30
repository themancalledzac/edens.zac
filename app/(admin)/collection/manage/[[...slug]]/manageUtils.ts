/**
 * Utility functions for ManageClient component
 * Handles data normalization, state management, and type guards
 */

import { type ContentCollectionModel as ContentCollectionFullModel } from '@/app/lib/api/contentCollections';
import { type AnyContentBlock, type ImageContentBlock } from '@/app/types/ContentBlock';
import { type ContentBlockReorderOperation, type ContentCollectionModel, type ContentCollectionUpdateDTO, type DisplayMode } from '@/app/types/ContentCollection';

// Constants
export const COVER_IMAGE_FLASH_DURATION = 500; // milliseconds
export const DEFAULT_PAGE_SIZE = 30;

/**
 * Form data type for managing collections
 * All fields are required/have defaults for form state management
 */
export interface ManageFormData {
  title: string;
  description: string;
  location: string;
  visible: boolean;
  priority: number;
  displayMode: DisplayMode;
  homeCardEnabled: boolean;
  homeCardText: string;
  coverImageId?: number;
}

/**
 * Normalize a ContentCollectionModel response into a full ContentCollectionFullModel
 * Used after creating a new collection to convert the simplified response
 */
export function normalizeCollectionResponse(
  response: ContentCollectionModel
): ContentCollectionFullModel {
  return {
    id: response.id,
    type: response.type,
    title: response.title,
    slug: response.slug,
    description: response.description || '',
    location: response.location || '',
    collectionDate: response.collectionDate,
    coverImageUrl: response.coverImageUrl,
    coverImage: null, // New collection has no cover image initially
    visible: response.visible ?? true,
    priority: response.priority ?? 2,
    isPasswordProtected: false,
    hasAccess: true,
    displayMode: response.displayMode ?? 'CHRONOLOGICAL',
    homeCardEnabled: response.homeCardEnabled ?? false,
    homeCardText: response.homeCardText || '',
    blocks: [], // New collection has no blocks initially
    pagination: {
      currentPage: 0,
      totalPages: 0,
      totalBlocks: 0,
      pageSize: DEFAULT_PAGE_SIZE
    }
  };
}

/**
 * Initialize form data from a collection
 * Provides sensible defaults for all fields
 */
export function initializeUpdateFormData(
  collection?: ContentCollectionFullModel | null
): ManageFormData {
  return {
    title: collection?.title || '',
    description: collection?.description || '',
    location: collection?.location || '',
    visible: collection?.visible ?? true,
    priority: collection?.priority ?? 2,
    displayMode: collection?.displayMode ?? 'CHRONOLOGICAL',
    homeCardEnabled: collection?.homeCardEnabled ?? false,
    homeCardText: collection?.homeCardText || '',
    coverImageId: undefined
  };
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
  reorderOperations: ContentBlockReorderOperation[] = [],
  contentBlockIdsToRemove: number[] = []
): ContentCollectionUpdateDTO {
  const payload: ContentCollectionUpdateDTO = {};

  // Only include fields that have actually changed
  if (formData.title !== originalCollection.title) {
    payload.title = formData.title;
  }
  if (formData.description !== (originalCollection.description || '')) {
    payload.description = formData.description;
  }
  if (formData.location !== (originalCollection.location || '')) {
    payload.location = formData.location;
  }
  if (formData.visible !== originalCollection.visible) {
    payload.visible = formData.visible;
  }
  if (formData.priority !== originalCollection.priority) {
    payload.priority = formData.priority;
  }
  if (formData.displayMode !== originalCollection.displayMode) {
    payload.displayMode = formData.displayMode;
  }
  if (formData.homeCardEnabled !== originalCollection.homeCardEnabled) {
    payload.homeCardEnabled = formData.homeCardEnabled;
  }
  if (formData.homeCardText !== (originalCollection.homeCardText || '')) {
    payload.homeCardText = formData.homeCardText;
  }
  if (formData.coverImageId !== undefined) {
    payload.coverImageId = formData.coverImageId;
  }

  // Content block operations - include if any are present
  if (reorderOperations.length > 0) {
    payload.reorderOperations = reorderOperations;
  }
  if (contentBlockIdsToRemove.length > 0) {
    payload.contentBlockIdsToRemove = contentBlockIdsToRemove;
  }

  return payload;
}

/**
 * Sync collection state after an update
 * Updates the collection object with new values from the update response
 */
export function syncCollectionState(
  collection: ContentCollectionFullModel,
  updateResponse: ContentCollectionModel,
  formData: ManageFormData
): ContentCollectionFullModel {
  return {
    ...collection,
    title: updateResponse.title,
    description: updateResponse.description || '',
    location: updateResponse.location || '',
    visible: formData.visible,
    priority: formData.priority,
    displayMode: formData.displayMode,
    homeCardEnabled: formData.homeCardEnabled,
    homeCardText: formData.homeCardText || ''
  };
}

/**
 * Type guard to check if a block is an ImageContentBlock
 */
export function isImageContentBlock(block: unknown): block is ImageContentBlock {
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
  blocks: AnyContentBlock[] | undefined,
  imageId: number | undefined
): ImageContentBlock | undefined {
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
): ImageContentBlock | null | undefined {
  if (pendingCoverImageId) {
    return findImageBlockById(collection?.blocks as AnyContentBlock[], pendingCoverImageId);
  }
  return collection?.coverImage;
}

/**
 * Validate form data before submission
 * Returns error message if validation fails, null if valid
 */
export function validateFormData(formData: ManageFormData, isCreateMode: boolean): string | null {
  if (isCreateMode && !formData.title.trim()) {
    return 'Title is required';
  }

  if (formData.priority < 1 || formData.priority > 4) {
    return 'Priority must be between 1 and 4';
  }

  return null;
}