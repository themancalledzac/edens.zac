/**
 * Characterization Tests for buildRows()
 *
 * These tests capture the CURRENT behavior of buildRows() as a regression safety net
 * for the Phase 1 template map refactor. They assert on:
 *
 * - Number of rows returned
 * - components array per row (which items, in what order)
 * - boxTree structure per row (full tree shape)
 * - patternName per row (will change in Phase 1 Step 6, but good to document)
 *
 * After the refactor, components and boxTree assertions should still pass.
 * patternName assertions will need updating when CombinationPattern is removed.
 */

import { LAYOUT } from '@/app/constants';
import type { ContentImageModel } from '@/app/types/Content';
import {
  acToBoxTree,
  buildRows,
  CombinationPattern,
  findDominant,
  getTemplateKey,
  hChain,
  hPair,
  lookupComposition,
  single,
  TEMPLATE_MAP,
  toImageType,
  vStack,
  type AtomicComponent,
  type BoxTree,
  type ImageType,
  type RowResult,
} from '@/app/utils/rowCombination';

// ===================== Test Fixtures =====================

const createImageContent = (
  id: number,
  overrides?: Partial<ContentImageModel>
): ContentImageModel => ({
  id,
  contentType: 'IMAGE',
  imageUrl: `/test/image-${id}.jpg`,
  imageWidth: 1920,
  imageHeight: 1080,
  aspectRatio: 1920 / 1080,
  rating: 0,
  orderIndex: id,
  ...overrides,
});

const H = (id: number, rating: number): ContentImageModel =>
  createImageContent(id, {
    imageWidth: 1920,
    imageHeight: 1080,
    aspectRatio: 1920 / 1080,
    rating,
  });

const V = (id: number, rating: number): ContentImageModel =>
  createImageContent(id, {
    imageWidth: 1080,
    imageHeight: 1920,
    aspectRatio: 1080 / 1920,
    rating,
  });

// ===================== Helpers =====================

const DESKTOP = LAYOUT.desktopSlotWidth; // 5

/** Extract the item IDs from a row's components, preserving order */
function rowIds(row: RowResult): number[] {
  return row.components.map(c => c.id);
}

/** Recursively extract leaf IDs from a BoxTree in left-to-right order */
function boxTreeLeafIds(tree: BoxTree): number[] {
  if (tree.type === 'leaf') {
    return [tree.content.id];
  }
  return [
    ...boxTreeLeafIds(tree.children[0]),
    ...boxTreeLeafIds(tree.children[1]),
  ];
}

/** Get a simplified representation of BoxTree structure for assertions */
function boxTreeShape(tree: BoxTree): string {
  if (tree.type === 'leaf') {
    return `L(${tree.content.id})`;
  }
  const dir = tree.direction === 'horizontal' ? 'H' : 'V';
  return `${dir}(${boxTreeShape(tree.children[0])},${boxTreeShape(tree.children[1])})`;
}

// ===================== Characterization Tests =====================

