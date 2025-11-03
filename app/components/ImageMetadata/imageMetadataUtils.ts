/**
 * Image Metadata Utilities
 *
 * Helper functions for building and processing image metadata updates.
 * Used by ImageMetadataModal for both single and bulk editing.
 */

import type { ImageCollection, ImageContentModel, UpdateImageDTO } from '@/app/types/Content';

// ============================================================================
// Pure Helper Functions
// ============================================================================

/**
 * Get form value with fallback logic
 * Simplifies the repetitive pattern: DTO value → initial value → default value
 *
 * @param dtoValue - Value from updateImageDTO (undefined means not touched yet)
 * @param initialValue - Value from initialValues (what we started with)
 * @param defaultValue - Fallback if both are null/undefined
 * @returns The resolved value for form display
 *
 * @example
 * // Instead of: value={updateImageDTO.title !== undefined ? (updateImageDTO.title || '') : (initialValues.title || '')}
 * // Use: value={getFormValue(updateImageDTO.title, initialValues.title, '')}
 */
export function getFormValue<T>(
  dtoValue: T | undefined,
  initialValue: T | undefined | null,
  defaultValue: T
): T {
  return dtoValue !== undefined ? (dtoValue ?? defaultValue) : (initialValue ?? defaultValue);
}

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
export function getCommonValues(images: ImageContentModel[]): Partial<ImageContentModel> {
  if (images.length === 0) return {};
  if (images.length === 1) return images[0] || {};

  const first = images[0]!; // Safe: already checked length > 1
  const common: Partial<ImageContentModel> = {};

  // String fields - check if all match
  if (images.every(img => img.title === first.title)) common.title = first.title;
  if (images.every(img => img.caption === first.caption)) common.caption = first.caption;
  if (images.every(img => img.alt === first.alt)) common.alt = first.alt;
  if (images.every(img => img.author === first.author)) common.author = first.author;
  if (images.every(img => img.location === first.location)) common.location = first.location;

  // Camera settings
  if (images.every(img => img.camera?.id === first.camera?.id)) common.camera = first.camera;
  if (images.every(img => img.lens?.id === first.lens?.id)) common.lens = first.lens;
  if (images.every(img => img.iso === first.iso)) common.iso = first.iso;
  if (images.every(img => img.fStop === first.fStop)) common.fStop = first.fStop; // Fixed: fstop → fStop
  if (images.every(img => img.shutterSpeed === first.shutterSpeed))
    common.shutterSpeed = first.shutterSpeed;
  if (images.every(img => img.focalLength === first.focalLength))
    common.focalLength = first.focalLength;

  // Booleans - only if ALL true
  if (images.every(img => img.blackAndWhite === true)) common.blackAndWhite = true;
  if (images.every(img => img.isFilm === true)) common.isFilm = true;

  // Film settings
  if (images.every(img => img.filmType === first.filmType)) common.filmType = first.filmType;
  if (images.every(img => img.filmFormat === first.filmFormat))
    common.filmFormat = first.filmFormat;

  // Rating
  if (images.every(img => img.rating === first.rating)) common.rating = first.rating;

  // Arrays - intersection (tags/people/collections present in ALL images)
  common.tags = getCommonArrayItems(
    images.map(img => img.tags || []),
    'id'
  );
  common.people = getCommonArrayItems(
    images.map(img => img.people || []),
    'id'
  );
  common.collections = getCommonArrayItems(
    images.map(img => img.collections || []),
    'collectionId'
  );

  return common;
}

// ============================================================================
// Display Helper Functions
// These convert DTO + initialValues into display objects for selectors
// ============================================================================

/**
 * Get display items for multi-select using prev/newValue pattern
 * Combines existing item IDs (prev) with new item names (newValue)
 *
 * @param update - The update object containing prev/newValue
 * @param initialItems - Initial items from the image
 * @param availableItems - All available items to select from
 * @returns Combined array of existing and new items
 */
