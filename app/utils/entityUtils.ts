/**
 * Entity Utilities
 *
 * Tags, locations and people are the same association: a many-to-many list of
 * `{ id, name, slug }` edited as an array and saved as a `{ prev, newValue, remove }` diff.
 * This module holds that mechanic once. `tagUtils.ts` and `locationUtils.ts` fix the type
 * and re-export under their own names, so callers keep talking about tags and locations.
 *
 * `buildAssociationDiff` in `Metadata/metadataUtils.ts` is deliberately NOT folded in here.
 * It looks like a third copy and is not one: it emits a diff whenever the edited set holds
 * any unsaved name, where {@link buildEntityDiff} compares the unsaved names on both sides
 * and returns undefined when they match. Its ids are also optional (`id?: number`). Moving
 * its callers onto this would change which saves fire, not just where the code lives.
 */

import type { EntityRef, EntityUpdate } from '@/app/types/Collection';

/**
 * Resolve loose entity input against a known list, so the caller ends up with real ids
 * wherever one exists.
 *
 * Each entry resolves by id first, then by name; anything still unmatched becomes a new
 * entity through `createUnknown`. Callers pass a factory rather than having this construct
 * the object itself, so adding a required field to `ContentTagModel` or `LocationModel`
 * breaks at the wrapper instead of being papered over by a cast here.
 *
 * @param input - Entities as an array of models, an array of names, a single name, a bare
 *   `{ id, name }`, or null/undefined.
 * @param available - All known entities of this type, from metadata.
 * @param createUnknown - Builds the concrete model for an entry not found in `available`.
 * @returns Resolved models, empty if there was no input.
 */
export function convertToModels<T extends EntityRef>(
  input: T[] | string[] | string | { id: number; name: string } | null | undefined,
  available: T[],
  createUnknown: (id: number, name: string, slug: string) => T
): T[] {
  if (!input) return [];

  const inputs: Array<string | { id: number; name: string; slug?: string }> = Array.isArray(input)
    ? input
    : [input];

  return inputs.map(entry => {
    if (typeof entry === 'object' && 'id' in entry && 'name' in entry) {
      if (entry.id > 0) {
        const foundById = available.find(candidate => candidate.id === entry.id);
        if (foundById) return foundById;
      }
      const foundByName = available.find(candidate => candidate.name === entry.name);
      if (foundByName) return foundByName;
      return createUnknown(entry.id, entry.name, entry.slug ?? '');
    }

    const found = available.find(candidate => candidate.name === entry);
    return found ?? createUnknown(0, entry, '');
  });
}

/**
 * Diff an edited entity list against the saved one. Returns undefined when nothing changed.
 *
 * - `prev`: ids of every saved entity in the edited set — existing ones to keep or add
 * - `newValue`: names of entities with `id: 0`, which the backend creates
 * - `remove`: ids present in `current` but dropped from `updated`
 *
 * Computing `remove` is what makes a deselection persist. The backend reconcilers treat
 * `prev` as additive and drop only what `remove` names, so a diff that omits `remove`
 * leaves the entity attached however many times it is saved.
 *
 * @param updated - The edited selection.
 * @param current - The saved selection on the entity.
 * @returns The diff, or undefined if the two sets are identical.
 */
export function buildEntityDiff(
  updated: EntityRef[],
  current: EntityRef[] = []
): EntityUpdate | undefined {
  const currentIds = new Set(current.filter(e => e.id > 0).map(e => e.id));
  const updatedIds = new Set(updated.filter(e => e.id > 0).map(e => e.id));
  const updatedNewNames = updated.filter(e => e.id === 0).map(e => e.name);
  const currentNewNames = current.filter(e => e.id === 0).map(e => e.name);

  const removeIds = [...currentIds].filter(id => !updatedIds.has(id));

  const sameExisting =
    currentIds.size === updatedIds.size && [...currentIds].every(id => updatedIds.has(id));
  const sameNew =
    updatedNewNames.length === currentNewNames.length &&
    updatedNewNames.every((n, i) => n === currentNewNames[i]);

  if (sameExisting && sameNew) return undefined;

  const result: EntityUpdate = {};
  const prevIds = [...updatedIds];
  if (prevIds.length > 0) result.prev = prevIds;
  if (updatedNewNames.length > 0) result.newValue = updatedNewNames;
  if (removeIds.length > 0) result.remove = removeIds;

  return result;
}
