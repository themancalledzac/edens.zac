/**
 * Type Guards for Content System
 *
 * Provides compile-time type safety for Content discrimination.
 * Use these instead of runtime type checking or casting.
 */
import { CollectionType } from '@/app/types/Collection';
import {
  type Content,
  type ContentBlankModel,
  type ContentCollectionModel,
  type ContentGifModel,
  type ContentImageModel,
  type ContentPanelModel,
  type ContentParallaxImageModel,
  type ContentTextModel,
} from '@/app/types/Content';

/**
 * Type guard to check if a Content is an ImageContentModel
 * Accepts unknown to handle untyped data, but also works with Content type
 */
export function isContentImage(block: Content | unknown): block is ContentImageModel {
  if (!block || typeof block !== 'object') return false;
  const candidate = block as Record<string, unknown>;
  return candidate.contentType === 'IMAGE' && 'imageUrl' in candidate;
}

/**
 * Type guard to check if a Content is a TextContentModel
 */
export function isTextContent(block: Content): block is ContentTextModel {
  return block.contentType === 'TEXT';
}

/**
 * Type guard to check if a Content is a GifContentModel
 */
export function isGifContent(block: Content): block is ContentGifModel {
  return block.contentType === 'GIF';
}

/**
 * Type guard to check if a Content is a CollectionContentModel
 */
export function isContentCollection(block: Content): block is ContentCollectionModel {
  return block.contentType === 'COLLECTION';
}

/**
 * Type guard to check if a Content is a ContentPanelModel
 */
export function isPanelContent(block: Content): block is ContentPanelModel {
  return block.contentType === 'PANEL';
}

/**
 * Type guard to check if a Content is a ContentBlankModel — the synthetic
 * spacer injected into under-filled rows. Always false for backend content.
 */
export function isBlankContent(block: Content): block is ContentBlankModel {
  return block.contentType === 'BLANK';
}

/**
 * Type guard to check if a Content has an image (IMAGE or GIF).
 * PARALLAX is a boolean flag, not a separate contentType.
 */
export function hasImage(
  block: Content
): block is ContentImageModel | ContentParallaxImageModel | ContentGifModel {
  return isContentImage(block) || isGifContent(block);
}

/**
 * Get the content width and height from any Content
 * Falls back to imageWidth/Height for image blocks, or default dimensions
 * Prioritizes imageWidth/imageHeight over width/height for accurate aspect ratios
 */
export function getContentDimensions(
  block: Content,
  defaultWidth = 1300,
  defaultAspect = 3 / 2
): { width: number; height: number } {
  if (isContentImage(block)) {
    if (block.imageWidth && block.imageHeight) {
      return { width: block.imageWidth, height: block.imageHeight };
    }
    if (block.width && block.height) {
      return { width: block.width, height: block.height };
    }
    const width = defaultWidth;
    const height = Math.round(width / defaultAspect);
    return { width, height };
  }

  if (isContentCollection(block)) {
    const collectionBlock = block as ContentCollectionModel;
    if (collectionBlock.coverImage?.imageWidth && collectionBlock.coverImage?.imageHeight) {
      return {
        width: collectionBlock.coverImage.imageWidth,
        height: collectionBlock.coverImage.imageHeight,
      };
    }
    if (collectionBlock.coverImage?.width && collectionBlock.coverImage?.height) {
      return {
        width: collectionBlock.coverImage.width,
        height: collectionBlock.coverImage.height,
      };
    }
    return { width: defaultWidth, height: Math.round(defaultWidth / defaultAspect) };
  }

  if (block.width && block.height) {
    return { width: block.width, height: block.height };
  }

  return { width: defaultWidth, height: Math.round(defaultWidth / defaultAspect) };
}

/**
 * Pick raw display dimensions from an image-like source, preferring the explicit
 * `imageWidth`/`imageHeight` over the generic `width`/`height` (nullish coalescing,
 * so a stored `0` is kept and only `null`/`undefined` falls through). Returns
 * `undefined` for a dimension when neither field is present — callers apply their
 * own placeholder default.
 *
 * Centralizes the `imageWidth ?? width` selection previously duplicated across
 * `extractImageDimensions` (contentRendererUtils), `extractCollectionDimensions`
 * (contentLayout), and the `LocationCollections` card. Distinct from
 * {@link getContentDimensions}, which discriminates a full `Content` block and uses
 * `&&` semantics with a placeholder default.
 */
