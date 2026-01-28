/**
 * Location Utilities
 *
 * Shared utilities for handling location conversions and updates
 * Used by both Collection and Image metadata editing
 */

import type { LocationModel, LocationUpdate } from '@/app/types/Collection';

/**
 * Convert a location string or object to a LocationModel
 * Finds the location in availableLocations by name or id, or creates a new one with id: 0
 *
 * @param locationInput - The location to convert:
 *   - string: Location name (from ContentImageModel or CollectionModel)
 *   - object: Location object with { id, name } (from API response)
 *   - null/undefined: No location
 * @param availableLocations - Array of available locations to search
 * @returns LocationModel if locationInput exists, or null if locationInput is empty
 *
 * @example
 * const location = convertLocationStringToModel('Seattle, WA', availableLocations);
 * // Returns: { id: 5, name: 'Seattle, WA' } if found, or { id: 0, name: 'Seattle, WA' } if not
 *
 * @example
 * const location = convertLocationStringToModel({ id: 2, name: 'Chamonix, France' }, availableLocations);
 * // Returns: { id: 2, name: 'Chamonix, France' } if found in availableLocations, or the object itself if not
 */
export function convertLocationStringToModel(
  locationInput: string | { id: number; name: string } | null | undefined,
  availableLocations: LocationModel[]
): LocationModel | null {
  if (!locationInput) return null;

  // Handle object input (from API response)
  if (typeof locationInput === 'object' && 'id' in locationInput && 'name' in locationInput) {
    // If it has a valid id > 0, try to find it in availableLocations by id first
    if (locationInput.id && locationInput.id > 0) {
      const foundById = availableLocations.find(loc => loc.id === locationInput.id);
      if (foundById) return foundById;
    }
    // If not found by id, try by name
    const foundByName = availableLocations.find(loc => loc.name === locationInput.name);
    if (foundByName) return foundByName;
    // If not found at all, return the object as-is (it has a valid id from the API)
    return { id: locationInput.id, name: locationInput.name };
  }

  // Handle string input (legacy format)
  if (typeof locationInput === 'string') {
    const location = availableLocations.find(loc => loc.name === locationInput);
    return location || { id: 0, name: locationInput };
  }

  return null;
}

/**
 * Create a LocationUpdate from a LocationModel selection
 * Converts UI selection (LocationModel) to API update format (LocationUpdate)
 *
 * @param location - LocationModel from UI selection (or null to remove)
 * @returns LocationUpdate object with prev/newValue/remove pattern
 *
 * @example
 * // Existing location selected
 * createLocationUpdateFromModel({ id: 5, name: 'Seattle, WA' })
 * // Returns: { prev: 5 }
 *
 * @example
 * // New location to create
 * createLocationUpdateFromModel({ id: 0, name: 'Portland, OR' })
 * // Returns: { newValue: 'Portland, OR' }
 *
 * @example
 * // Remove location
 * createLocationUpdateFromModel(null)
 * // Returns: { remove: true }
 */
export function createLocationUpdateFromModel(
  location: LocationModel | null | undefined
): LocationUpdate {
  if (!location) {
    return { remove: true };
  }

  if (location.id && location.id > 0) {
    // Existing location selected by ID
    return { prev: location.id };
  }

  // New location to create
  return { newValue: location.name };
}

/**
 * Build location diff for image updates
 * Compares LocationModel from UI state with location object from current state
 * Returns LocationUpdate only if location has changed
 *
 * @param updateLocation - LocationModel from updateState (UI)
 * @param currentLocation - Location object from currentState (original)
 * @returns LocationUpdate if location changed, undefined if unchanged
 *
 * @example
 * buildLocationDiff({ id: 5, name: 'Seattle' }, { id: 2, name: 'Seattle' })
 * // Returns: { prev: 5 } (changed to different location with same name)
 *
 * @example
 * buildLocationDiff({ id: 5, name: 'Seattle' }, { id: 5, name: 'Seattle' })
 * // Returns: undefined (same location)
 */
export function buildLocationDiff(
  updateLocation: LocationModel | null | undefined,
  currentLocation: LocationModel | null | undefined = null
): LocationUpdate | undefined {
  // Extract IDs for comparison (if both have valid IDs)
  const updateLocationId = updateLocation?.id && updateLocation.id > 0 ? updateLocation.id : null;
  const currentLocationId =
    currentLocation?.id && currentLocation.id > 0 ? currentLocation.id : null;

  // Extract names for comparison
  const updateLocationName = updateLocation?.name || null;
  const currentLocationName = currentLocation?.name || null;

  // Compare: if both have valid IDs, compare by ID; otherwise compare by name
  const hasChanged =
    updateLocationId && currentLocationId
      ? updateLocationId !== currentLocationId
      : updateLocationName !== currentLocationName;

  if (hasChanged) {
    return createLocationUpdateFromModel(updateLocation || null);
  }

  // No change
  return undefined;
}
