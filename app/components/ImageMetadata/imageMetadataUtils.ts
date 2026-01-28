/**
 * Image Metadata Utilities
 *
 * Helper functions for building and processing image metadata updates.
 * Used by ImageMetadataModal for both single and bulk editing.
 */

import type {
  ContentImageModel,
  ContentImageUpdateRequest,
  ContentImageUpdateResponse,
} from '@/app/types/Content';
import { buildLocationDiff as buildLocationDiffUtil } from '@/app/utils/locationUtils';

// ============================================================================
// Generic Update Utilities
// ============================================================================

/**
 * Apply partial updates from a DTO to an existing object
 * Only updates fields that are explicitly present in the DTO (not undefined)
 * Useful for optimistic updates and applying API responses
 *
 * Handles special cases:
 * - `collections.prev` from DTO is transformed to `collections` in the model
 * - All other fields are applied directly
 *
 * @param original - The original object to update
 * @param updates - The DTO containing only the fields to update
 * @returns A new object with updates applied
 *
 * @example
 * const original = { id: 1, title: 'Old', visible: true };
 * const updates = { id: 1, title: 'New' };
 * const result = applyPartialUpdate(original, updates);
 * // result = { id: 1, title: 'New', visible: true }
 */
export function applyPartialUpdate<T extends { id: number }>(
  original: T,
  updates: Partial<T> & { id: number } & { collections?: { prev?: unknown[] } }
): T {
  const result = { ...original };

  // Apply all fields from updates that are not undefined
  // Skip 'id' as it's used for matching, not updating
  for (const [key, value] of Object.entries(updates)) {
    if (key === 'id') continue;
    if (value === undefined) continue;

    // Special handling for collections.prev -> collections transformation
    if (key === 'collections' && value && typeof value === 'object' && 'prev' in value) {
      const collectionsValue = value as { prev?: unknown[] };
      if (collectionsValue.prev !== undefined) {
        // Replace the entire collections array with the updated one
        (result as Record<string, unknown>).collections = collectionsValue.prev;
      }
    } else {
      (result as Record<string, unknown>)[key] = value;
    }
  }

  return result;
}

// ============================================================================
// Pure Helper Functions
// ============================================================================

/**
 * Get form value with fallback logic
 * Simplifies the repetitive pattern: DTO value → initial value → default value
 *
 * @param dtoValue - Value from updateImage (undefined means not touched yet)
 * @param initialValue - Value from initialValues (what we started with)
 * @param defaultValue - Fallback if both are null/undefined
 * @returns The resolved value for form display
 *
 * @example
 * // Instead of: value={updateImage.title !== undefined ? (updateImage.title || '') : (initialValues.title || '')}
 * // Use: value={getFormValue(updateImage.title, initialValues.title, '')}
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
 * Check if all items in an array have the same value for a given field
 *
 * @param items - Array of items to compare
 * @param getValue - Function to extract the value to compare from each item
 * @returns True if all items have the same value, false otherwise
 *
 * @example
 * areAllEqual(images, img => img.title) // Check if all images have same title
 * areAllEqual(images, img => img.camera?.id) // Check if all images have same camera ID
 */
function areAllEqual<T>(items: T[], getValue: (item: T) => unknown): boolean {
  if (items.length <= 1) return true;

  const firstValue = getValue(items[0]!);
  return items.every(item => getValue(item) === firstValue);
}

/**
 * Extract common values from multiple images for bulk editing
 * Only returns fields where ALL images have identical values
 * For arrays (tags, people), returns intersection (items present in ALL images)
 *
 * @param images - Array of images to compare
 * @returns Partial image object with only common values
 */
