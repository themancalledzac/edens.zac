/**
 * Tag Utilities
 *
 * Shared utilities for handling tag conversions and updates.
 * Tags are many-to-many (array-based), matching the locations/people pattern.
 * Used by both Collection and Image metadata editing.
 *
 * Mirrors `locationUtils.ts`. The key difference: `CollectionModel.tags` arrives
 * as `string[]` (names only, no IDs), so {@link convertTagsToModels} resolves
 * those names against the available tag list to recover IDs/slugs.
 */

import type { TagUpdate } from '@/app/types/Collection';
import type { ContentTagModel } from '@/app/types/ImageMetadata';

/**
 * Convert tag input (array of models, array of names, single name, or null) to a
 * ContentTagModel array. Resolves each entry against availableTags by ID then name.
 * Unknown entries get id: 0 (new tag).
 *
 * @param tagInput - Tags from API response (`ContentTagModel[]`), saved collection
 *   tags (`string[]`), a single name, or null/undefined.
 * @param availableTags - All known tags from metadata
 * @returns Resolved ContentTagModel array (empty if no input)
 */
export function convertTagsToModels(
  tagInput: ContentTagModel[] | string[] | string | null | undefined,
  availableTags: ContentTagModel[]
): ContentTagModel[] {
  if (!tagInput) return [];

  const inputs: Array<string | ContentTagModel> = Array.isArray(tagInput) ? tagInput : [tagInput];

  return inputs.map(input => {
    if (typeof input === 'object' && 'id' in input && 'name' in input) {
      if (input.id > 0) {
        const found = availableTags.find(tag => tag.id === input.id);
        if (found) return found;
      }
      const foundByName = availableTags.find(tag => tag.name === input.name);
      if (foundByName) return foundByName;
      return { id: input.id, name: input.name, slug: input.slug ?? '' };
    }

    // String input (e.g. collection.tags names)
    const found = availableTags.find(tag => tag.name === input);
    return found ?? { id: 0, name: input, slug: '' };
  });
}

/**
 * Create a TagUpdate from a ContentTagModel array for API submission.
 * Splits models into `prev` (existing, id > 0) and `newValue` (new, id === 0).
 *
 * No explicit `remove` is sent — the backend reconciles `prev` as the authoritative
 * kept-set (matching the collection Locations selector behavior).
 *
 * @param tags - Selected tags from UI
 * @returns TagUpdate with prev/newValue arrays
 */
export function createTagsUpdate(tags: ContentTagModel[]): TagUpdate {
  const prev: number[] = [];
  const newValue: string[] = [];

  for (const tag of tags) {
    if (tag.id > 0) {
      prev.push(tag.id);
    } else {
      newValue.push(tag.name);
    }
  }

  return {
    ...(prev.length > 0 ? { prev } : {}),
    ...(newValue.length > 0 ? { newValue } : {}),
  };
}
