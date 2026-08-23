/**
 * Type Guards for Content System
 *
 * Provides compile-time type safety for Content discrimination.
 * Use these instead of runtime type checking or casting.
 */
import { type CollectionModel } from '@/app/types/Collection';
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
 * Whether a collection's loaded content contains child-collection refs. Note the
 * content is the first page only (callers fetch 500 items and may drop excluded
 * refs), so this reads false for a parent whose refs all fall past that bound —
 * use {@link isParentCollection} for the authorization-shaped decisions.
 */
export function hasChildCollectionContent(
  collection: Pick<CollectionModel, 'content'> | null | undefined
): boolean {
  return Array.isArray(collection?.content) && collection.content.some(isContentCollection);
}

/**
 * Check if a collection acts as a "parent": it contains child-collection refs. Parent collections
 * expose the Gallery Access section and offer to propagate their password to child galleries.
 * Cover-image candidates are NOT gated on this: since D3 every collection picks from the union of
 * its own images and its children's.
 *
 * Prefers the server-derived `hasChildren`, which is computed over the whole content graph. The
 * content scan is the fallback for payloads that predate it, and is bounded by the page window
 * (`CollectionPageWrapper` fetches `size=500`), so it under-reports on large collections.
 *
 * There is no longer a legacy PARENT enum arm. Under the typeless model a collection has no
 * declared parent-ness to fall back on — it IS a parent exactly when it holds children — so a
 * childless collection reads false here by design. The one consumer that still needs to reach a
 * childless collection, the Gallery Access section, unions this with the stored `isClient`
 * discriminator rather than widening this guard (blast radius R12).
 */
export function isParentCollection(
  collection: (Pick<CollectionModel, 'content'> & { hasChildren?: boolean }) | null | undefined
): boolean {
  return collection?.hasChildren ?? hasChildCollectionContent(collection);
}
