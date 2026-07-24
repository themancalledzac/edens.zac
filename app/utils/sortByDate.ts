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
