/**
 * Characterization Tests for buildRows() and buildAtomic()
 *
 * These tests capture the output of buildRows()/buildAtomic() as a regression
 * safety net. They assert on:
 *
 * - Number of rows returned
 * - components array per row (which items, in what order)
 * - boxTree structure per row (full tree shape)
 */

import { LAYOUT } from '@/app/constants';
import {
  acToBoxTree,
  type BoxTree,
  buildRows,
  hChain,
  hPair,
  type ImageType,
  type RowResult,
  single,
  toImageType,
  vStack,
} from '@/app/utils/rowCombination';
import { H, V } from '@/tests/fixtures/contentFixtures';

// ===================== Helpers =====================

const DESKTOP = LAYOUT.desktopSlotWidth; // 8

/** Extract the item IDs from a row's components, preserving order */
function rowIds(row: RowResult): number[] {
  return row.components.map(c => c.id);
}

/** Recursively extract leaf IDs from a BoxTree in left-to-right order */
function boxTreeLeafIds(tree: BoxTree): number[] {
  if (tree.type === 'leaf') {
    return [tree.content.id];
  }
  return [...boxTreeLeafIds(tree.children[0]), ...boxTreeLeafIds(tree.children[1])];
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
    expect(rows[0]!.boxTree.type).toBe('leaf');
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('L(1)');
  });

  // ---------------------------------------------------------------
  // Test 2: V5★ + V5★ — 2 verticals
  // V5★ effective=4, cv=2.5. 2×2.5=5.0, fill=100%
  // ---------------------------------------------------------------
  it('2: V5★ + V5★ → 2 verticals (100% fill)', () => {
    const items = [V(1, 5), V(2, 5)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2]);
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),L(2))');
  });

  // ---------------------------------------------------------------
  // Test 3: H3★ + H3★ — greedy sequential fill
  // H3★ cv=1.67, 2×1.67=3.34, fill=67% < 90% → row incomplete with 2 items
  // ---------------------------------------------------------------
  it('3: H3★ + H3★ → 2 horizontals (67% fill, below 90%)', () => {
    const items = [H(1, 3), H(2, 3)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2]);
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),L(2))');
  });

  // ---------------------------------------------------------------
  // Test 4: V2★ + V2★ — greedy sequential fill
  // V2★ effective=1, cv=1.0. 2×1.0=2.0, fill=40% < 90%
  // ---------------------------------------------------------------
  it('4: V2★ + V2★ → 2 verticals (40% fill)', () => {
    const items = [V(1, 2), V(2, 2)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2]);
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),L(2))');
  });

  // ---------------------------------------------------------------
  // Test 5: H4★ + V1★ + V1★ — dominant H + stacked V-pair
  // H4★ cv=2.5, V1★ effective=0 cv=1.0. Total=4.5, fill=90% ✓
  // ---------------------------------------------------------------
  it('5: H4★ + V1★ + V1★ → H(leaf, V(leaf,leaf)) (90% fill)', () => {
    const items = [H(1, 4), V(2, 1), V(3, 1)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3]);
    // main | V(stacked1, stacked2)
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),V(L(2),L(3)))');
  });

  // ---------------------------------------------------------------
  // Test 6: H4★ + V2★ — H + V
  // H4★ cv=2.5, V2★ effective=1 cv=1.0. Total=3.5, fill=70% < 90%
  // ---------------------------------------------------------------
  it('6: H4★ + V2★ → H + V (70% fill)', () => {
    const items = [H(1, 4), V(2, 2)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2]);
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),L(2))');
  });

  // ---------------------------------------------------------------
  // Test 7: H2★ + H2★ + H2★ — 3 horizontals
  // H2★ cv=1.25, 3×1.25=3.75, fill=75% < 90% → row incomplete
  // ---------------------------------------------------------------
  it('7: H2★ + H2★ + H2★ → 3 horizontals (75% fill)', () => {
    const items = [H(1, 2), H(2, 2), H(3, 2)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3]);
    // buildAtomic produces AR-aware tree (not flat hChain)
    const bt = rows[0]!.boxTree;
    expect(bt.type).toBe('combined');
    if (bt.type === 'combined') expect(bt.direction).toBe('horizontal');
  });

  // ---------------------------------------------------------------
  // Test 8: H1★ + V1★ + H1★ + V1★ + H1★ — 5-item row (3H + 2V)
  // H1★ cv=1.0, V1★ effective=0 cv=1.0. 5×1.0=5.0, fill=100% ✓
  // ---------------------------------------------------------------
  it('8: H1★ + V1★ + H1★ + V1★ + H1★ → 3H + 2V (5-item row)', () => {
    const items = [H(1, 1), V(2, 1), H(3, 1), V(4, 1), H(5, 1)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3, 4, 5]);
    // buildAtomic produces AR-aware tree with dominant on right
    const bt = rows[0]!.boxTree;
    expect(bt.type).toBe('combined');
    if (bt.type === 'combined') expect(bt.direction).toBe('horizontal');
  });

  // ---------------------------------------------------------------
  // Test 9: V1★ + H5★ + H3★ + H3★ — no hero skip at rw=8
  // V1★ cv≈0.61, H5★ cv=5.0, H3★ cv=2.5
  // Sequential: 0.61+5.0=5.61 (70.2%), +2.5=8.11 (101.4%✓) → complete at 3 items
  // Row 1: V1★+H5★+H3★ (ids [1,2,3]), remaining H3★ in row 2
  // ---------------------------------------------------------------
  it('9: V1★ + H5★ + H3★ + H3★ → sequential fill, 3 in first row', () => {
    const items = [V(1, 1), H(2, 5), H(3, 3), H(4, 3)];
    const rows = buildRows(items, DESKTOP);

    // Row 1: V1★+H5★+H3★ → H(V-pair, leaf)
    expect(rows).toHaveLength(2);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3]);
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(V(L(1),L(2)),L(3))');

    // Row 2: remaining H3★
    expect(rowIds(rows[1]!)).toEqual([4]);
  });

  // ---------------------------------------------------------------
  // Test 10: V1★ + V2★ + H5★ — all in one row at rw=8
  // V1★ cv≈0.61, V2★ cv≈0.77, H5★ cv=5.0. Total≈6.38, fill≈79.7%
  // Sequential fill takes all 3, best-fit completes
  // ---------------------------------------------------------------
  it('10: V1★ + V2★ + H5★ → all in one row (no hero skip at rw=8)', () => {
    const items = [V(1, 1), V(2, 2), H(3, 5)];
    const rows = buildRows(items, DESKTOP);

    // All 3 in one row → H(V-pair, leaf)
    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3]);
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(V(L(1),L(2)),L(3))');
  });

  // ---------------------------------------------------------------
  // Test 11: 4 verticals (V3★, V1★, V1★, V1★) — 2×2 nested
  // V3★ eff=2, V1★ eff=0. CVs: 1.25 + 1.0 + 1.0 + 1.0 = 4.25, fill=85%
  // ---------------------------------------------------------------
  it('11: V3★ + V1★ + V1★ + V1★ → 2×2 nested', () => {
    const items = [V(1, 3), V(2, 1), V(3, 1), V(4, 1)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3, 4]);

    // Builds: H( H(V3★,V1★), V(V1★,V1★) ) — an H pair on the left and a
    // V stack of two leaves on the right.
    const tree = rows[0]!.boxTree;
    expect(tree.type).toBe('combined');
    if (tree.type === 'combined') {
      expect(tree.direction).toBe('horizontal');
      // Left side: horizontal pair
      expect(tree.children[0].type).toBe('combined');
      if (tree.children[0].type === 'combined') {
        expect(tree.children[0].direction).toBe('horizontal');
      }
      // Right side: vertical stack of two leaves
      expect(tree.children[1].type).toBe('combined');
      if (tree.children[1].type === 'combined') {
        expect(tree.children[1].direction).toBe('vertical');
        expect(tree.children[1].children[0].type).toBe('leaf');
        expect(tree.children[1].children[1].type).toBe('leaf');
      }
    }
  });

  // ---------------------------------------------------------------
  // Test 12: 10 mixed images — realistic collection
  // With rw=8: H5★ cv=5.0, H4★ cv=3.5, V3★ cv≈1.07, H3★ cv=2.5,
  //            V1★ cv≈0.61, H2★ cv=1.75, V2★ cv≈0.77
  // ---------------------------------------------------------------
  it('12: 10 mixed images — realistic collection end-to-end', () => {
    const items = [
      H(1, 5), // cv=5.0
      H(2, 4), // cv=3.5
      V(3, 3), // eff=2, cv≈1.07
      V(4, 3), // eff=2, cv≈1.07
      H(5, 3), // cv=2.5
      H(6, 3), // cv=2.5
      H(7, 3), // cv=2.5
      V(8, 1), // eff=0, cv≈0.61
      H(9, 2), // cv=1.75
      V(10, 2), // eff=1, cv≈0.77
    ];
    const rows = buildRows(items, DESKTOP);

    // Every item should appear exactly once
    const allIds = rows.flatMap(r => rowIds(r)).sort((a, b) => a - b);
    expect(allIds).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    // Row 1: H5★(5.0) + H4★(3.5) = 8.5, fill≈106% (≤ MAX). The AR estimate for
    // {H5,H4} already meets the AR floor, so the row closes at 2 items.
    expect(rowIds(rows[0]!)).toEqual([1, 2]);

    // Row 2: V3★ + V3★ + H3★ + H3★ + H3★ → 3H + 2V
    expect(rowIds(rows[1]!)).toEqual([3, 4, 5, 6, 7]);

    // Row 3: V1★ + H2★ + V2★ → 1H + 2V
    expect(rowIds(rows[2]!)).toEqual([8, 9, 10]);

    expect(rows).toHaveLength(3);
  });

  // ---------------------------------------------------------------
  // Test 13: All 3★ images (uniform rating, degenerate case)
  // ---------------------------------------------------------------
  it('13: all 3★ images (uniform rating)', () => {
    const items = [H(1, 3), H(2, 3), H(3, 3), H(4, 3), H(5, 3), H(6, 3)];
    const rows = buildRows(items, DESKTOP);

    // H3★ cv=1.67. 3×1.67=5.0 → 100% → row complete
    // 3 H3★ per row
    expect(rows).toHaveLength(2);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3]);
    expect(rowIds(rows[1]!)).toEqual([4, 5, 6]);
  });

  // ---------------------------------------------------------------
  // Test 14: Single V1★ (leftovers / final row)
  // ---------------------------------------------------------------
  it('14: single V1★ → single-item row', () => {
    const items = [V(1, 1)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1]);
    expect(rows[0]!.boxTree.type).toBe('leaf');
  });

  // ---------------------------------------------------------------
  // Test 15: H4★ + H3★ + V1★ + H2★ + V1★ — with rw=8
  // H4★ cv=3.5, H3★ cv=2.5, V1★ cv≈0.61, H2★ cv=1.75, V1★ cv≈0.61
  // Sequential: 3.5(43.8%) + 2.5(75%) + 0.61(82.6%) + 1.75(104.5%✓) → complete at 4
  // Actual: [1,2,3,4] → 3H + 1V
  // ---------------------------------------------------------------
  it('15: H4★ + H3★ + V1★ + H2★ + V1★ → 3H + 1V first row', () => {
    const items = [H(1, 4), H(2, 3), V(3, 1), H(4, 2), V(5, 1)];
    const rows = buildRows(items, DESKTOP);

    // Row 1: H4★ + H3★ + V1★ + H2★
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3, 4]);

    // Remaining: V1★
    expect(rowIds(rows[1]!)).toEqual([5]);

    // All items used
    const allIds = rows.flatMap(r => rowIds(r)).sort((a, b) => a - b);
    expect(allIds).toEqual([1, 2, 3, 4, 5]);
  });

  // ---------------------------------------------------------------
  // Test 16: H3★ + V1★ + V1★ + H3★ — sequential fill
  // H3★ cv=1.67, V1★ cv=1.0
  // Sequential: 1.67+1.0=2.67 (53%), +1.0=3.67 (73%), +1.67=5.34 (107%) ✓
  // Sequential completes → 2H + 2V
  // ---------------------------------------------------------------
  it('16: H3★ + V1★ + V1★ + H3★ → sequential fill (no best-fit needed)', () => {
    const items = [H(1, 3), V(2, 1), V(3, 1), H(4, 3)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3, 4]);
  });

  // ---------------------------------------------------------------
  // Test 17: V4★ + H3★ + H4★ + H1★ — with rw=8
  // V4★ eff=3 cv≈1.53, H3★ cv=2.5, H4★ cv=3.5, H1★ cv=1.25
  // Sequential: 1.53(19.1%) + 2.5(50.4%) + 3.5(94.1%✓) → complete at 3
  // Actual: [1,2,3] → 2H + 1V, remaining [4] alone
  // ---------------------------------------------------------------
  it('17: sequential fill — V4★ + H3★ + H4★ + H1★', () => {
    const items = [V(1, 4), H(2, 3), H(3, 4), H(4, 1)];
    const rows = buildRows(items, DESKTOP);

    // Row 1: V4★ + H3★ + H4★ → 2H + 1V
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3]);
    expect(rows[0]!.components).toHaveLength(3);

    // Row 2: H1★ alone
    expect(rowIds(rows[1]!)).toEqual([4]);

    const allIds = rows.flatMap(r => rowIds(r)).sort((a, b) => a - b);
    expect(allIds).toEqual([1, 2, 3, 4]);
  });

  // ---------------------------------------------------------------
  // Test 18: H4★ + H4★ — 2 horizontals (100% fill)
  // ---------------------------------------------------------------
  it('18: H4★ + H4★ → 2 horizontals (100% fill)', () => {
    const items = [H(1, 4), H(2, 4)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2]);
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),L(2))');
  });

  // ---------------------------------------------------------------
  // Test 19: H4★ + V3★ + V3★ — dominant H + stacked V-pair (100% fill)
  // ---------------------------------------------------------------
  it('19: H4★ + V3★ + V3★ → H(leaf, V(leaf,leaf)) (100% fill)', () => {
    const items = [H(1, 4), V(2, 3), V(3, 3)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3]);
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),V(L(2),L(3)))');
  });

  // ---------------------------------------------------------------
  // Test 20: 5 H1★ images — single-row fallback
  // H1★ cv=1.0, all same rating (eff=1)
  // 3×1.0=3.0, fill=60% < 90% → isRowComplete fails for 3
  // 5×1.0=5.0, fill=100% → all 5 fill into one row
  // ---------------------------------------------------------------
  it('20: 5 H1★ images → single-row fallback', () => {
    const items = [H(1, 1), H(2, 1), H(3, 1), H(4, 1), H(5, 1)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3, 4, 5]);
  });

  // ---------------------------------------------------------------
  // Test 21: Large mixed collection — 15 images
  // With rw=8, H5★ is no longer standalone (cv=5.0, fill=62.5% < 95%)
  // ---------------------------------------------------------------
  it('21: large mixed collection (15 images) — all items consumed', () => {
    const items = [
      H(1, 5), // cv=5.0
      H(2, 4),
      V(3, 3),
      V(4, 3), // cv=3.5, 1.07, 1.07
      H(5, 3),
      H(6, 3),
      H(7, 3), // cv=2.5 each
      V(8, 2),
      V(9, 2), // cv≈0.77 each
      H(10, 1),
      V(11, 1),
      H(12, 1),
      V(13, 1),
      H(14, 1),
      H(15, 2),
    ];
    const rows = buildRows(items, DESKTOP);

    // All 15 items consumed
    const allIds = rows.flatMap(r => rowIds(r)).sort((a, b) => a - b);
    expect(allIds).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

    // First row: H5★+H4★ (5.0+3.5=8.5, 106% ≤ MAX). The AR estimate for {H5,H4}
    // meets the AR floor, so the row closes at 2 items → [1,2].
    expect(rowIds(rows[0]!)).toEqual([1, 2]);
  });

  // ---------------------------------------------------------------
  // Test 22: Verify BoxTree structure faithfulness across patterns
  // ---------------------------------------------------------------
  it('23: boxTree leaf IDs match component IDs for all rows', () => {
    const items = [
      H(1, 5),
      H(2, 4),
      V(3, 3),
      V(4, 3),
      H(5, 3),
      H(6, 3),
      H(7, 3),
      V(8, 1),
      H(9, 2),
      V(10, 2),
    ];
    const rows = buildRows(items, DESKTOP);

    for (const row of rows) {
      const componentIds = rowIds(row);
      const leafIds = boxTreeLeafIds(row.boxTree);
      // BoxTree leaves should contain exactly the same items as components
      // (order may differ for a 2×2 nested shape, but content should match)
      expect(leafIds.sort((a, b) => a - b)).toEqual(componentIds.sort((a, b) => a - b));
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
      expect(img.numericAR).toBeCloseTo(1.7778, 3);
      expect(img.effectiveRating).toBe(4); // horizontal, no penalty
      expect(img.componentValue).toBeCloseTo(3.5); // BASE_WEIGHT[4] × 1.0 (arFactor capped)
    });

    it('should convert vertical image with penalty', () => {
      const item = V(2, 3);
      const img = toImageType(item, DESKTOP);

      expect(img.source).toBe(item);
      expect(img.ar).toBe('V');
      expect(img.numericAR).toBeCloseTo(0.5625);
      expect(img.effectiveRating).toBe(2); // V3★ → eff 2 (vertical penalty)
      expect(img.componentValue).toBeCloseTo(1.0717, 3); // BASE_WEIGHT[2] × sqrt(0.5625/1.5)
    });

    it('should handle V1★ → effective 0', () => {
      const item = V(3, 1);
      const img = toImageType(item, DESKTOP);

      expect(img.ar).toBe('V');
      expect(img.numericAR).toBeCloseTo(0.5625);
      expect(img.effectiveRating).toBe(0);
      expect(img.componentValue).toBeCloseTo(0.6124, 3); // BASE_WEIGHT[0] × sqrt(0.5625/1.5)
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

    it('builds H(leaf, V(leaf,leaf))', () => {
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

    it('builds H(leaf, V(H(a,b), leaf))', () => {
      const main = makeImg(1, 'V', 4);
      const a = makeImg(2, 'V', 1);
      const b = makeImg(3, 'V', 1);
      const bottom = makeImg(4, 'H', 3);

      const ac = hPair(single(main), vStack(hPair(single(a), single(b)), single(bottom)));

      expect(ac.type).toBe('pair');
      if (ac.type === 'pair') {
        expect(ac.direction).toBe('H');
        expect(ac.children[0].type).toBe('single'); // main
        expect(ac.children[1].type).toBe('pair'); // V(H(a,b), bottom)
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

    it('acToBoxTree converts H(leaf, V-pair) and preserves source refs', () => {
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

    it('produces correct hChain(3) shape', () => {
      const imgs = [makeImg(1, 'H', 3), makeImg(2, 'H', 3), makeImg(3, 'H', 3)];
      const bt = acToBoxTree(hChain(imgs));

      // Should match: H(H(L(1),L(2)),L(3))
      expect(boxTreeShape(bt)).toBe('H(H(L(1),L(2)),L(3))');
    });
  });
});
