/**
 * Tag Utilities
 *
 * Tags are many-to-many (array-based), matching the locations/people pattern. Used by both
 * Collection and Image metadata editing.
 *
 * The conversion and diff mechanics live in `entityUtils.ts`, shared with `locationUtils.ts`.
 * What is specific to tags stays here: `CollectionModel.tags` arrives as `string[]` (names
 * only, no ids), so {@link convertTagsToModels} resolves those names against the available
 * tag list to recover ids and slugs.
 */

import type { TagUpdate } from '@/app/types/Collection';
import type { ContentTagModel } from '@/app/types/Metadata';
import { buildEntityDiff, convertToModels } from '@/app/utils/entityUtils';

/**
 * Convert a tag display name to its canonical slug. Alias for `slugify` in
 * `locationUtils.ts` — see that function for the backend-parity contract.
 */
export { slugify as tagNameToSlug } from '@/app/utils/locationUtils';

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
  return convertToModels(tagInput, availableTags, (id, name, slug) => ({ id, name, slug }));
}

/**
 * Build a TagUpdate diff by comparing updated vs current tag arrays.
 * Returns undefined if nothing changed.
 *
 * See {@link buildEntityDiff} for the diff's contents and why `remove` is computed.
 *
 * @param updated - New desired tags
 * @param current - Current (saved) tags on the entity
 * @returns TagUpdate if changed, undefined if identical
 */
export function buildTagsDiff(
  updated: ContentTagModel[],
  current: ContentTagModel[] = []
): TagUpdate | undefined {
  return buildEntityDiff(updated, current);
}
