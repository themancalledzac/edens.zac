/**
 * Pure helpers for {@link FullScreenModal} — image-vs-collection fallback for the metadata overlay's
 * date and location lines. Kept out of the component so the fallback rules are unit-testable in
 * isolation and the JSX stays thin.
 */

import type { CollectionModel, LocationModel } from '@/app/types/Collection';
import type { ContentGifModel, ViewableContent } from '@/app/types/Content';

/**
 * Type guard for GIF content blocks. GIFs lack `captureDate` and may lack `locations`, so the
 * resolvers below fall straight through to the collection for them.
 */
export function isGifBlock(block: ViewableContent): block is ContentGifModel {
  return block.contentType === 'GIF';
}

/**
 * Resolve the locations to display: the image's own locations take priority; fall back to the
 * collection's locations when the image has none (or is a GIF, which doesn't carry locations today).
 *
 * `isGif` mirrors `isGifBlock(currentImage)` at the call site; narrowing uses the type guard so the
 * GIF (location-less) member is excluded before reading `.locations`.
 */
export function resolveDisplayLocations(
  currentImage: ViewableContent,
  collectionData: CollectionModel | undefined,
  isGif: boolean
): LocationModel[] {
  const imageLocations = !isGif && !isGifBlock(currentImage) ? currentImage.locations : undefined;
  return imageLocations?.length ? imageLocations : (collectionData?.locations ?? []);
}

/**
 * Resolve the date to display: the image's `captureDate` takes priority; fall back to the
 * collection's `collectionDate` (GIFs have no `captureDate`, so they fall back immediately).
 *
 * `isGif` mirrors `isGifBlock(currentImage)` at the call site; narrowing uses the type guard so the
 * GIF member (which has no `captureDate`) is excluded before reading it.
 */
export function resolveDisplayDate(
  currentImage: ViewableContent,
  collectionData: CollectionModel | undefined,
  isGif: boolean
): string | null {
  return !isGif && !isGifBlock(currentImage)
    ? (currentImage.captureDate ?? collectionData?.collectionDate ?? null)
    : (collectionData?.collectionDate ?? null);
}
