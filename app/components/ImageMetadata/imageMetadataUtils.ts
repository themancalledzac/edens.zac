/**
 * Image Metadata Utilities
 *
 * Helper functions for building and processing image metadata updates.
 * Used by ImageMetadataModal for both single and bulk editing.
 */

import type { ContentImageUpdateRequest, ImageContentModel } from '@/app/types/Content';

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
        console.log('[applyPartialUpdate] Applied collections update:', {
          originalCollections: (original as { collections?: unknown[] }).collections,
          newCollections: collectionsValue.prev,
        });
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
 * Build a diff between updateState (what user edited) and currentState (original)
 * Returns a ContentImageUpdateRequest with only changed fields
 */
export function buildImageUpdateDiff(
  updateState: Partial<ImageContentModel> & { id: number },
  currentState: ImageContentModel
): ContentImageUpdateRequest {
  const diff: ContentImageUpdateRequest = { id: updateState.id };

  // Simple field comparisons
  const simpleFields: Array<keyof ImageContentModel> = [
    'title',
    'caption',
    'alt',
    'author',
    'rating',
    'blackAndWhite',
    'isFilm',
    'shutterSpeed',
    'focalLength',
    'location',
    'fStop',
    'iso',
    'filmFormat',
    'createDate',
  ];

  for (const field of simpleFields) {
    const updateValue = updateState[field];
    const currentValue = currentState[field];
    
    // Only include if changed (handling null/undefined)
    if (updateValue !== currentValue) {
      (diff as unknown as Record<string, unknown>)[field] = updateValue ?? null;
    }
  }

  // Handle camera (prev/newValue/remove pattern)
  if (updateState.camera?.id !== currentState.camera?.id) {
    if (!updateState.camera) {
      diff.camera = { remove: true };
    } else if (updateState.camera.id && updateState.camera.id > 0) {
      diff.camera = { prev: updateState.camera.id };
    } else {
      diff.camera = { newValue: updateState.camera.name };
    }
  }

  // Handle lens (prev/newValue/remove pattern)
  if (updateState.lens?.id !== currentState.lens?.id) {
    if (!updateState.lens) {
      diff.lens = { remove: true };
    } else if (updateState.lens.id && updateState.lens.id > 0) {
      diff.lens = { prev: updateState.lens.id };
    } else {
      diff.lens = { newValue: updateState.lens.name };
    }
  }

  // Handle filmType (prev/newValue/remove pattern)
  const updateFilmType = updateState.filmType;
  const currentFilmType = currentState.filmType;
  if (updateFilmType !== currentFilmType) {
    if (!updateFilmType) {
      diff.filmType = { remove: true };
    } else {
      // For filmType, we need to find it in available types or create new
      // This will be handled by the component passing the right structure
      // For now, we'll need the component to handle this
    }
  }

  // Handle tags (prev/newValue/remove pattern)
  const updateTags = updateState.tags || [];
  const currentTags = currentState.tags || [];
  const updateTagIds = updateTags.filter(t => t.id && t.id > 0).map(t => t.id!);
  const currentTagIds = currentTags.filter(t => t.id && t.id > 0).map(t => t.id!);
  const updateTagNames = updateTags.filter(t => !t.id || t.id === 0).map(t => t.name);
  
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

  // Handle people (prev/newValue/remove pattern)
  const updatePeople = updateState.people || [];
  const currentPeople = currentState.people || [];
  const updatePeopleIds = updatePeople.filter(p => p.id && p.id > 0).map(p => p.id!);
  const currentPeopleIds = currentPeople.filter(p => p.id && p.id > 0).map(p => p.id!);
  const updatePeopleNames = updatePeople.filter(p => !p.id || p.id === 0).map(p => p.name);
  
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

  // Handle collections (prev/newValue/remove pattern)
  const updateCollections = updateState.collections || [];
  const currentCollections = currentState.collections || [];
  
  // Build maps for easier lookup
  const currentCollectionsMap = new Map(
    currentCollections.map(c => [c.collectionId, c])
  );
  const updateCollectionsMap = new Map(
    updateCollections.map(c => [c.collectionId, c])
  );
  
  // Find collections that are new (in update but not in current)
  const newCollections = updateCollections.filter(
    uc => !currentCollectionsMap.has(uc.collectionId)
  );
  
  // Find collections that are removed (in current but not in update)
  const removedCollectionIds = currentCollections
    .filter(cc => !updateCollectionsMap.has(cc.collectionId))
    .map(cc => cc.collectionId);
  
  // Find collections that are modified (same collectionId but different visible)
  // NOTE: We intentionally exclude orderIndex from this check - orderIndex should only
  // be updated via explicit reordering operations, not when adding collections or changing visibility
  const modifiedCollections = updateCollections.filter(uc => {
    const current = currentCollectionsMap.get(uc.collectionId);
    if (!current) return false; // Already handled as new
    // Only check visibility changes, NOT orderIndex changes
    return uc.visible !== current.visible;
  });
  
  // Only include collections update if there are actual changes
  if (newCollections.length > 0 || removedCollectionIds.length > 0 || modifiedCollections.length > 0) {
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
  updateDTO: (updates: Partial<ContentImageUpdateRequest>) => void
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