export function getCommonValues(images: ContentImageModel[]): Partial<ContentImageModel> {
  if (images.length === 0) return {};
  if (images.length === 1) return images[0] || {};

  const first = images[0]!; // Safe: already checked length > 1
  const common: Partial<ContentImageModel> = {};

  // String fields - check if all match
  if (areAllEqual(images, img => img.title)) common.title = first.title;
  if (areAllEqual(images, img => img.caption)) common.caption = first.caption;
  if (areAllEqual(images, img => img.alt)) common.alt = first.alt;
  if (areAllEqual(images, img => img.author)) common.author = first.author;
  
  // Location: compare by id if valid, otherwise by name
  if (
    areAllEqual(images, img => {
      const loc = img.location;
      if (!loc) return null;
      // Use id for comparison if it's a valid id (> 0), otherwise use name
      return loc.id > 0 ? loc.id : loc.name;
    })
  ) {
    common.location = first.location;
  }

  // Camera settings
  if (areAllEqual(images, img => img.camera?.id)) common.camera = first.camera;
  if (areAllEqual(images, img => img.lens?.id)) common.lens = first.lens;
  if (areAllEqual(images, img => img.iso)) common.iso = first.iso;
  if (areAllEqual(images, img => img.fstop)) common.fstop = first.fstop;
  if (areAllEqual(images, img => img.shutterSpeed)) common.shutterSpeed = first.shutterSpeed;
  if (areAllEqual(images, img => img.focalLength)) common.focalLength = first.focalLength;

  // Booleans - only if ALL true
  if (areAllEqual(images, img => img.blackAndWhite) && first.blackAndWhite === true) {
    common.blackAndWhite = true;
  }
  if (areAllEqual(images, img => img.isFilm) && first.isFilm === true) {
    common.isFilm = true;
  }

  // Film settings
  if (areAllEqual(images, img => img.filmType)) common.filmType = first.filmType;
  if (areAllEqual(images, img => img.filmFormat)) common.filmFormat = first.filmFormat;

  // Rating
  if (areAllEqual(images, img => img.rating)) common.rating = first.rating;

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
  updateDTO: ContentImageUpdateRequest,
  initialTags: T[] | undefined,
  availableTags: T[]
): T[] {
  return getDisplayItemsFromUpdate(updateDTO.tags, initialTags, availableTags);
}

/**
 * Get display people from DTO or initialValues using prev/newValue pattern
 */
export function getDisplayPeople<T extends { id: number; name: string }>(
  updateDTO: ContentImageUpdateRequest,
  initialPeople: T[] | undefined,
  availablePeople: T[]
): T[] {
  return getDisplayItemsFromUpdate(updateDTO.people, initialPeople, availablePeople);
}

/**
 * Get display collections from DTO or initialValues using prev pattern
 */
