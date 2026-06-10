/**
 * Utility functions for the collection edit surface (useCollectionEdit)
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
  type ContentGifModel,
  type ContentImageModel,
  type ContentImageUpdateResponse,
} from '@/app/types/Content';
import { toggleRelation } from '@/app/utils/collectionToggle';
import { isContentCollection, isContentImage, isGifContent } from '@/app/utils/contentTypeGuards';
import { isLocalEnvironment } from '@/app/utils/environment';
import { toggleImageSelection } from '@/app/utils/imageSelection';
import { logger } from '@/app/utils/logger';

export const COVER_IMAGE_FLASH_DURATION = 500; // milliseconds

/** Re-export of {@link toggleRelation} so existing callers import from here unchanged. */
export { toggleRelation };

/**
 * Build an update payload containing only changed scalar fields. Relational fields
 * (`collections`, `siblings`, `parents`, `locations`, `tags`, `coverImageId`) are included
 * as-is when present. `clearCollectionDate: true` is substituted when a previously-set date
 * is removed. `null`/`undefined`/`''` are treated as equivalent for scalar comparison.
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
    { key: 'visibility', original: originalCollection.visibility },
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

  if (formData.siblings !== undefined) {
    payload.siblings = formData.siblings;
  }

  if (formData.parents !== undefined) {
    payload.parents = formData.parents;
  }

  if (formData.locations !== undefined) {
    payload.locations = formData.locations;
  }

  if (formData.tags !== undefined) {
    payload.tags = formData.tags;
  }

  return payload;
}

/** Returns the image block with the given ID, or undefined if absent or wrong type. */
export function findImageBlockById(
  blocks: AnyContentModel[] | undefined,
  imageId: number | undefined
): ContentImageModel | undefined {
  if (!blocks || !imageId) return undefined;

  const block = blocks.find(b => b.id === imageId);
  return block && isContentImage(block) ? block : undefined;
}

/** Returns true if `imageId` resolves to an image block in `blocks`. */
export function validateCoverImageSelection(
  imageId: number | undefined,
  blocks: AnyContentModel[] | undefined
): boolean {
  if (!imageId || !blocks) return false;
  const imageBlock = findImageBlockById(blocks, imageId);
  return imageBlock !== undefined;
}

/** Validates that `imageId` is a real image block; returns a success/error discriminant. */
export function handleCoverImageSelection(
  imageId: number,
  content: AnyContentModel[] | undefined
): { success: true; coverImageId: number } | { success: false; error: string } {
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

/** Returns the slug of the collection block with the given ID, or null if not found. */
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
 * Toggle an image in the multi-select list. Delegates to {@link toggleImageSelection}.
 * Name preserved here for existing callers and tests.
 */
export function handleMultiSelectToggle(imageId: number, currentSelectedIds: number[]): number[] {
  return toggleImageSelection(imageId, currentSelectedIds);
}

/** Returns the image or GIF block with the given ID from content or processedContent, else null. */
export function handleSingleImageEdit(
  imageId: number,
  content: AnyContentModel[] | undefined,
  processedContent: AnyContentModel[]
): ContentImageModel | ContentGifModel | null {
  const block =
    content?.find(b => b.id === imageId) || processedContent.find(b => b.id === imageId);

  if (block && (isContentImage(block) || isGifContent(block))) {
    return block;
  }

  return null;
}

/** POSTs to /api/revalidate for the collection's tag, path, and the global indexes. Fails silently in production. */
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
      logger.warn('manageUtils', 'Failed to revalidate cache', { error });
    }
  }
}

/** Invalidates all metadata cache tags (tags, people, cameras, locations, lenses, film). */
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
      logger.warn('manageUtils', 'Failed to revalidate metadata cache', { error });
    }
  }
}

/**
 * Returns a setState updater that appends `response.newMetadata` into the DTO's lookup arrays,
 * or null if there is nothing new to merge.
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
 * Execute `operation`, then re-fetch the admin DTO for `slug` and update the cache.
 * Dependencies are injected for testability. Throws if either step fails.
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

/** Returns a new collection model with each listed block's `orderIndex` updated optimistically. */
export function applyReorderChangesOptimistically(
  collection: CollectionModel,
  reorders: ReorderChange[]
): CollectionModel {
  if (reorders.length === 0) return collection;

  const reorderMap = new Map(reorders.map(r => [r.contentId, r.newOrderIndex]));

  const updatedContent = (collection.content || []).map(block => {
    const newOrderIndex = reorderMap.get(block.id);
    if (newOrderIndex === undefined) return block;

    return updateBlockOrderIndex(block, newOrderIndex);
  });

  return {
    ...collection,
    content: updatedContent,
  };
}

/** Calls the reorder API, revalidates the cache, and returns the updated collection. */
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

/** Returns the block with `orderIndex` replaced. */
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
      logger.warn(
        'replayMoves',
        `imageId ${move.imageId} not found in current order — move skipped`
      );
      continue;
    }
    order.splice(fromIndex, 1);
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
  newOrder.splice(fromIndex, 1);
  // targetIndex shifts after the splice; re-locate the target
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
