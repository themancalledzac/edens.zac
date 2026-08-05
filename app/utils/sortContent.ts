/**
 * The Order control's chronological sort, applied to already-processed content.
 *
 * Lives beside `sortByDate` rather than in `contentFilter` because it depends on both
 * (`contentFilter` owns `isDateable`/the slot-merge helpers, and cannot import back out without a
 * cycle). Two block families sort independently and never trade slots:
 *
 * - **Dateables** (images, dated GIFs) — the pre-existing path, keyed on `captureDate`.
 * - **Collection cards** — excluded from `isDateable` by design (they are stamped
 *   `contentType: 'IMAGE'` by `convertCollectionContentToParallax`, and letting them into that
 *   path would have `enterReorder` persist an epoch-0 orderIndex). Before this module they were
 *   therefore never ordered at all, which is why `/collections` had no working Order control.
 *   They key on their own `collectionDate` instead.
 *
 * Sorting each family within its own slots preserves the page's structure: a text block or a
 * spacer stays exactly where the layout put it, and on a mixed page images do not migrate into
 * collection-tile positions.
 */

import { type AnyContentModel } from '@/app/types/Content';
import { type DateSortDirection } from '@/app/types/GalleryFilter';
import { isDateable, mergeDateSortedImages } from '@/app/utils/contentFilter';
import { isCollectionCard } from '@/app/utils/contentRatingUtils';
import { sortByDate } from '@/app/utils/sortByDate';

/** A collection card's own date, falling back to its creation time. */
function collectionDateOf(item: AnyContentModel): number {
  const card = item as { collectionDate?: string | null; createdAt?: string | null };
  const source = card.collectionDate ?? card.createdAt;
  return source ? new Date(source).getTime() : 0;
}

/** Sort collection cards chronologically by their own collection date. */
export function sortCollectionCardsByDate<T extends AnyContentModel>(
  cards: T[],
  direction: 'asc' | 'desc'
): T[] {
  return [...cards].sort((a, b) => {
    const dateA = collectionDateOf(a);
    const dateB = collectionDateOf(b);
    return direction === 'asc' ? dateA - dateB : dateB - dateA;
  });
}

/**
 * Re-interleave sorted collection cards back into their own slots, leaving every other block
 * (images, text, spacers) untouched. Mirrors {@link mergeDateSortedImages} for the card family.
 */
export function mergeSortedCollectionCards(
  processed: AnyContentModel[],
  sortedCards: AnyContentModel[]
): AnyContentModel[] {
  let index = 0;
  return processed.map(item => {
    if (!isCollectionCard(item)) return item;
    return sortedCards[index++] ?? item;
  });
}

/**
 * Apply the Order control to processed content. `off` returns the input untouched, preserving the
 * collection's curated orderIndex.
 *
 * @param processed - Content already through `processContentBlocks`
 * @param direction - Sort direction; `off` is a no-op
 */
export function applySort(
  processed: AnyContentModel[],
  direction: DateSortDirection
): AnyContentModel[] {
  if (direction === 'off') return processed;

  const sortedDateables = sortByDate(processed.filter(isDateable), direction);
  const sortedCards = sortCollectionCardsByDate(processed.filter(isCollectionCard), direction);

  return mergeSortedCollectionCards(mergeDateSortedImages(processed, sortedDateables), sortedCards);
}