export function getDisplayItemsFromUpdate<T extends { id: number; name: string }>(
  update: { prev?: number[]; newValue?: string[] } | undefined,
  initialItems: T[] | undefined,
  availableItems: T[]
): T[] {
  // Get existing IDs from update.prev or fallback to initial items
  const existingIds = update?.prev !== undefined ? update.prev : initialItems?.map(item => item.id);

  // Filter available items by IDs
  const existing = existingIds ? availableItems.filter(item => existingIds.includes(item.id)) : [];

  // Create pseudo-objects for new items (id: 0 indicates new)
  const newItems = (update?.newValue || []).map(
    name =>
      ({
        id: 0,
        name,
      }) as T
  );

  return [...existing, ...newItems];
}

/**
 * Get display tags from DTO or initialValues using prev/newValue pattern
 */
export function getDisplayTags<T extends { id: number; name: string }>(
  updateDTO: UpdateImageDTO,
  initialTags: T[] | undefined,
  availableTags: T[]
): T[] {
  return getDisplayItemsFromUpdate(updateDTO.tags, initialTags, availableTags);
}

/**
 * Get display people from DTO or initialValues using prev/newValue pattern
 */
export function getDisplayPeople<T extends { id: number; name: string }>(
  updateDTO: UpdateImageDTO,
  initialPeople: T[] | undefined,
  availablePeople: T[]
): T[] {
  return getDisplayItemsFromUpdate(updateDTO.people, initialPeople, availablePeople);
}

/**
 * Get display collections from DTO or initialValues using prev pattern
 */
export function getDisplayCollections(
  updateDTO: UpdateImageDTO,
  initialCollections: ImageCollection[] | undefined
): Array<{ id: number; name: string }> {
  const collections =
    updateDTO.collections?.prev !== undefined ? updateDTO.collections.prev : initialCollections;
  return collections
    ? collections.map(c => ({
        id: c.collectionId,
        name: c.name,
      }))
    : [];
}

/**
 * Get display item for single-select using prev/newValue/remove pattern
 *
 * @param update - The update object containing prev/newValue/remove
 * @param initialItem - Initial item from the image
 * @param availableItems - All available items to select from
 * @returns Single item or null
 */
export function getDisplayItemFromUpdate<T extends { id?: number; name: string }>(
  update: { prev?: number; newValue?: string; remove?: boolean } | undefined,
  initialItem: T | null | undefined,
  availableItems: T[]
): T | null {
  // If remove is true, return null
  if (update?.remove) {
    return null;
  }

  // Check if newValue is defined (new item) - CHECK THIS FIRST
  if (update?.newValue !== undefined && update.newValue !== null && update.newValue !== '') {
    return { id: 0, name: update.newValue } as T;
  }

  // Check if prev is defined (existing item)
  if (update?.prev !== undefined) {
    if (update.prev === null) return null;
    return availableItems.find(item => item.id === update.prev) || null;
  }

  // Fallback to initial item
  return initialItem || null;
}

/**
 * Get display camera from DTO or initialValues using prev/newValue/remove pattern
 */
export function getDisplayCamera<T extends { id?: number; name: string }>(
  updateDTO: UpdateImageDTO,
  initialCamera: T | null | undefined,
  availableCameras: T[]
): T | null {
  return getDisplayItemFromUpdate(updateDTO.camera, initialCamera, availableCameras);
}

/**
 * Get display lens from DTO or initialValues using prev/newValue/remove pattern
 */
export function getDisplayLens<T extends { id?: number; name: string }>(
  updateDTO: UpdateImageDTO,
  initialLens: T | null | undefined,
  availableLenses: T[]
): T | null {
  return getDisplayItemFromUpdate(updateDTO.lens, initialLens, availableLenses);
}

/**
 * Get display film stock from DTO or initialValues using prev/newValue/remove pattern
 */
