/**
 * Pure helpers for {@link FullScreenModal} — image-vs-collection fallback for the metadata overlay's
 * date and location lines. Kept out of the component so the fallback rules are unit-testable in
 * isolation and the JSX stays thin.
 */

import type { CollectionModel, LocationModel } from '@/app/types/Collection';
import type { ContentGifModel, ViewableContent } from '@/app/types/Content';
import { formatFilmFormat } from '@/app/utils/filmFormat';

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
 */
export function resolveDisplayLocations(
  currentImage: ViewableContent,
  collectionData: CollectionModel | undefined
): LocationModel[] {
  const imageLocations = isGifBlock(currentImage) ? undefined : currentImage.locations;
  return imageLocations?.length ? imageLocations : (collectionData?.locations ?? []);
}

/**
 * Resolve the date to display: the image's `captureDate` takes priority; fall back to the
 * collection's `collectionDate` (GIFs have no `captureDate`, so they fall back immediately).
 */
export function resolveDisplayDate(
  currentImage: ViewableContent,
  collectionData: CollectionModel | undefined
): string | null {
  return isGifBlock(currentImage)
    ? (collectionData?.collectionDate ?? null)
    : (currentImage.captureDate ?? collectionData?.collectionDate ?? null);
}

/**
 * Compose the film line for the equipment row — `Kodak Portra 400 · 35mm` — from the two fields
 * the backend keeps separate. Returns an empty string unless the image is actually flagged as
 * film, so a digital frame never shows a stray format left over from an earlier edit.
 *
 * `filmType` already arrives as a display name; `filmFormat` is a raw enum and is labelled here.
 */
export function resolveDisplayFilmStock(currentImage: ViewableContent): string {
  if (isGifBlock(currentImage) || !currentImage.isFilm) {
    return '';
  }
  const parts = [currentImage.filmType, formatFilmFormat(currentImage.filmFormat)].filter(Boolean);
  return parts.join(' · ');
}
