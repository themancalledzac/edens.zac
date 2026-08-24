import { type CollectionListModel } from '@/app/types/Collection';
import { compareNames } from '@/app/utils/sortByName';

/**
 * Newest collection first, undated ones last, ties broken by name.
 *
 * Dates are ISO `YYYY-MM-DD`, which sorts correctly as text, so no `Date` is constructed. Undated
 * collections sink rather than being dropped: some collections have no date concept at all, and a
 * list that hides them is worse than one that puts them at the end. `collectionDate` is optional on
 * {@link CollectionListModel}, so both null branches stay reachable whatever the backend sends.
 *
 * The name tie-break is {@link compareNames}, which is `sensitivity: 'base'` — "Alpha" and "alpha"
 * compare equal and `Array.prototype.sort`'s stability leaves them in the order they arrived. That
 * is the deliberate half of this helper. Both call sites previously did the same date arithmetic
 * but split here: `CollectionsPanel` already used `compareNames`, while `sortGroup`'s BLOG branch
 * in `CollectionListSelector` used a raw `localeCompare`, which orders a case difference rather
 * than tying it. `compareNames` won because it is the convention everywhere else a name is sorted
 * in this app, it has its own tests, and the two lists this now feeds show the SAME collections to
 * the same admin — a hub panel and a manage-page selector that disagree on where "alpha" sits is
 * the actual defect, not either ordering on its own.
 */
export function compareCollectionsNewestFirst(
  a: CollectionListModel,
  b: CollectionListModel
): number {
  const dateA = a.collectionDate ?? null;
  const dateB = b.collectionDate ?? null;
  if (dateA === null && dateB === null) return compareNames(a.name, b.name);
  if (dateA === null) return 1;
  if (dateB === null) return -1;
  return dateB.localeCompare(dateA);
}
