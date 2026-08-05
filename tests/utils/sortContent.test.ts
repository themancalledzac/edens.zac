import { type AnyContentModel, type ContentParallaxImageModel } from '@/app/types/Content';
import { convertCollectionContentToParallax } from '@/app/utils/contentLayout';
import {
  applySort,
  mergeSortedCollectionCards,
  sortCollectionCardsByDate,
} from '@/app/utils/sortContent';
import {
  createCollectionContent,
  createImageContent,
  createTextContent,
} from '@/tests/fixtures/contentFixtures';

/**
 * A processed collection CARD — what `processContentBlocks` actually hands the sort. The
 * conversion stamps `contentType: 'IMAGE'` and keeps the slug, which is what makes these cards
 * invisible to `isDateable` and visible to `isCollectionCard`.
 */
function card(id: number, overrides: { collectionDate?: string } = {}): ContentParallaxImageModel {
  return convertCollectionContentToParallax(createCollectionContent(id, overrides));
}

const idsOf = (items: AnyContentModel[]) => items.map(item => item.id);

describe('sortCollectionCardsByDate', () => {
  it('orders cards by their own collection date', () => {
    const cards = [
      card(1, { collectionDate: '2026-03-01' }),
      card(2, { collectionDate: '2024-01-01' }),
      card(3, { collectionDate: '2025-06-15' }),
    ];
    expect(idsOf(sortCollectionCardsByDate(cards, 'asc'))).toEqual([2, 3, 1]);
    expect(idsOf(sortCollectionCardsByDate(cards, 'desc'))).toEqual([1, 3, 2]);
  });

  it('does not mutate its input', () => {
    const cards = [
      card(1, { collectionDate: '2026-03-01' }),
      card(2, { collectionDate: '2024-01-01' }),
    ];
    sortCollectionCardsByDate(cards, 'asc');
    expect(idsOf(cards)).toEqual([1, 2]);
  });
});

describe('mergeSortedCollectionCards', () => {
  it('replaces only collection-card slots and leaves other blocks put', () => {
    const text = createTextContent(50);
    const processed = [card(1, {}), text, card(2, {})];

    const merged = mergeSortedCollectionCards(processed, [card(2, {}), card(1, {})]);

    expect(idsOf(merged)).toEqual([2, 50, 1]);
  });
});

describe('applySort', () => {
  const collectionPage = () => [
    card(1, { collectionDate: '2026-03-01' }),
    card(2, { collectionDate: '2024-01-01' }),
    card(3, { collectionDate: '2025-06-15' }),
  ];

  it('is a no-op while the Order control is off', () => {
    const processed = collectionPage();
    expect(applySort(processed, 'off')).toBe(processed);
  });

  // The regression this whole path exists for: a page of collection tiles was previously
  // unsortable, because `isDateable` excludes collection cards by design.
  it('orders a collection-only page by date', () => {
    expect(idsOf(applySort(collectionPage(), 'asc'))).toEqual([2, 3, 1]);
    expect(idsOf(applySort(collectionPage(), 'desc'))).toEqual([1, 3, 2]);
  });

  it('sorts images and collection cards within their own slots on a mixed page', () => {
    const processed = [
      createImageContent(10, { captureDate: '2026-01-01' }),
      card(1, { collectionDate: '2026-03-01' }),
      createImageContent(11, { captureDate: '2024-01-01' }),
      card(2, { collectionDate: '2024-01-01' }),
    ];

    const sorted = applySort(processed, 'asc');

    // Slot 0 and 2 stay images, slot 1 and 3 stay cards — neither family invades the other.
    expect(idsOf(sorted)).toEqual([11, 2, 10, 1]);
  });

  it('leaves structural blocks anchored', () => {
    const text = createTextContent(50);
    const processed = [
      card(1, { collectionDate: '2026-03-01' }),
      text,
      card(2, { collectionDate: '2024-01-01' }),
    ];

    const sorted = applySort(processed, 'asc');

    expect(sorted[1]).toBe(text);
    expect(idsOf(sorted)).toEqual([2, 50, 1]);
  });
});
