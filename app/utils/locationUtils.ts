/**
 * Location Utilities
 *
 * Shared utilities for handling location conversions and updates.
 * Locations are many-to-many (array-based), matching the tags/people pattern.
 * Used by both Collection and Image metadata editing.
 */

import type { LocationModel, LocationUpdate } from '@/app/types/Collection';

/**
 * Generate a URL-friendly slug from a display name.
 * Matches backend slug generation rules. Use only as a fallback
 * when the API hasn't provided a slug — the backend is the canonical source.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\d\sa-z-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Convert location input (array, single object, string, or null) to a LocationModel array.
 * Resolves each entry against availableLocations by ID or name.
 * Unknown entries get id: 0 (new location).
 *
 * @param locationInput - Locations from API response or legacy formats
 * @param availableLocations - All known locations from metadata
 * @returns Resolved LocationModel array (empty if no input)
 */
export function convertLocationsToModels(
  locationInput: LocationModel[] | string | { id: number; name: string } | null | undefined,
  availableLocations: LocationModel[]
): LocationModel[] {
  if (!locationInput) return [];

  // Normalize to array
  const inputs: Array<string | { id: number; name: string; slug?: string }> = Array.isArray(
    locationInput
  )
    ? locationInput
    : [locationInput];

  return inputs.map(input => {
    if (typeof input === 'object' && 'id' in input && 'name' in input) {
      if (input.id > 0) {
        const found = availableLocations.find(loc => loc.id === input.id);
        if (found) return found;
      }
      const foundByName = availableLocations.find(loc => loc.name === input.name);
      if (foundByName) return foundByName;
      return { id: input.id, name: input.name, slug: input.slug ?? '' };
    }

    // String input (legacy)
    const found = availableLocations.find(loc => loc.name === input);
    return found ?? { id: 0, name: input, slug: '' };
  });
}

/**
 * Create a LocationUpdate from a LocationModel array for API submission.
 * Splits models into `prev` (existing, id > 0) and `newValue` (new, id === 0).
 *
 * @param locations - Selected locations from UI
 * @returns LocationUpdate with prev/newValue arrays
 */
export function createLocationsUpdate(locations: LocationModel[]): LocationUpdate {
  const prev: number[] = [];
  const newValue: string[] = [];

  for (const loc of locations) {
    if (loc.id > 0) {
      prev.push(loc.id);
    } else {
      newValue.push(loc.name);
    }
  }

  return {
    ...(prev.length > 0 ? { prev } : {}),
    ...(newValue.length > 0 ? { newValue } : {}),
  };
}

/**
 * Build a LocationUpdate diff by comparing updated vs current location arrays.
 * Returns undefined if nothing changed.
 *
 * - prev: IDs of locations in the updated set (existing ones to keep/add)
 * - newValue: names of brand-new locations to create
 * - remove: IDs of locations in current but not in updated (to remove)
 *
 * @param updated - New desired locations
 * @param current - Current locations on the entity
 * @returns LocationUpdate if changed, undefined if identical
 */
export function buildLocationsDiff(
  updated: LocationModel[],
  current: LocationModel[] = []
): LocationUpdate | undefined {
  const currentIds = new Set(current.filter(l => l.id > 0).map(l => l.id));
  const updatedIds = new Set(updated.filter(l => l.id > 0).map(l => l.id));
  const updatedNewNames = updated.filter(l => l.id === 0).map(l => l.name);
  const currentNewNames = current.filter(l => l.id === 0).map(l => l.name);

  // Compute removed IDs (in current but not in updated)
  const removeIds = [...currentIds].filter(id => !updatedIds.has(id));

  // Check if anything changed
  const sameExisting =
    currentIds.size === updatedIds.size && [...currentIds].every(id => updatedIds.has(id));
  const sameNew =
    updatedNewNames.length === currentNewNames.length &&
    updatedNewNames.every((n, i) => n === currentNewNames[i]);

  if (sameExisting && sameNew) return undefined;

  const result: LocationUpdate = {};
  const prevIds = [...updatedIds];
  if (prevIds.length > 0) result.prev = prevIds;
  if (updatedNewNames.length > 0) result.newValue = updatedNewNames;
  if (removeIds.length > 0) result.remove = removeIds;

  return result;
}
