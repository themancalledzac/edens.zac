import { type CollectionListModel } from '@/app/types/Collection';
import { compareCollectionsNewestFirst } from '@/app/utils/sortCollections';

const row = (id: number, name: string, collectionDate?: string | null): CollectionListModel => ({
  id,
  name,
  ...(collectionDate === undefined ? {} : { collectionDate }),
});

describe('compareCollectionsNewestFirst', () => {
  it('puts the newer collection first', () => {
    expect(
      compareCollectionsNewestFirst(row(1, 'Older', '2025-01-15'), row(2, 'Newer', '2025-06-01'))
    ).toBeGreaterThan(0);
  });

  /**
   * The dates are ISO `YYYY-MM-DD` and compared as text, so a two-digit month must not sort above a
   * one-digit one. Dates that straddle a year boundary are the case a naive numeric parse gets
   * wrong.
   */
  it('compares ISO dates as text without constructing a Date', () => {
    const sorted = [
      row(1, 'A', '2024-12-31'),
      row(2, 'B', '2025-01-01'),
      row(3, 'C', '2025-10-02'),
      row(4, 'D', '2025-09-30'),
    ].sort(compareCollectionsNewestFirst);
    expect(sorted.map(c => c.id)).toEqual([3, 4, 2, 1]);
  });

  it('sinks an undated collection below every dated one, whichever side it arrives on', () => {
    expect(compareCollectionsNewestFirst(row(1, 'A', null), row(2, 'B', '2025-01-01'))).toBe(1);
    expect(compareCollectionsNewestFirst(row(1, 'A', '2025-01-01'), row(2, 'B', null))).toBe(-1);
  });

  it('treats a missing collectionDate the same as an explicit null', () => {
    expect(compareCollectionsNewestFirst(row(1, 'A'), row(2, 'B', '2025-01-01'))).toBe(1);
  });

  it('breaks a tie between two undated collections by name', () => {
    expect(compareCollectionsNewestFirst(row(1, 'Bravo'), row(2, 'Alpha'))).toBeGreaterThan(0);
  });

  /**
   * The decision this helper exists to settle. `CollectionsPanel` sorted its name tie-break with
   * `compareNames` (`sensitivity: 'base'`) while `sortGroup`'s BLOG branch used a raw
   * `localeCompare`, which orders a pure case difference instead of tying it. `compareNames` won,
   * so "Alpha" and "alpha" compare EQUAL and `Array.prototype.sort`'s stability leaves them in the
   * order they arrived.
   *
   * Asserted in both input orders: an equal comparison is only observable as stability, and one
   * ordering alone cannot tell a genuine tie from a comparator that happens to agree.
   */
  it('ties two names that differ only in case, leaving their arrival order intact', () => {
    expect(compareCollectionsNewestFirst(row(1, 'Alpha'), row(2, 'alpha'))).toBe(0);
    expect(
      [row(1, 'Alpha'), row(2, 'alpha')].sort(compareCollectionsNewestFirst).map(c => c.id)
    ).toEqual([1, 2]);
    expect(
      [row(2, 'alpha'), row(1, 'Alpha')].sort(compareCollectionsNewestFirst).map(c => c.id)
    ).toEqual([2, 1]);
  });

  it('ties two names that differ only in accents', () => {
    expect(compareCollectionsNewestFirst(row(1, 'resume'), row(2, 'résumé'))).toBe(0);
  });

  it('sorts a mixed list newest first with the undated ones last, in name order', () => {
    const sorted = [
      row(1, 'Zulu'),
      row(2, 'Dolomites', '2025-06-01'),
      row(3, 'alpha'),
      row(4, 'Iceland', '2025-09-14'),
    ].sort(compareCollectionsNewestFirst);
    expect(sorted.map(c => c.id)).toEqual([4, 2, 3, 1]);
  });
});