export function getDisplayFilmStock<T extends { id: number; name: string; defaultIso: number }>(
  updateDTO: UpdateImageDTO,
  initialFilmType: string | null | undefined,
  availableFilmTypes: T[]
): T | null {
  const update = updateDTO.filmType;

  // If remove is true, return null
  if (update?.remove) {
    return null;
  }

  // Check if newValue is defined (new film type)
  if (update?.newValue !== undefined && update.newValue !== null) {
    return {
      id: 0,
      name: update.newValue.name,
      defaultIso: update.newValue.defaultIso,
    } as T;
  }

  // Check if prev is defined (existing film type by ID)
  if (update?.prev !== undefined) {
    if (update.prev === null) return null;
    return availableFilmTypes.find(f => f.id === update.prev) || null;
  }

  // Fallback to initial film type (by name)
  if (initialFilmType) {
    return availableFilmTypes.find(f => f.name === initialFilmType) || null;
  }

  return null;
}

// ============================================================================
// Generic Dropdown Change Handler
// ============================================================================

/**
 * Transforms multi-select dropdown values into prevIds and newNames
 * Used for tags, people, and other multi-select fields with id/name pattern
 *
 * @param value - Array of items from selector (can have id: 0 for new items)
 * @returns Object with prevIds array and newNames array (or null if empty)
 *
 * @example
 * onChange={(value) => {
 *   const { prevIds, newNames } = extractMultiSelectValues(value);
 *   handleDropdownChange({ field: 'tags', prevVal: prevIds, newVal: newNames }, updateDTO);
 * }}
 */
export function extractMultiSelectValues<T extends { id?: number; name: string }>(
  value: T[] | null | undefined
): { prevIds: number[] | null; newNames: string[] | null } {
  const items = (value as T[] | null) ?? [];
  const prevIds = items.filter(item => item.id && item.id > 0).map(item => item.id!);
  const newNames = items.filter(item => !item.id || item.id === 0).map(item => item.name);

  return {
    prevIds: prevIds.length > 0 ? prevIds : null,
    newNames: newNames.length > 0 ? newNames : null,
  };
}

/**
 * Parameters for handleDropdownChange
 */
export interface DropdownChangeParams {
  /** Field name in UpdateImageDTO (e.g., 'tags', 'camera', 'lens', 'people') */
  field: keyof UpdateImageDTO;
  /**
   * Raw value from the selector (can be single item, array, or null)
   * For multi-select with id/name pattern, extraction happens automatically
   */
  value: unknown;
}

/**
 * Generic handler for all dropdown changes
 * Automatically extracts prevIds/newNames for multi-select fields with id/name pattern
 *
 * @param params - Dropdown change parameters with raw value
 * @param updateDTO - Function to update the DTO state
 *
 * @example
 * // Multi-select (tags, people) - automatic extraction
 * onChange={(value) => handleDropdownChange({ field: 'tags', value }, updateDTO)}
 *
 * @example
 * // Single-select with custom logic (camera, lens, collections)
 * onChange={(value) => {
 *   const camera = Array.isArray(value) ? value[0] || null : value;
 *   if (!camera) {
 *     handleDropdownChange({ field: 'camera', value: { remove: true } }, updateDTO);
 *   } else if (camera.id && camera.id > 0) {
 *     handleDropdownChange({ field: 'camera', value: { prev: camera.id } }, updateDTO);
 *   } else {
 *     handleDropdownChange({ field: 'camera', value: { newValue: camera.name } }, updateDTO);
 *   }
 * }}
 */
export function handleDropdownChange(
  params: DropdownChangeParams,
  updateDTO: (updates: Partial<UpdateImageDTO>) => void
): void {
  const { field, value } = params;

  // Check if this is a multi-select field with id/name pattern (tags, people)
  const isMultiSelectWithIdName = field === 'tags' || field === 'people';

  let update: Record<string, unknown> = {};

  if (isMultiSelectWithIdName && (Array.isArray(value) || value === null || value === undefined)) {
    // Auto-extract prevIds and newNames for multi-select fields
    const { prevIds, newNames } = extractMultiSelectValues(
      value as Array<{ id?: number; name: string }> | null | undefined
    );

    if (prevIds !== null) {
      update.prev = prevIds;
    }
    if (newNames !== null) {
      update.newValue = newNames;
    }
  } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    // Value is already a formatted update object (for custom handling like camera, lens, collections)
    update = value as Record<string, unknown>;
  }

  // Only update if we have at least one field defined
  if (Object.keys(update).length > 0) {
    updateDTO({ [field]: update });
  }
}
