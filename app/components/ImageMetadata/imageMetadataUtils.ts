/**
 * Image Metadata Utilities
 *
 * Helper functions for building and processing image metadata updates.
 * Used by ImageMetadataModal for both single and bulk editing.
 */

import type { UpdateImageDTO } from '@/app/lib/api/images';
import type { ImageCollection, ImageContentBlock } from '@/app/types/ContentBlock';
import type {
  ContentCameraModel,
  ContentLensModel,
  ContentPersonModel,
  ContentTagModel,
  FilmTypeModel,
} from '@/app/types/ImageMetadata';

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
 * Convert ImageCollection array to simple {id, name} format for UnifiedMetadataSelector
 */
export function toSelectorFormat(collections: ImageCollection[]): Array<{ id: number; name: string }> {
  return collections.map(c => ({
    id: c.collectionId,
    name: c.collectionName,
  }));
}

/**
 * Convert simple {id, name} format back to ImageCollection for DTO
 */
export function toDTOFormat(collections: Array<{ id: number; name: string }>): ImageCollection[] {
  return collections.map(c => ({
    collectionId: c.id,
    collectionName: c.name,
  }));
}

// ============================================================================
// Display Helper Functions
// These convert DTO + initialValues into display objects for selectors
// ============================================================================

/**
 * Generic function to get display items for multi-select metadata (tags, people)
 * Combines existing item IDs with new item names
 *
 * @param updateDTO - The update DTO containing changes
 * @param existingIdsKey - Key in DTO for existing item IDs (e.g., 'tagIds', 'personIds')
 * @param newItemsKey - Key in DTO for new item names (e.g., 'newTags', 'newPeople')
 * @param nameProperty - Property name for the item name (e.g., 'tagName', 'personName')
 * @param initialItems - Initial items from the image
 * @param availableItems - All available items to select from
 * @returns Combined array of existing and new items
 */
export function getDisplayItems<T extends { id: number }>(
  updateDTO: UpdateImageDTO,
  existingIdsKey: keyof UpdateImageDTO,
  newItemsKey: keyof UpdateImageDTO,
  nameProperty: string,
  initialItems: T[] | undefined,
  availableItems: T[]
): T[] {
  // Get existing IDs from DTO or fallback to initial items
  const existingIds = updateDTO[existingIdsKey] !== undefined
    ? (updateDTO[existingIdsKey] as number[] | null)
    : initialItems?.map(item => item.id);

  // Filter available items by IDs
  const existing = existingIds
    ? availableItems.filter(item => existingIds.includes(item.id))
    : [];

  // Create pseudo-objects for new items (id: 0 indicates new)
  const newItems = ((updateDTO[newItemsKey] as string[] | null) || []).map(name => ({
    id: 0,
    [nameProperty]: name
  } as T));

  return [...existing, ...newItems];
}

/**
 * Wrapper for getDisplayItems specifically for tags
 */
export function getDisplayTags<T extends { id: number; name: string }>(
  updateDTO: UpdateImageDTO,
  initialTags: T[] | undefined,
  availableTags: T[]
): T[] {
  return getDisplayItems(updateDTO, 'tagIds', 'newTags', 'name', initialTags, availableTags);
}

/**
 * Wrapper for getDisplayItems specifically for people
 */
export function getDisplayPeople<T extends { id: number; name: string }>(
  updateDTO: UpdateImageDTO,
  initialPeople: T[] | undefined,
  availablePeople: T[]
): T[] {
  return getDisplayItems(updateDTO, 'personIds', 'newPeople', 'name', initialPeople, availablePeople);
}

/**
 * Get display collections from DTO or initialValues
 */
export function getDisplayCollections(
  updateDTO: { collections?: ImageCollection[] | null },
  initialCollections: ImageCollection[] | undefined
): Array<{ id: number; name: string }> {
  const collections = updateDTO.collections !== undefined
    ? updateDTO.collections
    : initialCollections;
  return collections ? toSelectorFormat(collections) : [];
}

