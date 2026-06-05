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
 * NOTE: this sends no `remove`, so it can only ADD tags — the backend reconciler
 * never drops a tag that's merely absent from `prev`. For edit flows that must
 * support deselection/clearing, use {@link buildTagsDiff} instead. Kept for
 * add-only callers and tests.
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

/**
 * Build a TagUpdate diff by comparing updated vs current tag arrays.
 * Returns undefined if nothing changed.
 *
 * - prev: IDs of tags in the updated set (existing ones to keep/add)
 * - newValue: names of brand-new tags to create
 * - remove: IDs of tags in current but not in updated (to remove)
 *
 * Unlike {@link createTagsUpdate} — which only sends `prev`/`newValue` and so can
 * never DROP a tag (the backend `updateTags` reconciler treats `prev` as additive,
 * removing only what is in `remove`) — this computes the `remove` set, so
 * deselecting or clearing tags actually persists. Mirrors `buildLocationsDiff` in
 * `locationUtils.ts`.
 *
 * @param updated - New desired tags
 * @param current - Current (saved) tags on the entity
 * @returns TagUpdate if changed, undefined if identical
 */
export function buildTagsDiff(
  updated: ContentTagModel[],
  current: ContentTagModel[] = []
): TagUpdate | undefined {
  const currentIds = new Set(current.filter(t => t.id > 0).map(t => t.id));
  const updatedIds = new Set(updated.filter(t => t.id > 0).map(t => t.id));
  const updatedNewNames = updated.filter(t => t.id === 0).map(t => t.name);
  const currentNewNames = current.filter(t => t.id === 0).map(t => t.name);

  const removeIds = [...currentIds].filter(id => !updatedIds.has(id));

  const sameExisting =
    currentIds.size === updatedIds.size && [...currentIds].every(id => updatedIds.has(id));
  const sameNew =
    updatedNewNames.length === currentNewNames.length &&
    updatedNewNames.every((n, i) => n === currentNewNames[i]);

  if (sameExisting && sameNew) return undefined;

  const result: TagUpdate = {};
  const prevIds = [...updatedIds];
  if (prevIds.length > 0) result.prev = prevIds;
  if (updatedNewNames.length > 0) result.newValue = updatedNewNames;
  if (removeIds.length > 0) result.remove = removeIds;

  return result;
}
