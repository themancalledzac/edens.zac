/** Year grouping for the public /collections showcase. */

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
 * - A multi-day collection buckets by its START year; `collectionEndDate` affects only
 *   the rendered label.
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