describe('buildRows characterization', () => {

  // ---------------------------------------------------------------
  // Test 1: Single H5★ — STANDALONE (trivial)
  // ---------------------------------------------------------------
  it('1: single H5★ → standalone row', () => {
    const items = [H(1, 5)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1]);
    expect(rows[0]!.patternName).toBe(CombinationPattern.STANDALONE);
    expect(rows[0]!.boxTree.type).toBe('leaf');
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('L(1)');
  });

  // ---------------------------------------------------------------
  // Test 2: V5★ + V5★ — VERTICAL_PAIR
  // V5★ effective=4, cv=2.5. 2×2.5=5.0, fill=100%
  // VERTICAL_PAIR: both vertical, same effective rating (4=4), within maxRating 4
  // ---------------------------------------------------------------
  it('2: V5★ + V5★ → VERTICAL_PAIR (100% fill)', () => {
    const items = [V(1, 5), V(2, 5)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2]);
    expect(rows[0]!.patternName).toBe(CombinationPattern.VERTICAL_PAIR);
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),L(2))');
  });

  // ---------------------------------------------------------------
  // Test 3: H3★ + H3★ — HORIZONTAL_PAIR check
  // H3★ cv=1.67, 2×1.67=3.34, fill=67% < 90% → pattern matches but isRowComplete fails
  // Falls to FORCE_FILL
  // ---------------------------------------------------------------
  it('3: H3★ + H3★ → FORCE_FILL (67% fill, below 90%)', () => {
    const items = [H(1, 3), H(2, 3)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2]);
    expect(rows[0]!.patternName).toBe(CombinationPattern.FORCE_FILL);
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),L(2))');
  });

  // ---------------------------------------------------------------
  // Test 4: V2★ + V2★ — VERTICAL_PAIR check
  // V2★ effective=1, cv=1.0. 2×1.0=2.0, fill=40% < 90%
  // Pattern matches (same effective rating) but isRowComplete fails → FORCE_FILL
  // ---------------------------------------------------------------
  it('4: V2★ + V2★ → FORCE_FILL (40% fill)', () => {
    const items = [V(1, 2), V(2, 2)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2]);
    expect(rows[0]!.patternName).toBe(CombinationPattern.FORCE_FILL);
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),L(2))');
  });

  // ---------------------------------------------------------------
  // Test 5: H4★ + V1★ + V1★ — DOMINANT_VERTICAL_PAIR
  // H4★ cv=2.5, V1★ effective=0 cv=1.0. Total=4.5, fill=90% ✓
  // ---------------------------------------------------------------
  it('5: H4★ + V1★ + V1★ → DVP (90% fill)', () => {
    const items = [H(1, 4), V(2, 1), V(3, 1)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3]);
    expect(rows[0]!.patternName).toBe(CombinationPattern.DOMINANT_VERTICAL_PAIR);
    // DVP: main | V(stacked1, stacked2)
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),V(L(2),L(3)))');
  });

  // ---------------------------------------------------------------
  // Test 6: H4★ + V2★ — DOMINANT_SECONDARY
  // H4★ cv=2.5, V2★ effective=1 cv=1.0. Total=3.5, fill=70% < 90%
  // Pattern matches but isRowComplete fails → FORCE_FILL
  // Actually let's check: H4★ meets dom req (H, minRating 4), V2★ eff=1 meets secondary (V, max 3)
  // fill = 70%, below 90% → FORCE_FILL
  // ---------------------------------------------------------------
  it('6: H4★ + V2★ → FORCE_FILL (70% fill)', () => {
    const items = [H(1, 4), V(2, 2)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2]);
    expect(rows[0]!.patternName).toBe(CombinationPattern.FORCE_FILL);
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),L(2))');
  });

  // ---------------------------------------------------------------
  // Test 7: H2★ + H2★ + H2★ — TRIPLE_HORIZONTAL check
  // H2★ cv=1.25, 3×1.25=3.75, fill=75% < 90% → isRowComplete fails
  // TRIPLE_HORIZONTAL needs rating 2-3 & proximity 0 → rating matches
  // But fill < 90% → FORCE_FILL
  // ---------------------------------------------------------------
  it('7: H2★ + H2★ + H2★ → FORCE_FILL (75% fill)', () => {
    const items = [H(1, 2), H(2, 2), H(3, 2)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3]);
    expect(rows[0]!.patternName).toBe(CombinationPattern.FORCE_FILL);
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(H(L(1),L(2)),L(3))');
  });

  // ---------------------------------------------------------------
  // Test 8: H1★ + V1★ + H1★ + V1★ + H1★ — MULTI_SMALL (5 items)
  // H1★ cv=1.0, V1★ effective=0 cv=1.0. All within maxRating 2.
  // MULTI_SMALL matches 3 items: minRating=0,maxRating=2, proximity=0, maxProximity=2
  // H1★ eff=1, V1★ eff=0 → difference=1 > proximity 0 → FAILS
  // Let me reconsider: ratingProximity=0 means all matched must be same rating
  // H1★ eff=1, V1★ eff=0 → difference 1 > 0 → pattern fails
  // All items eff ≤ 2 but not same rating → FORCE_FILL
  // 5×1.0=5.0, fill=100% ✓
  // ---------------------------------------------------------------
  it('8: H1★ + V1★ + H1★ + V1★ + H1★ → FORCE_FILL (mixed effective ratings)', () => {
    const items = [H(1, 1), V(2, 1), H(3, 1), V(4, 1), H(5, 1)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3, 4, 5]);
    expect(rows[0]!.patternName).toBe(CombinationPattern.FORCE_FILL);
    // 5 items → left-heavy chain: H(H(H(H(L(1),L(2)),L(3)),L(4)),L(5))
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(H(H(H(L(1),L(2)),L(3)),L(4)),L(5))');
  });

  // ---------------------------------------------------------------
  // Test 9: V1★ + H5★ + H3★ + H3★ — STANDALONE skip at position 0
  // V1★ effective=0, ≤ 2 threshold → skippable
  // STANDALONE looks at position 1: H5★ → match!
  // H5★ becomes standalone, V1★ stays for next row
  // ---------------------------------------------------------------
  it('9: V1★ + H5★ + H3★ + H3★ → STANDALONE skip, H5★ first row', () => {
    const items = [V(1, 1), H(2, 5), H(3, 3), H(4, 3)];
    const rows = buildRows(items, DESKTOP);

    // Row 1: H5★ standalone (skipped V1★)
    expect(rows[0]!.patternName).toBe(CombinationPattern.STANDALONE);
    expect(rowIds(rows[0]!)).toEqual([2]);
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('L(2)');

    // Remaining: V1★, H3★, H3★
    // V1★ cv=1.0, H3★ cv=1.67. Total=1.0+1.67+1.67=4.34, fill=87% < 90%
    // FORCE_FILL sequential
    expect(rows).toHaveLength(2);
    expect(rowIds(rows[1]!)).toEqual([1, 3, 4]);
    expect(rows[1]!.patternName).toBe(CombinationPattern.FORCE_FILL);
  });

  // ---------------------------------------------------------------
  // Test 10: V1★ + V2★ + H5★ — STANDALONE skip reaching position 2
  // V1★ eff=0, V2★ eff=1 → both ≤ 2 threshold
  // STANDALONE starts at position 1 (item0 ≤ 2), searches candidateWindow of 3
  // candidateWindow = [V2★, H5★] from position 1
  // H5★ at candidateWindow[1] matches → usedIndex = 1+1 = 2 in original window
  // ---------------------------------------------------------------
  it('10: V1★ + V2★ + H5★ → STANDALONE skip to position 2', () => {
    const items = [V(1, 1), V(2, 2), H(3, 5)];
    const rows = buildRows(items, DESKTOP);

    // Row 1: H5★ standalone (skipped past V1★ and V2★)
    expect(rows[0]!.patternName).toBe(CombinationPattern.STANDALONE);
    expect(rowIds(rows[0]!)).toEqual([3]);

    // Remaining: V1★, V2★
    expect(rows).toHaveLength(2);
    expect(rowIds(rows[1]!)).toEqual([1, 2]);
  });

  // ---------------------------------------------------------------
  // Test 11: 4 verticals (V3★, V1★, V1★, V1★) — Nested quad candidate
  // V3★ eff=2, V1★ eff=0. CVs: 1.25 + 1.0 + 1.0 + 1.0 = 4.25, fill=85%
  // No pattern matches → FORCE_FILL
  // 4 items, at least 3 verticals → nested quad detection
  // Main: V3★ (highest rating eff=2), top pair: two lowest (V1★, V1★), bottom: V1★
  // ---------------------------------------------------------------
  it('11: V3★ + V1★ + V1★ + V1★ → nested quad', () => {
    const items = [V(1, 3), V(2, 1), V(3, 1), V(4, 1)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3, 4]);
    expect(rows[0]!.patternName).toBe(CombinationPattern.FORCE_FILL);

    // Nested quad: main=V3★(id=1, eff=2), topPair=two lowest V1★s, bottom=remaining V1★
    const tree = rows[0]!.boxTree;
    expect(tree.type).toBe('combined');
    if (tree.type === 'combined') {
      expect(tree.direction).toBe('horizontal');
      // Main is highest-rated vertical = V3★ (id=1)
      expect(tree.children[0].type).toBe('leaf');
      if (tree.children[0].type === 'leaf') {
        expect(tree.children[0].content.id).toBe(1);
      }
      // Right side: V(H(topPair), bottom)
      expect(tree.children[1].type).toBe('combined');
      if (tree.children[1].type === 'combined') {
        expect(tree.children[1].direction).toBe('vertical');
        expect(tree.children[1].children[0].type).toBe('combined'); // top pair
        expect(tree.children[1].children[1].type).toBe('leaf'); // bottom
      }
    }
  });

  // ---------------------------------------------------------------
  // Test 12: 10 mixed images — realistic collection
  // ---------------------------------------------------------------
  it('12: 10 mixed images — realistic collection end-to-end', () => {
    const items = [
      H(1, 5),  // cv=5.0
      H(2, 4),  // cv=2.5
      V(3, 3),  // eff=2, cv=1.25
      V(4, 3),  // eff=2, cv=1.25
      H(5, 3),  // cv=1.67
      H(6, 3),  // cv=1.67
      H(7, 3),  // cv=1.67
      V(8, 1),  // eff=0, cv=1.0
      H(9, 2),  // cv=1.25
      V(10, 2), // eff=1, cv=1.0
    ];
    const rows = buildRows(items, DESKTOP);

    // Every item should appear exactly once
    const allIds = rows.flatMap(r => rowIds(r)).sort((a, b) => a - b);
    expect(allIds).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    // Row 1: H5★ standalone
    expect(rows[0]!.patternName).toBe(CombinationPattern.STANDALONE);
    expect(rowIds(rows[0]!)).toEqual([1]);

    // Row 2: H4★ + V3★ + V3★ → DVP (2.5+1.25+1.25=5.0, 100%)
    expect(rows[1]!.patternName).toBe(CombinationPattern.DOMINANT_VERTICAL_PAIR);
    expect(rowIds(rows[1]!)).toEqual([2, 3, 4]);

    // Row 3: H3★ + H3★ + H3★ → TRIPLE_HORIZONTAL (1.67×3=5.0, 100%)
    expect(rows[2]!.patternName).toBe(CombinationPattern.TRIPLE_HORIZONTAL);
    expect(rowIds(rows[2]!)).toEqual([5, 6, 7]);

    // Row 4: remaining V1★ + H2★ + V2★ → FORCE_FILL
    expect(rows[3]!.patternName).toBe(CombinationPattern.FORCE_FILL);
    expect(rowIds(rows[3]!)).toEqual([8, 9, 10]);
  });

  // ---------------------------------------------------------------
  // Test 13: All 3★ images (uniform rating, degenerate case)
  // ---------------------------------------------------------------
  it('13: all 3★ images (uniform rating)', () => {
    const items = [
      H(1, 3), H(2, 3), H(3, 3),
      H(4, 3), H(5, 3), H(6, 3),
    ];
    const rows = buildRows(items, DESKTOP);

    // H3★ cv=1.67. 3×1.67=5.0 → 100% → row complete
    // TRIPLE_HORIZONTAL: 3 H3★ with same rating, proximity 0 ✓
    expect(rows).toHaveLength(2);
    expect(rows[0]!.patternName).toBe(CombinationPattern.TRIPLE_HORIZONTAL);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3]);
    expect(rows[1]!.patternName).toBe(CombinationPattern.TRIPLE_HORIZONTAL);
    expect(rowIds(rows[1]!)).toEqual([4, 5, 6]);
  });

  // ---------------------------------------------------------------
  // Test 14: Single V1★ (leftovers / final row)
  // ---------------------------------------------------------------
  it('14: single V1★ → single-item FORCE_FILL', () => {
    const items = [V(1, 1)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1]);
    expect(rows[0]!.patternName).toBe(CombinationPattern.FORCE_FILL);
    expect(rows[0]!.boxTree.type).toBe('leaf');
  });

  // ---------------------------------------------------------------
  // Test 15: H4★ + H3★ + V1★ + H2★ + V1★ — DVP matches
  // H4★ (dom, minRating 4 ✓), H3★ (eff=3, max 3 ✓), V1★ (eff=0, max 3 ✓)
  // cv: 2.5 + 1.67 + 1.0 = 5.17, fill=103% ✓
  // DVP matches with contiguous [0,1,2]
  // ---------------------------------------------------------------
  it('15: H4★ + H3★ + V1★ + H2★ + V1★ → DVP first row', () => {
    const items = [H(1, 4), H(2, 3), V(3, 1), H(4, 2), V(5, 1)];
    const rows = buildRows(items, DESKTOP);

    // Row 1: H4★ + H3★ + V1★ → DOMINANT_VERTICAL_PAIR
    expect(rows[0]!.patternName).toBe(CombinationPattern.DOMINANT_VERTICAL_PAIR);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3]);
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),V(L(2),L(3)))');

    // Remaining: H2★ + V1★ → FORCE_FILL
    expect(rows[1]!.patternName).toBe(CombinationPattern.FORCE_FILL);
    expect(rowIds(rows[1]!)).toEqual([4, 5]);

    // All items used
    const allIds = rows.flatMap(r => rowIds(r)).sort((a, b) => a - b);
    expect(allIds).toEqual([1, 2, 3, 4, 5]);
  });

  // ---------------------------------------------------------------
  // Test 16: forceCompleteRow best-fit fallback test
  // H3★ + V1★ + V1★ + H3★ — tests whether best-fit reorders
  // H3★ cv=1.67, V1★ cv=1.0
  // Sequential: 1.67+1.0=2.67 (53%), +1.0=3.67 (73%), +1.67=5.34 (107%) ✓
  // Sequential completes → no best-fit needed
  // ---------------------------------------------------------------
  it('16: H3★ + V1★ + V1★ + H3★ → sequential fill (no best-fit needed)', () => {
    const items = [H(1, 3), V(2, 1), V(3, 1), H(4, 3)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3, 4]);
    expect(rows[0]!.patternName).toBe(CombinationPattern.FORCE_FILL);
  });

  // ---------------------------------------------------------------
  // Test 17: Best-fit divergence — V4★ + H3★ + H4★ + H1★
  // V4★ eff=3 cv=1.67, H3★ cv=1.67, H4★ cv=2.5, H1★ cv=1.0
  // Sequential: 1.67+1.67=3.34 (67%), +2.5=5.84 (117%) > 115% → fails
  // At 67% < 90% → best-fit kicks in
  // Takes V4★(0), then best-fit for gap 3.33: H4★(2, cv=2.5, dist=0.83) → total=4.17
  // Then best-fit for gap 0.83: H1★(3, cv=1.0, dist=0.17) → total=5.17 (103%) ✓
  // ---------------------------------------------------------------
  it('17: best-fit fallback — V4★ + H3★ + H4★ + H1★', () => {
    const items = [V(1, 4), H(2, 3), H(3, 4), H(4, 1)];
    const rows = buildRows(items, DESKTOP);

    expect(rows[0]!.patternName).toBe(CombinationPattern.FORCE_FILL);
    // Best-fit selects items [0, 2, 3] skipping H3★(1)
    expect(rowIds(rows[0]!)).toContain(1); // V4★ always first
    expect(rowIds(rows[0]!)).toContain(3); // H4★ best fit
    expect(rowIds(rows[0]!)).toContain(4); // H1★ best fit
    expect(rows[0]!.components).toHaveLength(3);

    // H3★ should be in second row
    const allIds = rows.flatMap(r => rowIds(r)).sort((a, b) => a - b);
    expect(allIds).toEqual([1, 2, 3, 4]);
  });

  // ---------------------------------------------------------------
  // Test 18: H4★ + H4★ — HORIZONTAL_PAIR (100% fill)
  // ---------------------------------------------------------------
  it('18: H4★ + H4★ → HORIZONTAL_PAIR (100% fill)', () => {
    const items = [H(1, 4), H(2, 4)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2]);
    expect(rows[0]!.patternName).toBe(CombinationPattern.HORIZONTAL_PAIR);
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),L(2))');
  });

  // ---------------------------------------------------------------
  // Test 19: H4★ + V3★ + V3★ — DOMINANT_VERTICAL_PAIR (100% fill)
  // ---------------------------------------------------------------
  it('19: H4★ + V3★ + V3★ → DVP (100% fill)', () => {
    const items = [H(1, 4), V(2, 3), V(3, 3)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3]);
    expect(rows[0]!.patternName).toBe(CombinationPattern.DOMINANT_VERTICAL_PAIR);
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),V(L(2),L(3)))');
  });

  // ---------------------------------------------------------------
  // Test 20: 5 H1★ images — MULTI_SMALL match
  // H1★ cv=1.0, all same rating (eff=1), proximity=0 ✓
  // 3×1.0=3.0, fill=60% < 90% → isRowComplete fails for 3
  // 5×1.0=5.0, fill=100% but MULTI_SMALL matches 3 items
  // So pattern matches but row incomplete → FORCE_FILL takes 5
  // ---------------------------------------------------------------
  it('20: 5 H1★ images → FORCE_FILL (MULTI_SMALL fails fill check)', () => {
    const items = [H(1, 1), H(2, 1), H(3, 1), H(4, 1), H(5, 1)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3, 4, 5]);
    expect(rows[0]!.patternName).toBe(CombinationPattern.FORCE_FILL);
  });

  // ---------------------------------------------------------------
  // Test 21: Large mixed collection — 15 images
  // ---------------------------------------------------------------
  it('21: large mixed collection (15 images) — all items consumed', () => {
    const items = [
      H(1, 5),  // standalone
      H(2, 4), V(3, 3), V(4, 3),  // DVP
      H(5, 3), H(6, 3), H(7, 3),  // triple
      V(8, 2), V(9, 2),           // vertical pair (fill too low)
      H(10, 1), V(11, 1), H(12, 1), V(13, 1), H(14, 1),
      H(15, 2),
    ];
    const rows = buildRows(items, DESKTOP);

    // All 15 items consumed
    const allIds = rows.flatMap(r => rowIds(r)).sort((a, b) => a - b);
    expect(allIds).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

    // First row should be H5★ standalone
    expect(rows[0]!.patternName).toBe(CombinationPattern.STANDALONE);
    expect(rowIds(rows[0]!)).toEqual([1]);
  });

  // ---------------------------------------------------------------
  // Test 22: Verify BoxTree structure faithfulness across patterns
  // ---------------------------------------------------------------
  it('23: boxTree leaf IDs match component IDs for all rows', () => {
    const items = [
      H(1, 5),
      H(2, 4), V(3, 3), V(4, 3),
      H(5, 3), H(6, 3), H(7, 3),
      V(8, 1), H(9, 2), V(10, 2),
    ];
    const rows = buildRows(items, DESKTOP);

    for (const row of rows) {
      const componentIds = rowIds(row);
      const leafIds = boxTreeLeafIds(row.boxTree);
      // BoxTree leaves should contain exactly the same items as components
      // (order may differ for nested-quad, but content should match)
      expect(leafIds.sort((a, b) => a - b)).toEqual(
        componentIds.sort((a, b) => a - b)
      );
    }
  });
});

