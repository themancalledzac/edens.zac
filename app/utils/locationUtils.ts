/**
 * Location Utilities
 *
 * Locations are many-to-many (array-based), matching the tags/people pattern. Used by both
 * Collection and Image metadata editing.
 *
 * The conversion and diff mechanics live in `entityUtils.ts`, shared with `tagUtils.ts`.
 * What stays here is {@link slugify}, which is not entity-specific but is the one place the
 * backend's slug algorithm is mirrored.
 */

import type { LocationModel, LocationUpdate } from '@/app/types/Collection';
import { buildEntityDiff, convertToModels } from '@/app/utils/entityUtils';

/**
 * Generate a URL-friendly slug from a display name. The single frontend mirror of backend
 * `SlugUtil.generateSlug`: lowercase, strip everything outside `[a-z0-9\s-]`, whitespace
 * runs to `-`, collapse `-` runs, trim edge `-`. Idempotent on strings that are already
 * slugs. Backend slugs for locations, tags and people are ALWAYS derived from names with
 * this algorithm (V8 backfill, MetadataService, TagRepository), so slugifying a name
 * recovers the slug the backend would emit for it.
 *
 * Prefer an API-provided slug when there is one — the backend is the canonical source, and
 * this is the fallback for payloads that carry names only. Do NOT re-implement locally:
 * `tagUtils.tagNameToSlug` aliases this so a backend algorithm change is fixed in one place.
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
  return convertToModels(locationInput, availableLocations, (id, name, slug) => ({
    id,
    name,
    slug,
  }));
}

/**
 * Build a LocationUpdate diff by comparing updated vs current location arrays.
 * Returns undefined if nothing changed.
 *
 * See {@link buildEntityDiff} for the diff's contents and why `remove` is computed.
 *
 * @param updated - New desired locations
 * @param current - Current locations on the entity
 * @returns LocationUpdate if changed, undefined if identical
 */
export function buildLocationsDiff(
  updated: LocationModel[],
  current: LocationModel[] = []
): LocationUpdate | undefined {
  return buildEntityDiff(updated, current);
}