/**
 * Generic function to get display item for single-select metadata (camera, lens)
 * Handles both existing item ID and new item name
 *
 * @param updateDTO - The update DTO containing changes
 * @param idKey - Key in DTO for existing item ID (e.g., 'cameraModelId', 'lensId')
 * @param nameKey - Key in DTO for new item name (e.g., 'cameraName', 'lensName')
 * @param nameProperty - Property name for the item name (e.g., 'cameraName', 'lensName')
 * @param initialItem - Initial item from the image
 * @param availableItems - All available items to select from
 * @returns Single item or null
 */
export function getDisplayItem<T extends { id?: number }>(
  updateDTO: UpdateImageDTO,
  idKey: keyof UpdateImageDTO,
  nameKey: keyof UpdateImageDTO,
  nameProperty: string,
  initialItem: T | null | undefined,
  availableItems: T[]
): T | null {
  console.log('[getDisplayItem] Called with:', {
    idKey,
    nameKey,
    nameProperty,
    dtoIdValue: updateDTO[idKey],
    dtoNameValue: updateDTO[nameKey],
    initialItem,
  });

  // Check if name field is defined in DTO (new item) - CHECK THIS FIRST
  // This takes precedence because when adding a new item, we set both lensId=null and lensName="name"
  if (updateDTO[nameKey] !== undefined) {
    const name = updateDTO[nameKey] as string | null;
    console.log('[getDisplayItem] Name field defined:', name);
    if (name !== null && name !== '') {
      const newItem = { id: 0, [nameProperty]: name } as T;
      console.log('[getDisplayItem] Created new item:', newItem);
      return newItem;
    }
  }

  // Check if ID field is defined in DTO (existing item)
  if (updateDTO[idKey] !== undefined) {
    const id = updateDTO[idKey] as number | null;
    console.log('[getDisplayItem] ID field defined:', id);
    if (id === null) return null;
    const found = availableItems.find(item => item.id === id) || null;
    console.log('[getDisplayItem] Found by ID:', found);
    return found;
  }

  // Fallback to initial item
  console.log('[getDisplayItem] Falling back to initial item:', initialItem);
  return initialItem || null;
}

/**
 * Wrapper for getDisplayItem specifically for camera
 */
export function getDisplayCamera<T extends { id?: number; name: string }>(
  updateDTO: UpdateImageDTO,
  initialCamera: T | null | undefined,
  availableCameras: T[]
): T | null {
  return getDisplayItem(updateDTO, 'cameraModelId', 'cameraName', 'name', initialCamera, availableCameras);
}

/**
 * Wrapper for getDisplayItem specifically for lens
 */
export function getDisplayLens<T extends { id?: number; name: string }>(
  updateDTO: UpdateImageDTO,
  initialLens: T | null | undefined,
  availableLenses: T[]
): T | null {
  const result = getDisplayItem(updateDTO, 'lensId', 'lensName', 'name', initialLens, availableLenses);
  console.log('[getDisplayLens] Called with:', {
    updateDTO: { lensId: updateDTO.lensId, lensName: updateDTO.lensName },
    initialLens,
    availableLensesCount: availableLenses.length,
    result,
  });
  return result;
}

/**
 * Get display film stock from DTO or initialValues
 * Handles filmTypeId (existing), newFilmType (new), or filmType string
 */
export function getDisplayFilmStock<T extends { id: number; name?: string; displayName: string; defaultIso: number }>(
  updateDTO: {
    filmTypeId?: number | null;
    newFilmType?: { filmTypeName: string; defaultIso: number } | null;
  },
  initialFilmType: string | null | undefined,
  availableFilmTypes: T[]
): T | null {
  if (updateDTO.filmTypeId !== undefined) {
    if (updateDTO.filmTypeId === null) return null;
    return availableFilmTypes.find(f => f.id === updateDTO.filmTypeId) || null;
  }
  if (updateDTO.newFilmType !== undefined) {
    if (updateDTO.newFilmType === null) return null;
    return {
      id: 0,
      name: updateDTO.newFilmType.filmTypeName.toUpperCase().replace(/\s+/g, '_'),
      displayName: updateDTO.newFilmType.filmTypeName,
      defaultIso: updateDTO.newFilmType.defaultIso,
    } as T;
  }
  if (initialFilmType) {
    return availableFilmTypes.find(f => f.displayName === initialFilmType) || null;
  }
  return null;
}

