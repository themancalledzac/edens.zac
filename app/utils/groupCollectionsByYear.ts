/**
 * Sort and group collection content blocks by year for the public /collections showcase.
 *
 * Collections are ordered chronologically by `collectionDate` DESC (newest first),
 * with undated collections grouped last under a synthetic "Undated" bucket. Grouping
 * is by the calendar year of `collectionDate`; a multi-day collection is grouped by
 * its START year (`collectionDate`), and its `collectionEndDate` only affects the
 * rendered date label, not its bucket.
 */

import { type ContentCollectionModel } from '@/app/types/Content';
import { parseIsoDateParts } from '@/app/utils/formatDateRange';

/** Sentinel year key for collections with no `collectionDate`. */
export const UNDATED_YEAR = 'Undated';

/**
 * A year bucket of collection content blocks. `year` is the four-digit year string
 * (e.g. `"2026"`) for dated groups, or {@link UNDATED_YEAR} for the undated bucket.
 */
export interface CollectionYearGroup {
  year: string;
  collections: ContentCollectionModel[];
}

/**
 * Group collection content blocks into year buckets, newest first.
 *
 * - Dated collections sort by `collectionDate` DESC, then bucket by start year.
 *   Buckets are emitted in descending year order.
 * - Undated collections (no parseable `collectionDate`) are collected into a single
 *   trailing {@link UNDATED_YEAR} bucket, preserving their input order.
 * - Within a dated bucket, collections keep their DESC-by-date order.
 */
export function groupCollectionsByYear(
  collections: readonly ContentCollectionModel[]
): CollectionYearGroup[] {
  const dated: { year: number; collection: ContentCollectionModel }[] = [];
  const undated: ContentCollectionModel[] = [];

  for (const collection of collections) {
    const year = parseIsoDateParts(collection.collectionDate)?.year ?? null;
    if (year === null) {
      undated.push(collection);
    } else {
      dated.push({ year, collection });
    }
  }

  dated.sort((a, b) => {
    const dateA = a.collection.collectionDate ?? '';
    const dateB = b.collection.collectionDate ?? '';
    if (dateA < dateB) return 1;
    if (dateA > dateB) return -1;
    return 0;
  });

  const groups: CollectionYearGroup[] = [];
  let current: CollectionYearGroup | null = null;

  for (const { year, collection } of dated) {
    const yearKey = String(year);
    if (!current || current.year !== yearKey) {
      current = { year: yearKey, collections: [] };
      groups.push(current);
    }
    current.collections.push(collection);
  }

  if (undated.length > 0) {
    groups.push({ year: UNDATED_YEAR, collections: undated });
  }

  return groups;
}
