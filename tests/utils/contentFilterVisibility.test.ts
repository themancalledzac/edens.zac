import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import {
  applyHiddenVisibility,
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

describe('applyHiddenVisibility', () => {
  // Off is the default, and it must be a pure pass-through: an admin's default view stays the
  // full set the backend already scoped to them.
  it('keeps everything while the preview is off', () => {
    const content = [listed, unlisted, hidden];
    expect(applyHiddenVisibility(content, false)).toBe(content);
  });

  // The general-audience scope is LISTED alone — mirrors the backend's anonymous branch. Neither
  // UNLISTED (slug-only) nor HIDDEN (dev-only) appears in a public list, so both must drop.
  it('narrows to LISTED only once the preview is engaged', () => {
    expect(idsOf(applyHiddenVisibility([listed, unlisted, hidden], true))).toEqual([1]);
  });

  it('drops UNLISTED, not just HIDDEN', () => {
    expect(idsOf(applyHiddenVisibility([unlisted], true))).toEqual([]);
    expect(idsOf(applyHiddenVisibility([unlisted], false))).toEqual([2]);
  });

  // An unknown label means the payload predates the backend enrichment; guessing "not listed"
  // would blank the page.
  it('keeps a collection whose visibility is unknown', () => {
    expect(idsOf(applyHiddenVisibility([unknown], true))).toEqual([4]);
  });

  it('never drops non-collection blocks', () => {
    const image = createImageContent(10);
    expect(idsOf(applyHiddenVisibility([image, hidden], true))).toEqual([10]);
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

  it('agrees with what applyHiddenVisibility removes', () => {
    const page = [listed, unlisted, hidden, unknown];
    const kept = applyHiddenVisibility(page, true);
    expect(page.length - kept.length).toBe(countNonListedCollections(page));
  });
});
