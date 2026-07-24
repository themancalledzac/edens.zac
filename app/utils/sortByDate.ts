import { type AnyContentModel } from '@/app/types/Content';
import { isDateable, mergeDateSortedImages } from '@/app/utils/contentFilter';

/**
 * Sorts dateable content (images or GIFs/MP4s with a captureDate) by captureDate. Uses createdAt
 * as a tiebreaker for same-day items (upload sequence approximates capture sequence; captureDate
 * has no intra-day precision).
 */
export function sortByDate<T extends { captureDate?: string | null; createdAt?: string | null }>(
  images: T[],
  direction: 'asc' | 'desc'
): T[] {
  return [...images].sort((a, b) => {
    const dateA = a.captureDate ? new Date(a.captureDate).getTime() : 0;
    const dateB = b.captureDate ? new Date(b.captureDate).getTime() : 0;
    if (dateA !== dateB) return direction === 'asc' ? dateA - dateB : dateB - dateA;

    const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return direction === 'asc' ? createdA - createdB : createdB - createdA;
  });
}

/**
 * The full ascending chronological order of already-processed content: dateable items (images +
 * dated GIFs) sorted by captureDate and re-interleaved into their slots; everything else left put.
 * This is exactly the order the public page shows for a CHRONOLOGICAL collection, so materializing
 * it into orderIndex makes an ORDERED collection match what the viewer saw.
 *
 * Note: if `processed` includes items hidden from the public view (e.g. the manage/edit path,
 * which passes filterVisible=false through processContentBlocks), hidden dateables still
 * participate in this sort, so the result can differ slightly from the public (visible-only) view
 * around non-dateable blocks.
 */
export function toChronologicalOrder<T extends AnyContentModel>(processed: T[]): T[] {
  const sorted = sortByDate(processed.filter(isDateable) as T[], 'asc');
  return mergeDateSortedImages(processed, sorted as AnyContentModel[]) as T[];
}