// ============================================================================
// Metadata Change Handler
// Generic handler for all metadata type updates
// ============================================================================

export type MetadataType = 'tags' | 'people' | 'collections' | 'camera' | 'lens' | 'filmStock';

/**
 * Generic handler for all metadata changes
 * Processes the value based on type and returns the appropriate DTO updates
 *
 * @param type - The type of metadata being changed
 * @param value - The new value (varies by type)
 * @param toDTOFormat - Helper to convert collections to DTO format
 * @returns Partial DTO updates to apply
 */
export function buildMetadataUpdate(
  type: MetadataType,
  value: unknown,
  toDTOFormat: (collections: Array<{ id: number; name: string }>) => ImageCollection[]
): Partial<UpdateImageDTO> {
  switch (type) {
    case 'tags': {
      const tags = value as ContentTagModel[];
      const existingTags = tags.filter(t => t.id && t.id > 0);
      const newTags = tags.filter(t => !t.id || t.id === 0).map(t => t.name);
      return {
        tagIds: existingTags.length > 0 ? existingTags.map(t => t.id) : null,
        newTags: newTags.length > 0 ? newTags : null,
      };
    }

    case 'people': {
      const people = value as ContentPersonModel[];
      const existingPeople = people.filter(p => p.id && p.id > 0);
      const newPeople = people.filter(p => !p.id || p.id === 0).map(p => p.name);
      return {
        personIds: existingPeople.length > 0 ? existingPeople.map(p => p.id) : null,
        newPeople: newPeople.length > 0 ? newPeople : null,
      };
    }

    case 'collections': {
      const collections = value as Array<{ id: number; name: string }>;
      return {
        collections: collections.length > 0 ? toDTOFormat(collections) : []
      };
    }

    case 'camera': {
      const camera = value as ContentCameraModel | null;
      if (!camera) {
        return { cameraModelId: null, cameraName: null };
      }
      if (camera.id && camera.id > 0) {
        return { cameraModelId: camera.id, cameraName: null };
      }
      return { cameraModelId: null, cameraName: camera.name };
    }

    case 'lens': {
      const lens = value as ContentLensModel | null;
      console.log('[buildMetadataUpdate] Processing lens:', lens);
      if (!lens) {
        console.log('[buildMetadataUpdate] Lens is null, clearing');
        return { lensId: null, lensName: null };
      }
      if (lens.id && lens.id > 0) {
        console.log('[buildMetadataUpdate] Lens has existing ID:', lens.id);
        return { lensId: lens.id, lensName: null };
      }
      console.log('[buildMetadataUpdate] Lens is new, using name:', lens.name);
      return { lensId: null, lensName: lens.name };
    }

    case 'filmStock': {
      const filmStock = value as FilmTypeModel | null;
      if (!filmStock) {
        return { filmType: null, filmTypeId: null, newFilmType: null };
      }

      const updates: Partial<UpdateImageDTO> = {
        filmType: filmStock.displayName || null,
      };

      // Auto-populate ISO from selected film stock's defaultIso
      if (filmStock.id && filmStock.id > 0) {
        updates.iso = filmStock.defaultIso;
        updates.filmTypeId = filmStock.id;
        updates.newFilmType = null;
      } else {
        updates.newFilmType = {
          filmTypeName: filmStock.displayName,
          defaultIso: filmStock.defaultIso,
        };
        updates.iso = filmStock.defaultIso;
        updates.filmTypeId = null;
      }

      return updates;
    }

    default:
      return {};
  }
}