export function getDisplayCollections(
  updateDTO: ContentImageUpdateRequest,
  initialCollections: Array<{ collectionId: number; name?: string }> | undefined
): Array<{ id: number; name: string }> {
  const collections =
    updateDTO.collections?.prev !== undefined ? updateDTO.collections.prev : initialCollections;
  return collections
    ? collections.map((c: { collectionId: number; name?: string }) => ({
        id: c.collectionId,
        name: c.name || '',
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
  updateDTO: ContentImageUpdateRequest,
  initialCamera: T | null | undefined,
  availableCameras: T[]
): T | null {
  return getDisplayItemFromUpdate(updateDTO.camera, initialCamera, availableCameras);
}

/**
 * Get display lens from DTO or initialValues using prev/newValue/remove pattern
 */
export function getDisplayLens<T extends { id?: number; name: string }>(
  updateDTO: ContentImageUpdateRequest,
  initialLens: T | null | undefined,
  availableLenses: T[]
): T | null {
  return getDisplayItemFromUpdate(updateDTO.lens, initialLens, availableLenses);
}

/**
 * Get display film stock from DTO or initialValues using prev/newValue/remove pattern
 */
export function getDisplayFilmStock<T extends { id: number; name: string; defaultIso: number }>(
  updateDTO: ContentImageUpdateRequest,
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
      name: update.newValue.filmTypeName,
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
// Diff Utilities - Build minimal update payload from updateState vs currentState
// ============================================================================

/**
 * Build diff for simple fields (string, number, boolean)
 * Only includes field if value has changed AND was explicitly provided in updateState
 */
function buildSimpleFieldDiff(
  field: keyof ContentImageModel,
  updateValue: unknown,
  currentValue: unknown,
  diff: ContentImageUpdateRequest,
  fieldExistsInUpdateState: boolean
): void {
  // Only process if the field was explicitly provided in updateState
  if (!fieldExistsInUpdateState) {
    return;
  }

  // Compare values directly (null !== undefined, so they're considered different)
  // But normalize undefined to null in the output
  if (updateValue !== currentValue) {
    (diff as unknown as Record<string, unknown>)[field] =
      updateValue === undefined ? null : (updateValue ?? null);
  }
}

/**
 * Build diff for camera field using prev/newValue/remove pattern
 */
function buildCameraDiff(
  updateCamera: ContentImageModel['camera'],
  currentCamera: ContentImageModel['camera'],
  diff: ContentImageUpdateRequest
): void {
  if (updateCamera?.id !== currentCamera?.id) {
    if (!updateCamera) {
      diff.camera = { remove: true };
    } else if (updateCamera.id && updateCamera.id > 0) {
      diff.camera = { prev: updateCamera.id };
    } else {
      diff.camera = { newValue: updateCamera.name };
    }
  }
}

/**
 * Build diff for lens field using prev/newValue/remove pattern
 */
function buildLensDiff(
  updateLens: ContentImageModel['lens'],
  currentLens: ContentImageModel['lens'],
  diff: ContentImageUpdateRequest
): void {
  if (updateLens?.id !== currentLens?.id) {
    if (!updateLens) {
      diff.lens = { remove: true };
    } else if (updateLens.id && updateLens.id > 0) {
      diff.lens = { prev: updateLens.id };
    } else {
      diff.lens = { newValue: updateLens.name };
    }
  }
}

/**
 * Build diff for location field using prev/newValue/remove pattern
 * Handles conversion from LocationModel (UI) to LocationUpdate (API)
 * Uses shared location utility function
 *
 * @param updateLocation - LocationModel from updateState (or null)
 * @param currentLocation - Location object from currentState (or null)
 * @param diff - The diff object to update
 */
function buildLocationDiff(
  updateLocation: { id: number; name: string } | null | undefined,
  currentLocation: { id: number; name: string } | null | undefined,
  diff: ContentImageUpdateRequest
): void {
  const locationUpdate = buildLocationDiffUtil(updateLocation || null, currentLocation || null);

  if (locationUpdate !== undefined) {
    diff.location = locationUpdate;
  }
}

/**
 * Build diff for filmType field using prev/newValue/remove pattern
 *
 * @param updateFilmType - Film type name from updateState (string or null)
 * @param currentFilmType - Film type name from currentState (string or null)
 * @param updateIso - ISO value from updateState (used for new film types)
 * @param availableFilmTypes - Optional list of available film types to determine if filmType is existing or new
 * @param diff - The diff object to update
 */
function buildFilmTypeDiff(
  updateFilmType: string | null | undefined,
  currentFilmType: string | null | undefined,
  updateIso: number | undefined,
  availableFilmTypes: Array<{ id: number; name: string; filmTypeName?: string }> | undefined,
  diff: ContentImageUpdateRequest
): void {
  if (updateFilmType !== currentFilmType) {
    if (!updateFilmType) {
      diff.filmType = { remove: true };
    } else if (availableFilmTypes) {
      // Check if this film type exists in available types
      const existingFilmType = availableFilmTypes.find(
        f => f.name === updateFilmType || f.filmTypeName === updateFilmType
      );

      // Existing film type - use prev pattern, otherwise use newValue pattern for new film type
      diff.filmType = existingFilmType
        ? { prev: existingFilmType.id }
        : {
            newValue: {
              filmTypeName: updateFilmType,
              defaultIso: updateIso ?? 400,
            },
          };
    } else {
      // No availableFilmTypes provided - assume it's a new film type
      // This is a fallback for when availableFilmTypes is not available
      diff.filmType = {
        newValue: {
          filmTypeName: updateFilmType,
          defaultIso: updateIso ?? 400,
        },
      };
    }
  }
}

/**
 * Build diff for tags field using prev/newValue/remove pattern
 */
function buildTagsDiff(
  updateTags: ContentImageModel['tags'],
  currentTags: ContentImageModel['tags'],
  diff: ContentImageUpdateRequest
): void {
  const updateTagsArray = updateTags || [];
  const currentTagsArray = currentTags || [];
  const updateTagIds = updateTagsArray.filter(t => t.id && t.id > 0).map(t => t.id!);
  const currentTagIds = currentTagsArray.filter(t => t.id && t.id > 0).map(t => t.id!);
  const updateTagNames = updateTagsArray.filter(t => !t.id || t.id === 0).map(t => t.name);

  const addedTagIds = updateTagIds.filter(id => !currentTagIds.includes(id));
  const removedTagIds = currentTagIds.filter(id => !updateTagIds.includes(id));
  const hasNewTagNames = updateTagNames.length > 0;

  if (addedTagIds.length > 0 || removedTagIds.length > 0 || hasNewTagNames) {
    diff.tags = {};
    if (updateTagIds.length > 0) {
      diff.tags.prev = updateTagIds;
    }
    if (updateTagNames.length > 0) {
      diff.tags.newValue = updateTagNames;
    }
    if (removedTagIds.length > 0) {
      diff.tags.remove = removedTagIds;
    }
  }
}

/**
 * Build diff for people field using prev/newValue/remove pattern
 */
function buildPeopleDiff(
  updatePeople: ContentImageModel['people'],
  currentPeople: ContentImageModel['people'],
  diff: ContentImageUpdateRequest
): void {
  const updatePeopleArray = updatePeople || [];
  const currentPeopleArray = currentPeople || [];
  const updatePeopleIds = updatePeopleArray.filter(p => p.id && p.id > 0).map(p => p.id!);
  const currentPeopleIds = currentPeopleArray.filter(p => p.id && p.id > 0).map(p => p.id!);
  const updatePeopleNames = updatePeopleArray.filter(p => !p.id || p.id === 0).map(p => p.name);

  const addedPeopleIds = updatePeopleIds.filter(id => !currentPeopleIds.includes(id));
  const removedPeopleIds = currentPeopleIds.filter(id => !updatePeopleIds.includes(id));
  const hasNewPeopleNames = updatePeopleNames.length > 0;

  if (addedPeopleIds.length > 0 || removedPeopleIds.length > 0 || hasNewPeopleNames) {
    diff.people = {};
    if (updatePeopleIds.length > 0) {
      diff.people.prev = updatePeopleIds;
    }
    if (updatePeopleNames.length > 0) {
      diff.people.newValue = updatePeopleNames;
    }
    if (removedPeopleIds.length > 0) {
      diff.people.remove = removedPeopleIds;
    }
  }
}

/**
 * Build diff for collections field using prev/newValue/remove pattern
 */
function buildCollectionsDiff(
  updateCollections: ContentImageModel['collections'],
  currentCollections: ContentImageModel['collections'],
  diff: ContentImageUpdateRequest
): void {
  const updateCollectionsArray = updateCollections || [];
  const currentCollectionsArray = currentCollections || [];

  // Build maps for easier lookup
  const currentCollectionsMap = new Map(currentCollectionsArray.map(c => [c.collectionId, c]));
  const updateCollectionsMap = new Map(updateCollectionsArray.map(c => [c.collectionId, c]));

  // Find collections that are new (in update but not in current)
  const newCollections = updateCollectionsArray.filter(
    uc => !currentCollectionsMap.has(uc.collectionId)
  );

  // Find collections that are removed (in current but not in update)
  const removedCollectionIds = currentCollectionsArray
    .filter(cc => !updateCollectionsMap.has(cc.collectionId))
    .map(cc => cc.collectionId);

  // Find collections that are modified (same collectionId but different visible)
  // NOTE: We intentionally exclude orderIndex from this check - orderIndex should only
  // be updated via explicit reordering operations, not when adding collections or changing visibility
  const modifiedCollections = updateCollectionsArray.filter(uc => {
    const current = currentCollectionsMap.get(uc.collectionId);
    if (!current) return false; // Already handled as new
    // Only check visibility changes, NOT orderIndex changes
    return uc.visible !== current.visible;
  });

  // Only include collections update if there are actual changes
  if (
    newCollections.length > 0 ||
    removedCollectionIds.length > 0 ||
    modifiedCollections.length > 0
  ) {
    diff.collections = {};
    if (modifiedCollections.length > 0) {
      // Exclude orderIndex from modified collections - only send visibility changes
      diff.collections.prev = modifiedCollections.map(uc => ({
        collectionId: uc.collectionId,
        name: uc.name,
        visible: uc.visible,
        // Explicitly exclude orderIndex
      }));
    }
    if (newCollections.length > 0) {
      // Exclude orderIndex from new collections - only send collectionId, name, and visible
      diff.collections.newValue = newCollections.map(uc => ({
        collectionId: uc.collectionId,
        name: uc.name,
        visible: uc.visible,
        // Explicitly exclude orderIndex
      }));
    }
    if (removedCollectionIds.length > 0) {
      diff.collections.remove = removedCollectionIds;
    }
  }
}

/**
 * Build a diff between updateState (what user edited) and currentState (original)
 * Returns a ContentImageUpdateRequest with only changed fields
 *
 * @param updateState - The updated state from the form (location may be LocationModel instead of string)
 * @param currentState - The original state before edits
 * @param availableFilmTypes - Optional list of available film types to determine if filmType is existing or new
 */
export function buildImageUpdateDiff(
  updateState: Partial<ContentImageModel> & {
    id: number;
    location?: { id: number; name: string } | null;
  },
  currentState: ContentImageModel,
  availableFilmTypes?: Array<{ id: number; name: string; filmTypeName?: string }>
): ContentImageUpdateRequest {
  const diff: ContentImageUpdateRequest = { id: updateState.id };

  // Simple field comparisons
  const simpleFields: Array<keyof ContentImageModel> = [
    'title',
    'caption',
    'alt',
    'author',
    'rating',
    'blackAndWhite',
    'isFilm',
    'shutterSpeed',
    'focalLength',
    'fstop',
    'iso',
    'filmFormat',
    'createDate',
  ];

  for (const field of simpleFields) {
    buildSimpleFieldDiff(
      field,
      updateState[field],
      currentState[field],
      diff,
      field in updateState
    );
  }

  // Handle complex fields using specialized builders
  buildCameraDiff(updateState.camera, currentState.camera, diff);
  buildLensDiff(updateState.lens, currentState.lens, diff);

  buildLocationDiff(updateState.location, currentState.location, diff);

  buildFilmTypeDiff(
    updateState.filmType,
    currentState.filmType,
    updateState.iso,
    availableFilmTypes,
    diff
  );
  buildTagsDiff(updateState.tags, currentState.tags, diff);
  buildPeopleDiff(updateState.people, currentState.people, diff);
  buildCollectionsDiff(updateState.collections, currentState.collections, diff);

  return diff;
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
  field: keyof ContentImageUpdateRequest;
  /**
   * Raw value from the selector (can be single item, array, or null)
   * For multi-select with id/name pattern, extraction happens automatically
   */
  value: unknown;
}

/**
 * Handle multi-select dropdown changes (tags, people)
 * Extracts prevIds and newNames from array of items with id/name pattern
 *
 * @param field - Field name ('tags' or 'people')
 * @param value - Array of items from selector (can have id: 0 for new items)
 * @param updateDTO - Function to update the DTO state
 */
function handleMultiSelectChange(
  field: 'tags' | 'people',
  value: Array<{ id?: number; name: string }> | null | undefined,
  updateDTO: (updates: Partial<ContentImageUpdateRequest>) => void
): void {
  const { prevIds, newNames } = extractMultiSelectValues(value);

  const update: Record<string, unknown> = {};
  if (prevIds !== null) {
    update.prev = prevIds;
  }
  if (newNames !== null) {
    update.newValue = newNames;
  }

  // Only update if we have at least one field defined
  if (Object.keys(update).length > 0) {
    updateDTO({ [field]: update });
  }
}

/**
 * Handle single-select dropdown changes (camera, lens, collections)
 * Value is already a formatted update object with prev/newValue/remove pattern
 *
 * @param field - Field name ('camera', 'lens', or 'collections')
 * @param value - Formatted update object (e.g., { prev: 1 }, { newValue: 'name' }, { remove: true })
 * @param updateDTO - Function to update the DTO state
 */
function handleSingleSelectChange(
  field: 'camera' | 'lens' | 'collections',
  value: Record<string, unknown>,
  updateDTO: (updates: Partial<ContentImageUpdateRequest>) => void
): void {
  // Value is already a formatted update object
  updateDTO({ [field]: value });
}

/**
 * Generic handler for all dropdown changes
 * Determines field type and delegates to appropriate handler
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
  updateDTO: (updates: Partial<ContentImageUpdateRequest>) => void
): void {
  const { field, value } = params;

  // Determine field type and delegate to appropriate handler
  if (
    (field === 'tags' || field === 'people') &&
    (Array.isArray(value) || value === null || value === undefined)
  ) {
    // Multi-select fields with id/name pattern
    handleMultiSelectChange(
      field,
      value as Array<{ id?: number; name: string }> | null | undefined,
      updateDTO
    );
  } else if (
    (field === 'camera' || field === 'lens' || field === 'collections') &&
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  ) {
    // Single-select fields with prev/newValue/remove pattern
    handleSingleSelectChange(field, value as Record<string, unknown>, updateDTO);
  }
}

// ============================================================================
// Image Update Builders for Modal
// ============================================================================

/**
 * Build image updates for bulk edit mode
 * Creates a diff for each selected image by comparing updateState (common values) against each image's current state
 *
 * @param updateState - Common update state containing shared values to apply to all images
 * @param selectedImages - Array of all selected images to update
 * @param selectedImageIds - Array of image IDs to update (must match selectedImages)
 * @param availableFilmTypes - Optional list of available film types for filmType validation
 * @returns Array of ContentImageUpdateRequest objects, one for each image
 * @throws Error if an image ID is not found in selectedImages
 */
export function buildImageUpdatesForBulkEdit(
  updateState: Partial<ContentImageModel> & {
    id: number;
    location?: { id: number; name: string } | null;
  },
  selectedImages: ContentImageModel[],
  selectedImageIds: number[],
  availableFilmTypes?: Array<{ id: number; name: string; filmTypeName?: string }>
): ContentImageUpdateRequest[] {
  // Get original common values to identify which people/tags were originally common
  const originalCommon = getCommonValues(selectedImages);
  const originalCommonPeopleIds = new Set(
    (originalCommon.people || [])
      .map(p => p.id)
      .filter((id): id is number => id !== undefined && id > 0)
  );
  const originalCommonTagIds = new Set(
    (originalCommon.tags || [])
      .map(t => t.id)
      .filter((id): id is number => id !== undefined && id > 0)
  );

  return selectedImageIds.map(imageId => {
    // Find the current image state
    const currentImage = selectedImages.find(img => img.id === imageId);
    if (!currentImage) {
      throw new Error(`Image ${imageId} not found in selectedImages`);
    }

    // For bulk edit, merge updateState.people and updateState.tags with image-specific items
    // This preserves image-specific items while allowing additions/removals of common items
    const mergedUpdateState = { ...updateState, id: imageId };

    if (updateState.people !== undefined) {
      // Get image-specific people (people in current image but not in original common set)
      const imageSpecificPeople = (currentImage.people || []).filter(
        p => p.id && p.id > 0 && !originalCommonPeopleIds.has(p.id)
      );

      // Merge: updateState people (common + new) + image-specific people
      mergedUpdateState.people = [...updateState.people, ...imageSpecificPeople];
    }

    if (updateState.tags !== undefined) {
      // Get image-specific tags (tags in current image but not in original common set)
      const imageSpecificTags = (currentImage.tags || []).filter(
        t => t.id && t.id > 0 && !originalCommonTagIds.has(t.id)
      );

      // Merge: updateState tags (common + new) + image-specific tags
      mergedUpdateState.tags = [...updateState.tags, ...imageSpecificTags];
    }

    // Build diff: merged updateState against currentImage (individual state)
    return buildImageUpdateDiff(mergedUpdateState, currentImage, availableFilmTypes);
  });
}

/**
 * Build image update for single edit mode
 * Creates a diff by comparing updateState against the original image
 *
 * @param updateState - Update state containing edited values
 * @param originalImage - Original image state before edits
 * @param availableFilmTypes - Optional list of available film types for filmType validation
 * @returns ContentImageUpdateRequest object for the single image
 */
export function buildImageUpdateForSingleEdit(
  updateState: ContentImageModel & { location?: { id: number; name: string } | null },
  originalImage: ContentImageModel,
  availableFilmTypes?: Array<{ id: number; name: string; filmTypeName?: string }>
): ContentImageUpdateRequest {
  return buildImageUpdateDiff(updateState, originalImage, availableFilmTypes);
}

/**
 * Map backend update response to frontend ContentImageUpdateResponse format
 * Converts backend field names (tagName, personName, etc.) to frontend format (name)
 *
 * @param response - Backend response from updateImages API
 * @returns ContentImageUpdateResponse with properly formatted metadata
 */
export function mapUpdateResponseToFrontend(response: {
  updatedImages: ContentImageModel[];
  newMetadata?: {
    tags?: Array<{ id: number; tagName: string }>;
    people?: Array<{ id: number; personName: string }>;
    cameras?: Array<{ id: number; cameraName: string }>;
    lenses?: Array<{ id: number; lensName: string }>;
    filmTypes?: Array<{ id: number; filmTypeName: string; defaultIso: number }>;
  };
}): ContentImageUpdateResponse {
  return {
    updatedImages: response.updatedImages,
    newMetadata: response.newMetadata
      ? {
          tags: response.newMetadata.tags?.map(t => ({ id: t.id, name: t.tagName })),
          people: response.newMetadata.people?.map(p => ({ id: p.id, name: p.personName })),
          cameras: response.newMetadata.cameras?.map(c => ({ id: c.id, name: c.cameraName })),
          lenses: response.newMetadata.lenses?.map(l => ({ id: l.id, name: l.lensName })),
          filmTypes: response.newMetadata.filmTypes?.map(f => ({
            id: f.id,
            name: f.filmTypeName || '',
            filmTypeName: f.filmTypeName,
            defaultIso: f.defaultIso,
          })),
        }
      : {
          tags: undefined,
          people: undefined,
          cameras: undefined,
          lenses: undefined,
          filmTypes: undefined,
        },
    errors: undefined, // updateImages doesn't return errors in the same format
  };
}
