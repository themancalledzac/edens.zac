/**
 * Image Metadata Utilities
 *
 * Helper functions for building and processing image metadata updates.
 * Used by ImageMetadataModal for both single and bulk editing.
 */

import type { UpdateImageDTO } from '@/app/lib/api/images';
import type { ImageContentBlock } from '@/app/types/ContentBlock';
import type { ContentCameraModel, ContentLensModel } from '@/app/types/ImageMetadata';

// ============================================================================
// Pure Helper Functions
// ============================================================================

/**
 * Helper to find common items across multiple arrays based on an ID key
 * Returns items that appear in ALL arrays (intersection)
 */
function getCommonArrayItems<T>(arrays: T[][], idKey: keyof T): T[] {
  if (arrays.length === 0) return [];
  if (arrays.length === 1) return arrays[0] || [];

  const firstArray = arrays[0];
  if (!firstArray) return [];

  return firstArray.filter(item =>
    arrays.every(arr => arr.some(arrItem => arrItem[idKey] === item[idKey]))
  );
}

/**
 * Extract common values from multiple images for bulk editing
 * Only returns fields where ALL images have identical values
 * For arrays (tags, people), returns intersection (items present in ALL images)
 *
 * @param images - Array of images to compare
 * @returns Partial image object with only common values
 */
export function getCommonValues(images: ImageContentBlock[]): Partial<ImageContentBlock> {
  if (images.length === 0) return {};
  if (images.length === 1) return images[0] || {};

  const first = images[0]!; // Safe: already checked length > 1
  const common: Partial<ImageContentBlock> = {};

  // String fields - check if all match
  if (images.every(img => img.title === first.title)) common.title = first.title;
  if (images.every(img => img.caption === first.caption)) common.caption = first.caption;
  if (images.every(img => img.alt === first.alt)) common.alt = first.alt;
  if (images.every(img => img.author === first.author)) common.author = first.author;
  if (images.every(img => img.location === first.location)) common.location = first.location;

  // Camera settings
  if (images.every(img => img.camera?.id === first.camera?.id)) common.camera = first.camera;
  if (images.every(img => img.lensModel?.id === first.lensModel?.id)) common.lensModel = first.lensModel;
  if (images.every(img => img.lens === first.lens)) common.lens = first.lens;
  if (images.every(img => img.iso === first.iso)) common.iso = first.iso;
  if (images.every(img => img.fstop === first.fstop)) common.fstop = first.fstop;
  if (images.every(img => img.shutterSpeed === first.shutterSpeed)) common.shutterSpeed = first.shutterSpeed;
  if (images.every(img => img.focalLength === first.focalLength)) common.focalLength = first.focalLength;

  // Booleans - only if ALL true
  if (images.every(img => img.blackAndWhite === true)) common.blackAndWhite = true;
  if (images.every(img => img.isFilm === true)) common.isFilm = true;

  // Film settings
  if (images.every(img => img.filmType === first.filmType)) common.filmType = first.filmType;
  if (images.every(img => img.filmFormat === first.filmFormat)) common.filmFormat = first.filmFormat;

  // Rating
  if (images.every(img => img.rating === first.rating)) common.rating = first.rating;

  // Arrays - intersection (tags/people/collections present in ALL images)
  common.tags = getCommonArrayItems(images.map(img => img.tags || []), 'id');
  common.people = getCommonArrayItems(images.map(img => img.people || []), 'id');
  common.collections = getCommonArrayItems(images.map(img => img.collections || []), 'collectionId');

  return common;
}

/**
 * Determines what type of camera update is needed and returns the appropriate updates
 *
 * Logic:
 * - formCamera is null → no update needed (field not touched)
 * - formCamera.id exists → use existing camera (updates.cameraId)
 * - formCamera.cameraName exists → create new camera (updates.cameraName)
 */
export function buildCameraUpdates(
  formCamera: ContentCameraModel | null,
  currentCamera: ContentCameraModel | null | undefined
): Partial<UpdateImageDTO> {
  const updates: Partial<UpdateImageDTO> = {};

  // If formCamera is null, no camera update (field not touched)
  if (!formCamera) {
    return updates;
  }

  // If formCamera has an id (and id > 0), use existing camera
  if (formCamera.id && formCamera.id > 0) {
    // Only update if different from current
    if (formCamera.id !== currentCamera?.id) {
      updates.cameraId = formCamera.id;
    }
    return updates;
  }

  // If formCamera has a cameraName, create new camera
  if (formCamera.cameraName && formCamera.cameraName.trim()) {
    updates.cameraName = formCamera.cameraName.trim();
    return updates;
  }

  // Otherwise, no valid camera data
  return updates;
}

/**
 * Determines what type of lens update is needed and returns the appropriate updates
 *
 * Logic:
 * - formLens is null → no update needed (field not touched)
 * - formLens.id exists → use existing lens (updates.lensId)
 * - formLens.lensName exists → create new lens (updates.lensName)
 */
export function buildLensUpdates(
  formLens: ContentLensModel | null,
  currentLens: ContentLensModel | null | undefined
): Partial<UpdateImageDTO> {
  const updates: Partial<UpdateImageDTO> = {};

  // If formLens is null, no lens update (field not touched)
  if (!formLens) {
    return updates;
  }

  // If formLens has an id (and id > 0), use existing lens
  if (formLens.id && formLens.id > 0) {
    // Only update if different from current
    if (formLens.id !== currentLens?.id) {
      updates.lensId = formLens.id;
    }
    return updates;
  }

  // If formLens has a lensName, create new lens
  if (formLens.lensName && formLens.lensName.trim()) {
    updates.lensName = formLens.lensName.trim();
    return updates;
  }

  // Otherwise, no valid lens data
  return updates;
}


