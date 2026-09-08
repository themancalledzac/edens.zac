/** @jest-environment node */
/**
 * `unionCollectionBlocks` and `countAssociatedCollections` — the two pure functions behind the
 * merged Collections section at `/user`.
 *
 * One list now holds every collection the user is associated with, by either route: an admin
 * granted it, or the user followed it. These two functions are what keep that list free of
 * duplicates and its badge honest; `loadUserSpace`'s own suites cover the reads either side.
 */

import {
  countAssociatedCollections,
  unionCollectionBlocks,
} from '@/app/components/UserSpace/userSpaceData';
import { type AnyContentModel, type ContentCollectionModel } from '@/app/types/Content';

/**
 * A COLLECTION block as `getUserPage()` sends it: `id` is the content-table row, and
 * `referencedCollectionId` is the collection it points at. The two differ by default here on
 * purpose, since that difference is what the dedup key has to cope with.
 */
function granted(
  referencedCollectionId: number,
  overrides: Partial<ContentCollectionModel> = {}
): ContentCollectionModel {
  return {
    contentType: 'COLLECTION',
    id: referencedCollectionId + 1000,
    referencedCollectionId,
    slug: `granted-${referencedCollectionId}`,
    title: `Granted ${referencedCollectionId}`,
    orderIndex: 0,
    visible: true,
    ...overrides,
  } as ContentCollectionModel;
}

/** A COLLECTION block as `toCollectionBlocks` builds it: `id` and `referencedCollectionId` match. */
function followed(
  collectionId: number,
  overrides: Partial<ContentCollectionModel> = {}
): ContentCollectionModel {
  return {
    contentType: 'COLLECTION',
    id: collectionId,
    referencedCollectionId: collectionId,
    slug: `followed-${collectionId}`,
    title: `Followed ${collectionId}`,
    orderIndex: 0,
    visible: true,
    ...overrides,
  } as ContentCollectionModel;
}

const image = (id: number): AnyContentModel =>
  ({
    contentType: 'IMAGE',
    id,
    imageUrl: `https://cdn/${id}.jpg`,
    orderIndex: 0,
  }) as AnyContentModel;

describe('unionCollectionBlocks', () => {
  it('keeps both halves when nothing overlaps', () => {
    const merged = unionCollectionBlocks([granted(1)], [followed(2)]);

    expect(merged.map(block => (block as ContentCollectionModel).referencedCollectionId)).toEqual([
      1, 2,
    ]);
  });

  /**
   * A collection held both ways is one association, so it draws one tile. The granted block wins:
   * it carries the page assembler's curated order and enrichment, which the catalog row does not.
   */
  it('renders a collection held both ways once, keeping the granted block', () => {
    const merged = unionCollectionBlocks([granted(7)], [followed(7)]);

    expect(merged).toHaveLength(1);
    expect((merged[0] as ContentCollectionModel).title).toBe('Granted 7');
  });

  /**
   * The dedup keys on `referencedCollectionId`, never `id`. A granted block's `id` is its
   * content-table row, while `toCollectionBlocks` sets `id` to the collection id — so keying on
   * `id` matches nothing across the two sides and draws the same collection twice.
   */
  it('dedups on referencedCollectionId even when the two blocks disagree on id', () => {
    const grantedBlock = granted(7, { id: 5001 });
    const followedBlock = followed(7);

    expect(grantedBlock.id).not.toBe(followedBlock.id);
    expect(grantedBlock.referencedCollectionId).toBe(followedBlock.referencedCollectionId);

    const merged = unionCollectionBlocks([grantedBlock], [followedBlock]);

    expect(merged).toHaveLength(1);
    expect((merged[0] as ContentCollectionModel).id).toBe(5001);
  });

  /**
   * Both inputs number themselves from zero, so a plain concat carries duplicate positions and the
   * grid sorts nondeterministically. Positions are reassigned across the whole result.
   */
  it('reassigns orderIndex sequentially across the merged result', () => {
    const merged = unionCollectionBlocks(
      [granted(1, { orderIndex: 0 }), granted(2, { orderIndex: 1 })],
      [followed(3, { orderIndex: 0 }), followed(4, { orderIndex: 1 })]
    );

    expect(merged.map(block => block.orderIndex)).toEqual([0, 1, 2, 3]);
  });

  it('renumbers from the merged length, not from either input length', () => {
    const merged = unionCollectionBlocks([granted(1)], [followed(1), followed(2), followed(3)]);

    expect(merged.map(block => block.orderIndex)).toEqual([0, 1, 2]);
  });

  it('passes non-collection blocks in granted through untouched', () => {
    const merged = unionCollectionBlocks([image(42), granted(1)], [followed(2)]);

    expect(merged[0]).toMatchObject({ contentType: 'IMAGE', id: 42 });
    expect(merged).toHaveLength(3);
  });

  it('never treats a non-collection block as a dedup key', () => {
    const merged = unionCollectionBlocks([image(7)], [followed(7)]);

    expect(merged).toHaveLength(2);
  });

  it('returns the granted half alone when nothing is followed', () => {
    const merged = unionCollectionBlocks([granted(1), granted(2)], []);

    expect(merged.map(block => (block as ContentCollectionModel).referencedCollectionId)).toEqual([
      1, 2,
    ]);
  });

  it('does not mutate its inputs', () => {
    const grantedBlocks = [granted(1, { orderIndex: 9 })];
    const followedBlocks = [followed(2, { orderIndex: 9 })];

    unionCollectionBlocks(grantedBlocks, followedBlocks);

    expect(grantedBlocks.map(block => block.orderIndex)).toEqual([9]);
    expect(followedBlocks.map(block => block.orderIndex)).toEqual([9]);
  });
});

describe('countAssociatedCollections', () => {
  it('counts the union of the two id sets', () => {
    expect(countAssociatedCollections([granted(1), granted(2)], [3, 4])).toBe(4);
  });

  /**
   * The badge counts associations, not routes into one. Collection 7 is both granted and followed,
   * so the honest total across {7, 8} and {7, 9} is three; adding the two sources would say four.
   */
  it('counts an association held both ways once', () => {
    expect(countAssociatedCollections([granted(7), granted(8)], [7, 9])).toBe(3);
  });

  /**
   * Counted from the ids rather than from `unionCollectionBlocks`' output, so it is right on the
   * tabs that never read the catalog. A followed collection that was deleted, or that falls past
   * the 500-row catalog page, is still one this user follows.
   */
  it('counts a followed id that has no block', () => {
    expect(countAssociatedCollections([], [7, 9, 404])).toBe(3);
  });

  it('counts the granted half when the follows list is empty', () => {
    expect(countAssociatedCollections([granted(1), granted(2)], [])).toBe(2);
  });

  it('ignores non-collection blocks', () => {
    expect(countAssociatedCollections([image(7), granted(1)], [])).toBe(1);
  });

  it('counts nothing when there is nothing', () => {
    expect(countAssociatedCollections([], [])).toBe(0);
  });
});
