/**
 * Characterization Tests for buildRows()
 *
 * These tests capture the CURRENT behavior of buildRows() as a regression safety net
 * for the Phase 1 template map refactor. They assert on:
 *
 * - Number of rows returned
 * - components array per row (which items, in what order)
 * - boxTree structure per row (full tree shape)
 * - templateKey per row ({ h: number; v: number } orientation counts)
 *
 * After the refactor, components, boxTree, and templateKey assertions should all pass.
 */

import { LAYOUT } from '@/app/constants';
import {
  acToBoxTree,
  type BoxTree,
  buildRows,
  findDominant,
  getTemplateKey,
  hChain,
  hPair,
  type ImageType,
  lookupComposition,
  type RowResult,
  single,
  TEMPLATE_MAP,
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
    expect(rows[0]!.templateKey).toEqual({ h: 1, v: 0 });
    expect(rows[0]!.boxTree.type).toBe('leaf');
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('L(1)');
  });

  // ---------------------------------------------------------------
  // Test 2: V5★ + V5★ — v-pair template
  // V5★ effective=4, cv=2.5. 2×2.5=5.0, fill=100%
  // templateKey: { h: 0, v: 2 }
  // ---------------------------------------------------------------
  it('2: V5★ + V5★ → v-pair (100% fill)', () => {
    const items = [V(1, 5), V(2, 5)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2]);
    expect(rows[0]!.templateKey).toEqual({ h: 0, v: 2 });
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),L(2))');
  });

  // ---------------------------------------------------------------
  // Test 3: H3★ + H3★ — greedy sequential fill
  // H3★ cv=1.67, 2×1.67=3.34, fill=67% < 90% → row incomplete with 2 items
  // templateKey: { h: 2, v: 0 }
  // ---------------------------------------------------------------
  it('3: H3★ + H3★ → h-pair templateKey (67% fill, below 90%)', () => {
    const items = [H(1, 3), H(2, 3)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2]);
    expect(rows[0]!.templateKey).toEqual({ h: 2, v: 0 });
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),L(2))');
  });

  // ---------------------------------------------------------------
  // Test 4: V2★ + V2★ — greedy sequential fill
  // V2★ effective=1, cv=1.0. 2×1.0=2.0, fill=40% < 90%
  // templateKey: { h: 0, v: 2 }
  // ---------------------------------------------------------------
  it('4: V2★ + V2★ → v-pair templateKey (40% fill)', () => {
    const items = [V(1, 2), V(2, 2)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2]);
    expect(rows[0]!.templateKey).toEqual({ h: 0, v: 2 });
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),L(2))');
  });

  // ---------------------------------------------------------------
  // Test 5: H4★ + V1★ + V1★ — dom-stacked-1h2v template
  // H4★ cv=2.5, V1★ effective=0 cv=1.0. Total=4.5, fill=90% ✓
  // templateKey: { h: 1, v: 2 }
  // ---------------------------------------------------------------
  it('5: H4★ + V1★ + V1★ → dom-stacked-1h2v (90% fill)', () => {
    const items = [H(1, 4), V(2, 1), V(3, 1)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3]);
    expect(rows[0]!.templateKey).toEqual({ h: 1, v: 2 });
    // DVP: main | V(stacked1, stacked2)
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),V(L(2),L(3)))');
  });

  // ---------------------------------------------------------------
  // Test 6: H4★ + V2★ — dom-sec template
  // H4★ cv=2.5, V2★ effective=1 cv=1.0. Total=3.5, fill=70% < 90%
  // templateKey: { h: 1, v: 1 }
  // ---------------------------------------------------------------
  it('6: H4★ + V2★ → dom-sec templateKey (70% fill)', () => {
    const items = [H(1, 4), V(2, 2)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2]);
    expect(rows[0]!.templateKey).toEqual({ h: 1, v: 1 });
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),L(2))');
  });

  // ---------------------------------------------------------------
  // Test 7: H2★ + H2★ + H2★ — triple-h template
  // H2★ cv=1.25, 3×1.25=3.75, fill=75% < 90% → row incomplete
  // templateKey: { h: 3, v: 0 }
  // ---------------------------------------------------------------
  it('7: H2★ + H2★ + H2★ → triple-h templateKey (75% fill)', () => {
    const items = [H(1, 2), H(2, 2), H(3, 2)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3]);
    expect(rows[0]!.templateKey).toEqual({ h: 3, v: 0 });
    // buildAtomic produces AR-aware tree (not flat hChain)
    const bt = rows[0]!.boxTree;
    expect(bt.type).toBe('combined');
    if (bt.type === 'combined') expect(bt.direction).toBe('horizontal');
  });

  // ---------------------------------------------------------------
  // Test 8: H1★ + V1★ + H1★ + V1★ + H1★ — atomic-3h2v template (5 items)
  // H1★ cv=1.0, V1★ effective=0 cv=1.0. 5×1.0=5.0, fill=100% ✓
  // templateKey: { h: 3, v: 2 }
  // ---------------------------------------------------------------
  it('8: H1★ + V1★ + H1★ + V1★ + H1★ → atomic-3h2v templateKey (5-item row)', () => {
    const items = [H(1, 1), V(2, 1), H(3, 1), V(4, 1), H(5, 1)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3, 4, 5]);
    expect(rows[0]!.templateKey).toEqual({ h: 3, v: 2 });
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

    // Row 1: V1★+H5★+H3★ → dom-stacked-2h1v
    expect(rows).toHaveLength(2);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3]);
    expect(rows[0]!.templateKey).toEqual({ h: 2, v: 1 });
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(2),V(L(1),L(3)))');

    // Row 2: remaining H3★
    expect(rowIds(rows[1]!)).toEqual([4]);
    expect(rows[1]!.templateKey).toEqual({ h: 1, v: 0 });
  });

  // ---------------------------------------------------------------
  // Test 10: V1★ + V2★ + H5★ — all in one row at rw=8
  // V1★ cv≈0.61, V2★ cv≈0.77, H5★ cv=5.0. Total≈6.38, fill≈79.7%
  // Sequential fill takes all 3, best-fit completes
  // ---------------------------------------------------------------
  it('10: V1★ + V2★ + H5★ → all in one row (no hero skip at rw=8)', () => {
    const items = [V(1, 1), V(2, 2), H(3, 5)];
    const rows = buildRows(items, DESKTOP);

    // All 3 in one row → dom-stacked-1h2v
    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3]);
    expect(rows[0]!.templateKey).toEqual({ h: 1, v: 2 });
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(3),V(L(1),L(2)))');
  });

  // ---------------------------------------------------------------
  // Test 11: 4 verticals (V3★, V1★, V1★, V1★) — nested-quad-0h4v template
  // V3★ eff=2, V1★ eff=0. CVs: 1.25 + 1.0 + 1.0 + 1.0 = 4.25, fill=85%
  // templateKey: { h: 0, v: 4 }
  // Main: V3★ (highest rating eff=2), top pair: two lowest (V1★, V1★), bottom: V1★
  // ---------------------------------------------------------------
  it('11: V3★ + V1★ + V1★ + V1★ → nested quad', () => {
    const items = [V(1, 3), V(2, 1), V(3, 1), V(4, 1)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3, 4]);
    expect(rows[0]!.templateKey).toEqual({ h: 0, v: 4 });

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

    // Row 1: H5★(5.0) + H4★(3.5) + V3★(1.07) = 9.57, fill≈119% > MAX
    // Sequential: 5.0(62.5%) + 3.5(106%✓) → complete at 2
    // Actual: [1,2,3] → dom-stacked-2h1v (compose picks up V3★)
    expect(rows[0]!.templateKey).toEqual({ h: 2, v: 1 });
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3]);

    // Row 2: V3★ + H3★ + H3★ + H3★ → compose-3h1v
    expect(rows[1]!.templateKey).toEqual({ h: 3, v: 1 });
    expect(rowIds(rows[1]!)).toEqual([4, 5, 6, 7]);

    // Row 3: V1★ + H2★ + V2★ → dom-stacked-1h2v
    expect(rows[2]!.templateKey).toEqual({ h: 1, v: 2 });
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
    // triple-h template: 3 H3★ → templateKey { h: 3, v: 0 }
    expect(rows).toHaveLength(2);
    expect(rows[0]!.templateKey).toEqual({ h: 3, v: 0 });
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3]);
    expect(rows[1]!.templateKey).toEqual({ h: 3, v: 0 });
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
    expect(rows[0]!.templateKey).toEqual({ h: 0, v: 1 });
    expect(rows[0]!.boxTree.type).toBe('leaf');
  });

  // ---------------------------------------------------------------
  // Test 15: H4★ + H3★ + V1★ + H2★ + V1★ — with rw=8
  // H4★ cv=3.5, H3★ cv=2.5, V1★ cv≈0.61, H2★ cv=1.75, V1★ cv≈0.61
  // Sequential: 3.5(43.8%) + 2.5(75%) + 0.61(82.6%) + 1.75(104.5%✓) → complete at 4
  // Actual: [1,2,3,4] → compose-3h1v
  // ---------------------------------------------------------------
  it('15: H4★ + H3★ + V1★ + H2★ + V1★ → compose-3h1v first row', () => {
    const items = [H(1, 4), H(2, 3), V(3, 1), H(4, 2), V(5, 1)];
    const rows = buildRows(items, DESKTOP);

    // Row 1: H4★ + H3★ + V1★ + H2★ → templateKey { h: 3, v: 1 }
    expect(rows[0]!.templateKey).toEqual({ h: 3, v: 1 });
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3, 4]);

    // Remaining: V1★ → templateKey { h: 0, v: 1 }
    expect(rows[1]!.templateKey).toEqual({ h: 0, v: 1 });
    expect(rowIds(rows[1]!)).toEqual([5]);

    // All items used
    const allIds = rows.flatMap(r => rowIds(r)).sort((a, b) => a - b);
    expect(allIds).toEqual([1, 2, 3, 4, 5]);
  });

  // ---------------------------------------------------------------
  // Test 16: H3★ + V1★ + V1★ + H3★ — sequential fill
  // H3★ cv=1.67, V1★ cv=1.0
  // Sequential: 1.67+1.0=2.67 (53%), +1.0=3.67 (73%), +1.67=5.34 (107%) ✓
  // Sequential completes → templateKey { h: 2, v: 2 }
  // ---------------------------------------------------------------
  it('16: H3★ + V1★ + V1★ + H3★ → sequential fill (no best-fit needed)', () => {
    const items = [H(1, 3), V(2, 1), V(3, 1), H(4, 3)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3, 4]);
    expect(rows[0]!.templateKey).toEqual({ h: 2, v: 2 });
  });

  // ---------------------------------------------------------------
  // Test 17: V4★ + H3★ + H4★ + H1★ — with rw=8
  // V4★ eff=3 cv≈1.53, H3★ cv=2.5, H4★ cv=3.5, H1★ cv=1.25
  // Sequential: 1.53(19.1%) + 2.5(50.4%) + 3.5(94.1%✓) → complete at 3
  // Actual: [1,2,3] → dom-stacked-2h1v, remaining [4] alone
  // ---------------------------------------------------------------
  it('17: sequential fill — V4★ + H3★ + H4★ + H1★', () => {
    const items = [V(1, 4), H(2, 3), H(3, 4), H(4, 1)];
    const rows = buildRows(items, DESKTOP);

    // Row 1: V4★ + H3★ + H4★ → dom-stacked-2h1v
    expect(rows[0]!.templateKey).toEqual({ h: 2, v: 1 });
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3]);
    expect(rows[0]!.components).toHaveLength(3);

    // Row 2: H1★ alone
    expect(rowIds(rows[1]!)).toEqual([4]);

    const allIds = rows.flatMap(r => rowIds(r)).sort((a, b) => a - b);
    expect(allIds).toEqual([1, 2, 3, 4]);
  });

  // ---------------------------------------------------------------
  // Test 18: H4★ + H4★ — h-pair template (100% fill)
  // templateKey: { h: 2, v: 0 }
  // ---------------------------------------------------------------
  it('18: H4★ + H4★ → h-pair (100% fill)', () => {
    const items = [H(1, 4), H(2, 4)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2]);
    expect(rows[0]!.templateKey).toEqual({ h: 2, v: 0 });
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),L(2))');
  });

  // ---------------------------------------------------------------
  // Test 19: H4★ + V3★ + V3★ — dom-stacked-1h2v template (100% fill)
  // templateKey: { h: 1, v: 2 }
  // ---------------------------------------------------------------
  it('19: H4★ + V3★ + V3★ → dom-stacked-1h2v (100% fill)', () => {
    const items = [H(1, 4), V(2, 3), V(3, 3)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3]);
    expect(rows[0]!.templateKey).toEqual({ h: 1, v: 2 });
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
    expect(rows[0]!.label).toBe('compose-5h');
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

    // First row: H5★+H4★+V3★ → dom-stacked-2h1v (5.0+3.5+1.07=9.57, 119% > MAX)
    // Actual: [1,2,3] as dom-stacked-2h1v
    expect(rows[0]!.label).toBe('dom-stacked-2h1v');
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3]);
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
      // (order may differ for nested-quad, but content should match)
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

    it('produces correct hChain(3) shape', () => {
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
      const imgs = [makeImg(1, 'H', 4), makeImg(2, 'V', 3), makeImg(3, 'V', 3)];
      expect(getTemplateKey(imgs)).toBe('1-2');
    });

    it('handles 5-item row', () => {
      const imgs = [
        makeImg(1, 'H', 1),
        makeImg(2, 'V', 1),
        makeImg(3, 'H', 1),
        makeImg(4, 'V', 1),
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
      const ac = TEMPLATE_MAP['1-0']!.build(imgs, 1.5, DESKTOP);
      expect(ac.type).toBe('single');
      expect(boxTreeShape(acToBoxTree(ac))).toBe('L(1)');
    });

    it('0-1 (single-v) → single leaf', () => {
      const imgs = [makeImg(1, 'V', 1)];
      const ac = TEMPLATE_MAP['0-1']!.build(imgs, 1.5, DESKTOP);
      expect(ac.type).toBe('single');
      expect(boxTreeShape(acToBoxTree(ac))).toBe('L(1)');
    });

    it('2-0 (h-pair) → H(L,L)', () => {
      const imgs = [makeImg(1, 'H', 4), makeImg(2, 'H', 4)];
      const ac = TEMPLATE_MAP['2-0']!.build(imgs, 1.5, DESKTOP);
      expect(boxTreeShape(acToBoxTree(ac))).toBe('H(L(1),L(2))');
    });

    it('1-1 (dom-sec) → H(L,L)', () => {
      const imgs = [makeImg(1, 'H', 4), makeImg(2, 'V', 2)];
      const ac = TEMPLATE_MAP['1-1']!.build(imgs, 1.5, DESKTOP);
      expect(boxTreeShape(acToBoxTree(ac))).toBe('H(L(1),L(2))');
    });

    it('0-2 (v-pair) → H(L,L)', () => {
      const imgs = [makeImg(1, 'V', 5), makeImg(2, 'V', 5)];
      const ac = TEMPLATE_MAP['0-2']!.build(imgs, 1.5, DESKTOP);
      expect(boxTreeShape(acToBoxTree(ac))).toBe('H(L(1),L(2))');
    });

    it('3-0 → buildAtomic produces pair at root', () => {
      const imgs = [makeImg(1, 'H', 3), makeImg(2, 'H', 3), makeImg(3, 'H', 3)];
      const ac = TEMPLATE_MAP['3-0']!.build(imgs, 1.5, DESKTOP);
      expect(ac.type).toBe('pair');
      if (ac.type === 'pair') {
        expect(ac.direction).toBe('H');
      }
    });

    it('2-1 with dominant H4★ → DVP structure H(dom, V(rest0, rest1))', () => {
      const imgs = [makeImg(1, 'H', 4), makeImg(2, 'H', 3), makeImg(3, 'V', 1)];
      const ac = TEMPLATE_MAP['2-1']!.build(imgs, 1.5, DESKTOP);
      // H4★ is dominant (eff=4, H) → DVP
      expect(boxTreeShape(acToBoxTree(ac))).toBe('H(L(1),V(L(2),L(3)))');
    });

    it('2-1 without dominant → flat chain', () => {
      const imgs = [makeImg(1, 'H', 2), makeImg(2, 'H', 2), makeImg(3, 'V', 1)];
      const ac = TEMPLATE_MAP['2-1']!.build(imgs, 1.5, DESKTOP);
      // No image has eff >= 4 → flat chain
      expect(boxTreeShape(acToBoxTree(ac))).toBe('H(H(L(1),L(2)),L(3))');
    });

    it('1-2 with dominant H4★ → DVP structure', () => {
      const imgs = [makeImg(1, 'H', 4), makeImg(2, 'V', 3), makeImg(3, 'V', 3)];
      const ac = TEMPLATE_MAP['1-2']!.build(imgs, 1.5, DESKTOP);
      expect(boxTreeShape(acToBoxTree(ac))).toBe('H(L(1),V(L(2),L(3)))');
    });

    it('1-2 without dominant → flat chain', () => {
      const imgs = [makeImg(1, 'H', 3), makeImg(2, 'V', 3), makeImg(3, 'V', 3)];
      const ac = TEMPLATE_MAP['1-2']!.build(imgs, 1.5, DESKTOP);
      expect(boxTreeShape(acToBoxTree(ac))).toBe('H(H(L(1),L(2)),L(3))');
    });

    it('0-3 → buildAtomic produces pair at root', () => {
      const imgs = [makeImg(1, 'V', 2), makeImg(2, 'V', 2), makeImg(3, 'V', 2)];
      const ac = TEMPLATE_MAP['0-3']!.build(imgs, 1.5, DESKTOP);
      expect(ac.type).toBe('pair');
      if (ac.type === 'pair') {
        expect(ac.direction).toBe('H');
      }
    });

    it('0-4 with 4 verticals → nested quad', () => {
      const imgs = [
        makeImg(1, 'V', 3), // eff=2, dominant
        makeImg(2, 'V', 1), // eff=0
        makeImg(3, 'V', 1), // eff=0
        makeImg(4, 'V', 1), // eff=0
      ];
      const ac = TEMPLATE_MAP['0-4']!.build(imgs, 1.5, DESKTOP);
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
          expect(bt.children[1].children[1].type).toBe('leaf'); // bottom
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
      const ac = TEMPLATE_MAP['1-3']!.build(imgs, 1.5, DESKTOP);
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

    it('4-0 → buildAtomic produces pair at root', () => {
      const imgs = [makeImg(1, 'H', 2), makeImg(2, 'H', 2), makeImg(3, 'H', 2), makeImg(4, 'H', 2)];
      const ac = TEMPLATE_MAP['4-0']!.build(imgs, 1.5, DESKTOP);
      expect(ac.type).toBe('pair');
    });

    it('5-0 → buildAtomic produces pair at root', () => {
      const fiveH = [
        makeImg(1, 'H', 1),
        makeImg(2, 'H', 1),
        makeImg(3, 'H', 1),
        makeImg(4, 'H', 1),
        makeImg(5, 'H', 1),
      ];
      const ac = TEMPLATE_MAP['5-0']!.build(fiveH, 1.5, DESKTOP);
      expect(ac.type).toBe('pair');
      if (ac.type === 'pair') {
        expect(ac.direction).toBe('H');
      }
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
      const imgs = [makeImg(1, 'V', 3), makeImg(2, 'V', 1), makeImg(3, 'V', 1), makeImg(4, 'V', 1)];
      const { composition: ac } = lookupComposition(imgs);
      const bt = acToBoxTree(ac);
      expect(bt.type).toBe('combined');
      if (
        bt.type === 'combined' && // Main should be V3★ (id=1)
        bt.children[0].type === 'leaf'
      ) {
        expect(bt.children[0].content.id).toBe(1);
      }
    });

    it('uses compose-fallback for unknown key (6+ images)', () => {
      // 6 horizontal images → key "6-0" not in map → compose handles it
      const imgs = [
        makeImg(1, 'H', 1),
        makeImg(2, 'H', 1),
        makeImg(3, 'H', 1),
        makeImg(4, 'H', 1),
        makeImg(5, 'H', 1),
        makeImg(6, 'H', 1),
      ];
      const { composition: ac, label } = lookupComposition(imgs);
      expect(label).toBe('compose-fallback');
      // compose produces a valid tree (exact shape depends on AR scoring)
      const tree = acToBoxTree(ac);
      expect(tree.type).toBe('combined');
    });

    it('produces correct BoxTree for DVP inputs', () => {
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

    it('produces correct BoxTree for nested quad', () => {
      // V3★ + V1★ + V1★ + V1★ → nested quad in current system
      const items = [V(1, 3), V(2, 1), V(3, 1), V(4, 1)];
      const currentRows = buildRows(items, DESKTOP);
      const currentBoxTree = currentRows[0]!.boxTree;

      const imgs = items.map(item => toImageType(item, DESKTOP));
      const { composition: ac } = lookupComposition(imgs);
      const newBoxTree = acToBoxTree(ac);

      expect(boxTreeShape(newBoxTree)).toBe(boxTreeShape(currentBoxTree));
    });

    it('produces correct BoxTree for triple horizontal', () => {
      // H3★ + H3★ + H3★ → TRIPLE_HORIZONTAL in current system
      const items = [H(1, 3), H(2, 3), H(3, 3)];
      const currentRows = buildRows(items, DESKTOP);
      const currentBoxTree = currentRows[0]!.boxTree;

      const imgs = items.map(item => toImageType(item, DESKTOP));
      const { composition: ac } = lookupComposition(imgs);
      const newBoxTree = acToBoxTree(ac);

      expect(boxTreeShape(newBoxTree)).toBe(boxTreeShape(currentBoxTree));
    });

    it('produces correct BoxTree for H5★ standalone', () => {
      const items = [H(1, 5)];
      const currentRows = buildRows(items, DESKTOP);
      const currentBoxTree = currentRows[0]!.boxTree;

      const imgs = items.map(item => toImageType(item, DESKTOP));
      const { composition: ac } = lookupComposition(imgs);
      const newBoxTree = acToBoxTree(ac);

      expect(boxTreeShape(newBoxTree)).toBe(boxTreeShape(currentBoxTree));
    });

    it('produces correct BoxTree for H4★ pair', () => {
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
