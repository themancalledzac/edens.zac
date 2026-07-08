import { type ContentCollectionModel } from '@/app/types/Content';
import { groupCollectionsByYear, UNDATED_YEAR } from '@/app/utils/groupCollectionsByYear';
import { createCollectionContent } from '@/tests/fixtures/contentFixtures';

const dated = (id: number, collectionDate: string, extra?: Partial<ContentCollectionModel>) =>
  createCollectionContent(id, { collectionDate, ...extra });

describe('groupCollectionsByYear', () => {
  it('returns an empty array for empty input', () => {
    expect(groupCollectionsByYear([])).toEqual([]);
  });

  it('groups a single year into one bucket', () => {
    const groups = groupCollectionsByYear([dated(1, '2026-01-01'), dated(2, '2026-06-15')]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.year).toBe('2026');
    expect(groups[0]?.collections).toHaveLength(2);
  });

  it('orders collections by collectionDate DESC within a year', () => {
    const groups = groupCollectionsByYear([
      dated(1, '2026-01-01'),
      dated(2, '2026-12-31'),
      dated(3, '2026-06-15'),
    ]);

    expect(groups[0]?.collections.map(c => c.id)).toEqual([2, 3, 1]);
  });

  it('emits year buckets newest-first across a year boundary', () => {
    const groups = groupCollectionsByYear([
      dated(1, '2024-05-01'),
      dated(2, '2026-03-01'),
      dated(3, '2025-08-01'),
    ]);

    expect(groups.map(g => g.year)).toEqual(['2026', '2025', '2024']);
    expect(groups.map(g => g.collections[0]?.id)).toEqual([2, 3, 1]);
  });

  it('places undated collections in a trailing Undated bucket, preserving input order', () => {
    const groups = groupCollectionsByYear([
      dated(1, '2026-01-01'),
      createCollectionContent(2, { collectionDate: undefined }),
      createCollectionContent(3, { collectionDate: undefined }),
    ]);

    expect(groups.map(g => g.year)).toEqual(['2026', UNDATED_YEAR]);
    const undatedGroup = groups.find(g => g.year === UNDATED_YEAR);
    expect(undatedGroup?.collections.map(c => c.id)).toEqual([2, 3]);
  });

  it('treats a malformed collectionDate as undated', () => {
    const groups = groupCollectionsByYear([
      dated(1, '2026-01-01'),
      createCollectionContent(2, { collectionDate: 'not-a-date' }),
    ]);

    expect(groups.map(g => g.year)).toEqual(['2026', UNDATED_YEAR]);
  });

  it('buckets a multi-day (range) collection by its start year, not its end year', () => {
    const groups = groupCollectionsByYear([
      dated(1, '2025-12-30', { collectionEndDate: '2026-01-02' }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.year).toBe('2025');
    expect(groups[0]?.collections[0]?.collectionEndDate).toBe('2026-01-02');
  });

  it('omits the Undated bucket entirely when every collection is dated', () => {
    const groups = groupCollectionsByYear([dated(1, '2026-01-01'), dated(2, '2025-01-01')]);

    expect(groups.map(g => g.year)).toEqual(['2026', '2025']);
    expect(groups.some(g => g.year === UNDATED_YEAR)).toBe(false);
  });
});
