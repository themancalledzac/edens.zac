import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import {
  applyHiddenVisibility,
  countHiddenCollections,
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

  it('drops HIDDEN collections once the preview is engaged', () => {
    expect(idsOf(applyHiddenVisibility([listed, unlisted, hidden], true))).toEqual([1, 2]);
  });

  // UNLISTED collections are reachable by direct slug and are not part of what this previews away.
  it('never touches UNLISTED in either position', () => {
    expect(idsOf(applyHiddenVisibility([unlisted], false))).toEqual([2]);
    expect(idsOf(applyHiddenVisibility([unlisted], true))).toEqual([2]);
  });

  it('passes through a collection whose visibility is unknown', () => {
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

describe('countHiddenCollections', () => {
  it('counts only HIDDEN collections', () => {
    expect(countHiddenCollections([listed, unlisted, hidden, unknown])).toBe(1);
    expect(countHiddenCollections([listed, unlisted])).toBe(0);
  });
});