// ===================== Architecture Type Tests =====================

describe('architecture types', () => {

  describe('toImageType', () => {
    it('should convert horizontal image to ImageType with ar=H', () => {
      const item = H(1, 4);
      const img = toImageType(item, DESKTOP);

      expect(img.source).toBe(item);
      expect(img.ar).toBe('H');
      expect(img.effectiveRating).toBe(4); // horizontal, no penalty
      expect(img.componentValue).toBeCloseTo(2.5); // 5/(5-4+1) = 2.5
    });

    it('should convert vertical image with penalty', () => {
      const item = V(2, 3);
      const img = toImageType(item, DESKTOP);

      expect(img.source).toBe(item);
      expect(img.ar).toBe('V');
      expect(img.effectiveRating).toBe(2); // V3★ → eff 2 (vertical penalty)
      expect(img.componentValue).toBeCloseTo(1.25); // 5/(5-2+1) = 1.25
    });

    it('should handle V1★ → effective 0', () => {
      const item = V(3, 1);
      const img = toImageType(item, DESKTOP);

      expect(img.ar).toBe('V');
      expect(img.effectiveRating).toBe(0);
      expect(img.componentValue).toBeCloseTo(1.0); // 5/(5-0) clamped
    });

    it('should preserve source reference', () => {
      const item = H(5, 5);
      const img = toImageType(item, DESKTOP);
      expect(img.source).toBe(item); // Same object reference
    });
  });

  describe('AtomicComponent builders', () => {
    const makeImg = (id: number, ar: 'H' | 'V', rating: number): ImageType => {
      const item = ar === 'H' ? H(id, rating) : V(id, rating);
      return toImageType(item, DESKTOP);
    };

    it('single() creates a single-type node', () => {
      const img = makeImg(1, 'H', 5);
      const ac = single(img);
      expect(ac.type).toBe('single');
      if (ac.type === 'single') {
        expect(ac.img).toBe(img);
      }
    });

    it('hPair() creates horizontal pair', () => {
      const a = single(makeImg(1, 'H', 3));
      const b = single(makeImg(2, 'V', 2));
      const ac = hPair(a, b);

      expect(ac.type).toBe('pair');
      if (ac.type === 'pair') {
        expect(ac.direction).toBe('H');
        expect(ac.children[0]).toBe(a);
        expect(ac.children[1]).toBe(b);
      }
    });

    it('vStack() creates vertical pair', () => {
      const a = single(makeImg(1, 'V', 2));
      const b = single(makeImg(2, 'V', 2));
      const ac = vStack(a, b);

      expect(ac.type).toBe('pair');
      if (ac.type === 'pair') {
        expect(ac.direction).toBe('V');
        expect(ac.children[0]).toBe(a);
        expect(ac.children[1]).toBe(b);
      }
    });

    it('hChain(2) creates H(a, b)', () => {
      const imgs = [makeImg(1, 'H', 3), makeImg(2, 'H', 3)];
      const ac = hChain(imgs);

      expect(ac.type).toBe('pair');
      if (ac.type === 'pair') {
        expect(ac.direction).toBe('H');
        expect(ac.children[0].type).toBe('single');
        expect(ac.children[1].type).toBe('single');
      }
    });

    it('hChain(3) creates left-heavy H(H(a,b), c)', () => {
      const imgs = [makeImg(1, 'H', 3), makeImg(2, 'H', 3), makeImg(3, 'H', 3)];
      const ac = hChain(imgs);

      expect(ac.type).toBe('pair');
      if (ac.type === 'pair') {
        expect(ac.direction).toBe('H');
        // Left child is a pair
        expect(ac.children[0].type).toBe('pair');
        // Right child is single
        expect(ac.children[1].type).toBe('single');
      }
    });

    it('hChain(1) returns a single node', () => {
      const imgs = [makeImg(1, 'H', 5)];
      const ac = hChain(imgs);
      expect(ac.type).toBe('single');
    });

    it('hChain(0) throws', () => {
      expect(() => hChain([])).toThrow();
    });

    it('can compose DVP structure: H(main, V(sec1, sec2))', () => {
      const main = makeImg(1, 'H', 4);
      const sec1 = makeImg(2, 'V', 3);
      const sec2 = makeImg(3, 'V', 3);

      const ac = hPair(single(main), vStack(single(sec1), single(sec2)));
      expect(ac.type).toBe('pair');
      if (ac.type === 'pair') {
        expect(ac.direction).toBe('H');
        expect(ac.children[1].type).toBe('pair');
        if (ac.children[1].type === 'pair') {
          expect(ac.children[1].direction).toBe('V');
        }
      }
    });

    it('can compose nested-quad: H(main, V(H(a,b), bottom))', () => {
      const main = makeImg(1, 'V', 4);
      const a = makeImg(2, 'V', 1);
      const b = makeImg(3, 'V', 1);
      const bottom = makeImg(4, 'H', 3);

      const ac = hPair(
        single(main),
        vStack(
          hPair(single(a), single(b)),
          single(bottom)
        )
      );

      expect(ac.type).toBe('pair');
      if (ac.type === 'pair') {
        expect(ac.direction).toBe('H');
        expect(ac.children[0].type).toBe('single'); // main
        expect(ac.children[1].type).toBe('pair');    // V(H(a,b), bottom)
        if (ac.children[1].type === 'pair') {
          expect(ac.children[1].direction).toBe('V');
          expect(ac.children[1].children[0].type).toBe('pair'); // H(a,b)
          expect(ac.children[1].children[1].type).toBe('single'); // bottom
        }
      }
    });
  });

  describe('acToBoxTree', () => {
    const makeImg = (id: number, ar: 'H' | 'V', rating: number): ImageType => {
      const item = ar === 'H' ? H(id, rating) : V(id, rating);
      return toImageType(item, DESKTOP);
    };

    it('converts single to leaf', () => {
      const img = makeImg(1, 'H', 5);
      const bt = acToBoxTree(single(img));

      expect(bt.type).toBe('leaf');
      if (bt.type === 'leaf') {
        expect(bt.content).toBe(img.source);
      }
    });

    it('converts hPair to horizontal combined', () => {
      const a = makeImg(1, 'H', 4);
      const b = makeImg(2, 'H', 4);
      const bt = acToBoxTree(hPair(single(a), single(b)));

      expect(bt.type).toBe('combined');
      if (bt.type === 'combined') {
        expect(bt.direction).toBe('horizontal');
        expect(bt.children[0].type).toBe('leaf');
        expect(bt.children[1].type).toBe('leaf');
      }
    });

    it('converts vStack to vertical combined', () => {
      const a = makeImg(1, 'V', 3);
      const b = makeImg(2, 'V', 3);
      const bt = acToBoxTree(vStack(single(a), single(b)));

      expect(bt.type).toBe('combined');
      if (bt.type === 'combined') {
        expect(bt.direction).toBe('vertical');
      }
    });

    it('converts DVP structure and preserves source references', () => {
      const mainItem = H(1, 4);
      const sec1Item = V(2, 3);
      const sec2Item = V(3, 3);

      const main = toImageType(mainItem, DESKTOP);
      const sec1 = toImageType(sec1Item, DESKTOP);
      const sec2 = toImageType(sec2Item, DESKTOP);

      const ac = hPair(single(main), vStack(single(sec1), single(sec2)));
      const bt = acToBoxTree(ac);

      expect(bt.type).toBe('combined');
      if (bt.type === 'combined') {
        expect(bt.direction).toBe('horizontal');
        // Left: main leaf
        if (bt.children[0].type === 'leaf') {
          expect(bt.children[0].content).toBe(mainItem);
        }
        // Right: vertical combined
        if (bt.children[1].type === 'combined') {
          expect(bt.children[1].direction).toBe('vertical');
          if (bt.children[1].children[0].type === 'leaf') {
            expect(bt.children[1].children[0].content).toBe(sec1Item);
          }
          if (bt.children[1].children[1].type === 'leaf') {
            expect(bt.children[1].children[1].content).toBe(sec2Item);
          }
        }
      }
    });

    it('produces same shape as createBoxTreeFromPattern for hChain(3)', () => {
      const imgs = [makeImg(1, 'H', 3), makeImg(2, 'H', 3), makeImg(3, 'H', 3)];
      const bt = acToBoxTree(hChain(imgs));

      // Should match: H(H(L(1),L(2)),L(3))
      expect(boxTreeShape(bt)).toBe('H(H(L(1),L(2)),L(3))');
    });
  });

  describe('findDominant', () => {
    const makeImg = (id: number, ar: 'H' | 'V', rating: number): ImageType => {
      const item = ar === 'H' ? H(id, rating) : V(id, rating);
      return toImageType(item, DESKTOP);
    };

    it('finds the highest effective rating image', () => {
      const imgs = [makeImg(1, 'V', 2), makeImg(2, 'H', 4), makeImg(3, 'V', 3)];
      const { dominant, rest } = findDominant(imgs);

      expect(dominant.source.id).toBe(2); // H4★ eff=4 is highest
      expect(rest).toHaveLength(2);
      expect(rest.map(i => i.source.id)).toEqual([1, 3]);
    });

    it('returns first when tied', () => {
      const imgs = [makeImg(1, 'H', 3), makeImg(2, 'H', 3)];
      const { dominant } = findDominant(imgs);
      expect(dominant.source.id).toBe(1); // first wins tie
    });

    it('works with single image', () => {
      const imgs = [makeImg(1, 'H', 5)];
      const { dominant, rest } = findDominant(imgs);
      expect(dominant.source.id).toBe(1);
      expect(rest).toHaveLength(0);
    });

    it('throws on empty array', () => {
      expect(() => findDominant([])).toThrow();
    });
  });

  describe('getTemplateKey', () => {
    const makeImg = (id: number, ar: 'H' | 'V', rating: number): ImageType => {
      const item = ar === 'H' ? H(id, rating) : V(id, rating);
      return toImageType(item, DESKTOP);
    };

    it('counts H and V orientations', () => {
      expect(getTemplateKey([makeImg(1, 'H', 3)])).toBe('1-0');
      expect(getTemplateKey([makeImg(1, 'V', 3)])).toBe('0-1');
      expect(getTemplateKey([makeImg(1, 'H', 3), makeImg(2, 'V', 2)])).toBe('1-1');
      expect(getTemplateKey([makeImg(1, 'H', 3), makeImg(2, 'H', 3)])).toBe('2-0');
    });

    it('handles mixed collections', () => {
      const imgs = [
        makeImg(1, 'H', 4),
        makeImg(2, 'V', 3),
        makeImg(3, 'V', 3),
      ];
      expect(getTemplateKey(imgs)).toBe('1-2');
    });

    it('handles 5-item row', () => {
      const imgs = [
        makeImg(1, 'H', 1), makeImg(2, 'V', 1),
        makeImg(3, 'H', 1), makeImg(4, 'V', 1),
        makeImg(5, 'H', 1),
      ];
      expect(getTemplateKey(imgs)).toBe('3-2');
    });
  });

  describe('TEMPLATE_MAP', () => {
    it('has entries for all 1-item keys', () => {
      expect(TEMPLATE_MAP['1-0']).toBeDefined();
      expect(TEMPLATE_MAP['0-1']).toBeDefined();
    });

    it('has entries for all 2-item keys', () => {
      expect(TEMPLATE_MAP['2-0']).toBeDefined();
      expect(TEMPLATE_MAP['1-1']).toBeDefined();
      expect(TEMPLATE_MAP['0-2']).toBeDefined();
    });

    it('has entries for all 3-item keys', () => {
      expect(TEMPLATE_MAP['3-0']).toBeDefined();
      expect(TEMPLATE_MAP['2-1']).toBeDefined();
      expect(TEMPLATE_MAP['1-2']).toBeDefined();
      expect(TEMPLATE_MAP['0-3']).toBeDefined();
    });

    it('has entries for all 4-item keys', () => {
      expect(TEMPLATE_MAP['4-0']).toBeDefined();
      expect(TEMPLATE_MAP['3-1']).toBeDefined();
      expect(TEMPLATE_MAP['2-2']).toBeDefined();
      expect(TEMPLATE_MAP['1-3']).toBeDefined();
      expect(TEMPLATE_MAP['0-4']).toBeDefined();
    });

    it('has entries for all 5-item keys', () => {
      expect(TEMPLATE_MAP['5-0']).toBeDefined();
      expect(TEMPLATE_MAP['4-1']).toBeDefined();
      expect(TEMPLATE_MAP['3-2']).toBeDefined();
      expect(TEMPLATE_MAP['2-3']).toBeDefined();
      expect(TEMPLATE_MAP['1-4']).toBeDefined();
      expect(TEMPLATE_MAP['0-5']).toBeDefined();
    });

    it('has 20 total entries (all combos for 1-5 items)', () => {
      // 1-item: 2, 2-item: 3, 3-item: 4, 4-item: 5, 5-item: 6 = 20
      expect(Object.keys(TEMPLATE_MAP)).toHaveLength(20);
    });

    it('every entry has a label and build function', () => {
      for (const [, template] of Object.entries(TEMPLATE_MAP)) {
        expect(template.label).toBeTruthy();
        expect(typeof template.build).toBe('function');
      }
    });
  });

  describe('TEMPLATE_MAP build functions', () => {
    const makeImg = (id: number, ar: 'H' | 'V', rating: number): ImageType => {
      const item = ar === 'H' ? H(id, rating) : V(id, rating);
      return toImageType(item, DESKTOP);
    };

    it('1-0 (hero) → single leaf', () => {
      const imgs = [makeImg(1, 'H', 5)];
      const ac = TEMPLATE_MAP['1-0']!.build(imgs);
      expect(ac.type).toBe('single');
      expect(boxTreeShape(acToBoxTree(ac))).toBe('L(1)');
    });

    it('0-1 (single-v) → single leaf', () => {
      const imgs = [makeImg(1, 'V', 1)];
      const ac = TEMPLATE_MAP['0-1']!.build(imgs);
      expect(ac.type).toBe('single');
      expect(boxTreeShape(acToBoxTree(ac))).toBe('L(1)');
    });

    it('2-0 (h-pair) → H(L,L)', () => {
      const imgs = [makeImg(1, 'H', 4), makeImg(2, 'H', 4)];
      const ac = TEMPLATE_MAP['2-0']!.build(imgs);
      expect(boxTreeShape(acToBoxTree(ac))).toBe('H(L(1),L(2))');
    });

    it('1-1 (dom-sec) → H(L,L)', () => {
      const imgs = [makeImg(1, 'H', 4), makeImg(2, 'V', 2)];
      const ac = TEMPLATE_MAP['1-1']!.build(imgs);
      expect(boxTreeShape(acToBoxTree(ac))).toBe('H(L(1),L(2))');
    });

    it('0-2 (v-pair) → H(L,L)', () => {
      const imgs = [makeImg(1, 'V', 5), makeImg(2, 'V', 5)];
      const ac = TEMPLATE_MAP['0-2']!.build(imgs);
      expect(boxTreeShape(acToBoxTree(ac))).toBe('H(L(1),L(2))');
    });

    it('3-0 (triple-h) → H(H(L,L),L)', () => {
      const imgs = [makeImg(1, 'H', 3), makeImg(2, 'H', 3), makeImg(3, 'H', 3)];
      const ac = TEMPLATE_MAP['3-0']!.build(imgs);
      expect(boxTreeShape(acToBoxTree(ac))).toBe('H(H(L(1),L(2)),L(3))');
    });

    it('2-1 with dominant H4★ → DVP structure H(dom, V(rest0, rest1))', () => {
      const imgs = [makeImg(1, 'H', 4), makeImg(2, 'H', 3), makeImg(3, 'V', 1)];
      const ac = TEMPLATE_MAP['2-1']!.build(imgs);
      // H4★ is dominant (eff=4, H) → DVP
      expect(boxTreeShape(acToBoxTree(ac))).toBe('H(L(1),V(L(2),L(3)))');
    });

    it('2-1 without dominant → flat chain', () => {
      const imgs = [makeImg(1, 'H', 2), makeImg(2, 'H', 2), makeImg(3, 'V', 1)];
      const ac = TEMPLATE_MAP['2-1']!.build(imgs);
      // No image has eff >= 4 → flat chain
      expect(boxTreeShape(acToBoxTree(ac))).toBe('H(H(L(1),L(2)),L(3))');
    });

    it('1-2 with dominant H4★ → DVP structure', () => {
      const imgs = [makeImg(1, 'H', 4), makeImg(2, 'V', 3), makeImg(3, 'V', 3)];
      const ac = TEMPLATE_MAP['1-2']!.build(imgs);
      expect(boxTreeShape(acToBoxTree(ac))).toBe('H(L(1),V(L(2),L(3)))');
    });

    it('1-2 without dominant → flat chain', () => {
      const imgs = [makeImg(1, 'H', 3), makeImg(2, 'V', 3), makeImg(3, 'V', 3)];
      const ac = TEMPLATE_MAP['1-2']!.build(imgs);
      expect(boxTreeShape(acToBoxTree(ac))).toBe('H(H(L(1),L(2)),L(3))');
    });

    it('0-3 → flat chain', () => {
      const imgs = [makeImg(1, 'V', 2), makeImg(2, 'V', 2), makeImg(3, 'V', 2)];
      const ac = TEMPLATE_MAP['0-3']!.build(imgs);
      expect(boxTreeShape(acToBoxTree(ac))).toBe('H(H(L(1),L(2)),L(3))');
    });

    it('0-4 with 4 verticals → nested quad', () => {
      const imgs = [
        makeImg(1, 'V', 3), // eff=2, dominant
        makeImg(2, 'V', 1), // eff=0
        makeImg(3, 'V', 1), // eff=0
        makeImg(4, 'V', 1), // eff=0
      ];
      const ac = TEMPLATE_MAP['0-4']!.build(imgs);
      const bt = acToBoxTree(ac);
      // Main = V3★ (id=1, highest eff), topPair = two lowest V1★s, bottom = remaining V1★
      expect(bt.type).toBe('combined');
      if (bt.type === 'combined') {
        expect(bt.direction).toBe('horizontal');
        // Left = main (V3★)
        if (bt.children[0].type === 'leaf') {
          expect(bt.children[0].content.id).toBe(1);
        }
        // Right = V(H(topPair), bottom)
        expect(bt.children[1].type).toBe('combined');
        if (bt.children[1].type === 'combined') {
          expect(bt.children[1].direction).toBe('vertical');
          expect(bt.children[1].children[0].type).toBe('combined'); // H(topPair)
          expect(bt.children[1].children[1].type).toBe('leaf');     // bottom
        }
      }
    });

    it('1-3 with 3 verticals → nested quad', () => {
      const imgs = [
        makeImg(1, 'V', 4), // eff=3, dominant vertical
        makeImg(2, 'V', 1), // eff=0
        makeImg(3, 'V', 1), // eff=0
        makeImg(4, 'H', 2), // H, non-vertical
      ];
      const ac = TEMPLATE_MAP['1-3']!.build(imgs);
      const bt = acToBoxTree(ac);
      expect(bt.type).toBe('combined');
      if (bt.type === 'combined') {
        expect(bt.direction).toBe('horizontal');
        // Main = V4★ (id=1)
        if (bt.children[0].type === 'leaf') {
          expect(bt.children[0].content.id).toBe(1);
        }
      }
    });

    it('1-3 with only 2 verticals → flat chain', () => {
      // This can't actually happen (1-3 means 1H + 3V = 3 verticals)
      // but buildNestedQuad handles it defensively with hChain fallback
      // We test with 4-0 which would never hit nested quad
      const imgs = [makeImg(1, 'H', 2), makeImg(2, 'H', 2), makeImg(3, 'H', 2), makeImg(4, 'H', 2)];
      const ac = TEMPLATE_MAP['4-0']!.build(imgs);
      expect(boxTreeShape(acToBoxTree(ac))).toBe('H(H(H(L(1),L(2)),L(3)),L(4))');
    });

    it('5-item chains all produce left-heavy trees', () => {
      const fiveH = [makeImg(1,'H',1), makeImg(2,'H',1), makeImg(3,'H',1), makeImg(4,'H',1), makeImg(5,'H',1)];
      const ac = TEMPLATE_MAP['5-0']!.build(fiveH);
      expect(boxTreeShape(acToBoxTree(ac))).toBe('H(H(H(H(L(1),L(2)),L(3)),L(4)),L(5))');
    });
  });

  describe('lookupComposition', () => {
    const makeImg = (id: number, ar: 'H' | 'V', rating: number): ImageType => {
      const item = ar === 'H' ? H(id, rating) : V(id, rating);
      return toImageType(item, DESKTOP);
    };

    it('looks up 1-0 (hero) correctly', () => {
      const imgs = [makeImg(1, 'H', 5)];
      const { composition: ac } = lookupComposition(imgs);
      expect(ac.type).toBe('single');
    });

    it('looks up 2-0 (h-pair) correctly', () => {
      const imgs = [makeImg(1, 'H', 4), makeImg(2, 'H', 4)];
      const { composition: ac } = lookupComposition(imgs);
      expect(boxTreeShape(acToBoxTree(ac))).toBe('H(L(1),L(2))');
    });

    it('looks up 1-2 with dominant → DVP', () => {
      const imgs = [makeImg(1, 'H', 4), makeImg(2, 'V', 3), makeImg(3, 'V', 3)];
      const { composition: ac } = lookupComposition(imgs);
      expect(boxTreeShape(acToBoxTree(ac))).toBe('H(L(1),V(L(2),L(3)))');
    });

    it('looks up 0-4 → nested quad', () => {
      const imgs = [
        makeImg(1, 'V', 3), makeImg(2, 'V', 1),
        makeImg(3, 'V', 1), makeImg(4, 'V', 1),
      ];
      const { composition: ac } = lookupComposition(imgs);
      const bt = acToBoxTree(ac);
      expect(bt.type).toBe('combined');
      if (bt.type === 'combined') {
        // Main should be V3★ (id=1)
        if (bt.children[0].type === 'leaf') {
          expect(bt.children[0].content.id).toBe(1);
        }
      }
    });

    it('falls back to hChain for unknown key', () => {
      // 6 horizontal images → key "6-0" not in map
      const imgs = [
        makeImg(1,'H',1), makeImg(2,'H',1), makeImg(3,'H',1),
        makeImg(4,'H',1), makeImg(5,'H',1), makeImg(6,'H',1),
      ];
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const { composition: ac } = lookupComposition(imgs);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('6-0'));
      expect(boxTreeShape(acToBoxTree(ac))).toBe('H(H(H(H(H(L(1),L(2)),L(3)),L(4)),L(5)),L(6))');
      warnSpy.mockRestore();
    });

    it('produces same BoxTree as createBoxTreeFromPattern for DVP inputs', () => {
      // H4★ + V1★ + V1★ → DVP pattern in current system
      const items = [H(1, 4), V(2, 1), V(3, 1)];
      const currentRows = buildRows(items, DESKTOP);
      const currentBoxTree = currentRows[0]!.boxTree;

      // New path: convert to ImageType, lookup composition, convert to BoxTree
      const imgs = items.map(item => toImageType(item, DESKTOP));
      const { composition: ac } = lookupComposition(imgs);
      const newBoxTree = acToBoxTree(ac);

      expect(boxTreeShape(newBoxTree)).toBe(boxTreeShape(currentBoxTree));
    });

    it('produces same BoxTree as createBoxTreeFromPattern for nested quad', () => {
      // V3★ + V1★ + V1★ + V1★ → nested quad in current system
      const items = [V(1, 3), V(2, 1), V(3, 1), V(4, 1)];
      const currentRows = buildRows(items, DESKTOP);
      const currentBoxTree = currentRows[0]!.boxTree;

      const imgs = items.map(item => toImageType(item, DESKTOP));
      const { composition: ac } = lookupComposition(imgs);
      const newBoxTree = acToBoxTree(ac);

      expect(boxTreeShape(newBoxTree)).toBe(boxTreeShape(currentBoxTree));
    });

    it('produces same BoxTree as createBoxTreeFromPattern for triple horizontal', () => {
      // H3★ + H3★ + H3★ → TRIPLE_HORIZONTAL in current system
      const items = [H(1, 3), H(2, 3), H(3, 3)];
      const currentRows = buildRows(items, DESKTOP);
      const currentBoxTree = currentRows[0]!.boxTree;

      const imgs = items.map(item => toImageType(item, DESKTOP));
      const { composition: ac } = lookupComposition(imgs);
      const newBoxTree = acToBoxTree(ac);

      expect(boxTreeShape(newBoxTree)).toBe(boxTreeShape(currentBoxTree));
    });

    it('produces same BoxTree as createBoxTreeFromPattern for H5★ standalone', () => {
      const items = [H(1, 5)];
      const currentRows = buildRows(items, DESKTOP);
      const currentBoxTree = currentRows[0]!.boxTree;

      const imgs = items.map(item => toImageType(item, DESKTOP));
      const { composition: ac } = lookupComposition(imgs);
      const newBoxTree = acToBoxTree(ac);

      expect(boxTreeShape(newBoxTree)).toBe(boxTreeShape(currentBoxTree));
    });

    it('produces same BoxTree as createBoxTreeFromPattern for H4★ pair', () => {
      const items = [H(1, 4), H(2, 4)];
      const currentRows = buildRows(items, DESKTOP);
      const currentBoxTree = currentRows[0]!.boxTree;

      const imgs = items.map(item => toImageType(item, DESKTOP));
      const { composition: ac } = lookupComposition(imgs);
      const newBoxTree = acToBoxTree(ac);

      expect(boxTreeShape(newBoxTree)).toBe(boxTreeShape(currentBoxTree));
    });
  });
});