export function pickImageDimensions(
  source?: { imageWidth?: number; width?: number; imageHeight?: number; height?: number } | null
): { width?: number; height?: number } {
  return {
    width: source?.imageWidth ?? source?.width,
    height: source?.imageHeight ?? source?.height,
  };
}

/**
 * Validation function to ensure a Content has required fields
 */
export function validateContentBlock(block: unknown): block is Content {
  if (!block || typeof block !== 'object') return false;

  const candidate = block as Record<string, unknown>;

  return (
    typeof candidate.id === 'number' &&
    typeof candidate.contentType === 'string' &&
    ['IMAGE', 'TEXT', 'GIF', 'COLLECTION', 'PANEL'].includes(candidate.contentType) &&
    typeof candidate.orderIndex === 'number'
  );
}

/**
 * Get aspect ratio for content item
 */
export function getAspectRatio(item: Content): number {
  if (isPanelContent(item)) {
    const width = item.width ?? 0;
    const height = item.height ?? 0;
    return width <= 0 || height <= 0 ? 1.0 : width / height;
  }

  if (!hasImage(item)) return 1.0;

  const { width, height } = getContentDimensions(item);
  if (width <= 0 || height <= 0) return 1.0;

  return width / height;
}

/**
 * Get slot width for content item based on aspect ratio and rating.
 *
 * Square images (ratio == 1:1) are considered vertical, not horizontal. Vertical
 * content (AR <= 1) gets an effective-rating penalty of -1 before applying the
 * rules below — keeps the same shape semantics whether the source is an IMAGE
 * or an animated GIF/MP4.
 *
 * Slot width rules:
 * - Collection cards (has slug): chunkSize/2 (pair up on catalog pages)
 * - Wide panorama (ratio ≥ 2): chunkSize (standalone)
 * - Tall panorama (ratio ≤ 0.5): 1 (normal)
 * - 5-star horizontal: chunkSize (standalone)
 * - 4-star horizontal: chunkSize (standalone)
 * - 3-star (any orientation): chunkSize/2
 * - Vertical 4-5 star: chunkSize/2 (penalty drops them to 3-4 → halfSlot)
 * - Vertical 1-2 star: 1 (normal)
 * - Horizontal 1-2 star: 1 (normal)
 *
 * GIF/MP4 uses the same rating-driven logic as IMAGE. New uploads default to
 * rating 4 on the backend, so an animated block reads as feature media unless
 * the admin lowers it.
 */
export function getSlotWidth(contentItem: Content, chunkSize: number): number {
  const halfSlot = Math.floor(chunkSize / 2);

  if ('slug' in contentItem && contentItem.slug) {
    return halfSlot;
  }

  if (!hasImage(contentItem)) return 1;

  const { width, height } = getContentDimensions(contentItem);
  const ratio = width / Math.max(1, height);
  const isHorizontal = ratio > 1.0;

  if (ratio >= 2) return chunkSize;

  if (ratio <= 0.5) return 1;

  const ratedItem = getRatedContentItem(contentItem);
  if (ratedItem !== null) {
    const rating = ratedItem.rating ?? 0;

    if (isHorizontal) {
      if (rating >= 4) return chunkSize;
      if (rating === 3) return halfSlot;
      return 1;
    } else {
      return rating >= 3 ? halfSlot : 1;
    }
  }

  return 1;
}

/**
 * Return the content item if it carries a layout rating (IMAGE or GIF), or
 * null otherwise. Centralizes the rating-eligibility check so getSlotWidth
 * treats animated and still media uniformly.
 */
function getRatedContentItem(item: Content): { rating?: number | null } | null {
  if (isContentImage(item)) return item;
  if (isGifContent(item)) return item;
  return null;
}

/**
 * Check if a collection type is a "parent-type" collection.
 * Parent-type collections (HOME, PARENT) can only contain child collections,
 * not images, text, or GIFs.
 */
export function isParentType(type: CollectionType | string | undefined): boolean {
  return type === CollectionType.HOME || type === CollectionType.PARENT;
}
