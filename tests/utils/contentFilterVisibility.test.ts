import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import {
  applyFollowedScope,
  applyVisibilityScope,
  countNonListedCollections,
  hasVisibilityData,
} from '@/app/utils/contentFilter';
import { createCollectionContent, createImageContent } from '@/tests/fixtures/contentFixtures';

const listed = createCollectionContent(1, { visibility: CollectionVisibility.LISTED });
const unlisted = createCollectionContent(2, { visibility: CollectionVisibility.UNLISTED });
const hidden = createCollectionContent(3, { visibility: CollectionVisibility.HIDDEN });
/** What every payload looks like until the backend's visibility enrichment ships. */
const unknown = createCollectionContent(4);

const idsOf = (items: { id?: number }[]) => items.map(item => item.id);

describe('applyVisibilityScope', () => {
  // `true` is the default and must be a pure pass-through — an admin's default view stays the
  // full set the backend already scoped to them. Identity, not just equality: no wasted re-render.
  it('passes content straight through while showHidden is on', () => {
    const content = [listed, unlisted, hidden];
    expect(applyVisibilityScope(content, true)).toBe(content);
  });

  // The general-audience scope is LISTED alone — mirrors the backend's anonymous branch. Neither
  // UNLISTED (slug-only) nor HIDDEN (dev-only) appears in a public list, so both must drop.
  it('narrows to LISTED only when showHidden is switched off', () => {
    expect(idsOf(applyVisibilityScope([listed, unlisted, hidden], false))).toEqual([1]);
  });

  it('drops UNLISTED, not just HIDDEN', () => {
    expect(idsOf(applyVisibilityScope([unlisted], false))).toEqual([]);
    expect(idsOf(applyVisibilityScope([unlisted], true))).toEqual([2]);
  });

  // An unknown label means the payload predates the backend enrichment; guessing "not listed"
  // would blank the page.
  it('keeps a collection whose visibility is unknown', () => {
    expect(idsOf(applyVisibilityScope([unknown], false))).toEqual([4]);
  });

  it('never drops non-collection blocks', () => {
    const image = createImageContent(10);
    expect(idsOf(applyVisibilityScope([image, hidden], false))).toEqual([10]);
  });
});

describe('hasVisibilityData', () => {
  // Gates the admin chip on real data rather than on the deploy order of the two repos.
  it('is false until the backend serializes visibility', () => {
    expect(hasVisibilityData([unknown, createImageContent(10)])).toBe(false);
  });

  it('is true as soon as any collection carries a visibility', () => {
    expect(hasVisibilityData([unknown, listed])).toBe(true);
  });

  it('is false for an empty page', () => {
    expect(hasVisibilityData([])).toBe(false);
  });
});

describe('countNonListedCollections', () => {
  // The badge must match what engaging the chip actually removes, so it counts UNLISTED too.
  it('counts every known non-LISTED collection', () => {
    expect(countNonListedCollections([listed, unlisted, hidden, unknown])).toBe(2);
    expect(countNonListedCollections([listed, listed])).toBe(0);
  });

  it('does not count a collection whose visibility is unknown', () => {
    expect(countNonListedCollections([unknown])).toBe(0);
  });

  it('agrees with what applyVisibilityScope removes', () => {
    const page = [listed, unlisted, hidden, unknown];
    const kept = applyVisibilityScope(page, false);
    expect(page.length - kept.length).toBe(countNonListedCollections(page));
  });
});

/**
 * The follow scope, the second of the two view scopes applied upstream of the filter pipeline.
 *
 * `createCollectionContent(n)` sets `referencedCollectionId` to `n * 100`, deliberately unequal to
 * `id` — which is what makes these assertions able to catch a scope keyed on the wrong field.
 */
describe('applyFollowedScope', () => {
  const followed = new Set([100, 300]);

  it('passes content straight through while followedOnly is off', () => {
    const content = [listed, unlisted, hidden];
    expect(applyFollowedScope(content, false, followed)).toBe(content);
  });

  it('narrows to the followed collections when switched on', () => {
    expect(idsOf(applyFollowedScope([listed, unlisted, hidden], true, followed))).toEqual([1, 3]);
  });

  /**
   * Keyed on the collection entity, not the block. Collection 1's block `id` is 1 while the id it
   * references is 100; a scope reading `id` would match neither and empty the list.
   */
  it('matches on referencedCollectionId rather than the block id', () => {
    expect(idsOf(applyFollowedScope([listed], true, new Set([100])))).toEqual([1]);
    expect(idsOf(applyFollowedScope([listed], true, new Set([1])))).toEqual([]);
  });

  it('never drops non-collection blocks', () => {
    const image = createImageContent(10);
    expect(idsOf(applyFollowedScope([image, unlisted], true, followed))).toEqual([10]);
  });

  /**
   * An unknown follow set withholds the narrowing rather than treating it as empty. The chip is
   * gated on the same condition, so this is the belt to that braces.
   */
  it('passes content through when the follow set is unknown', () => {
    const content = [listed, unlisted];
    expect(applyFollowedScope(content, true, undefined)).toBe(content);
  });

  it('returns nothing when the viewer follows none of them', () => {
    expect(idsOf(applyFollowedScope([listed, unlisted], true, new Set([999])))).toEqual([]);
  });
});
