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
  getTemplateKey,
  hChain,
  hPair,
  type ImageType,
  lookupComposition,
  type RowResult,
  single,
  toImageType,
  vStack,
} from '@/app/utils/rowCombination';
import { H, V } from '@/tests/fixtures/contentFixtures';

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
    // Bottom-up merge: two equal-rated images merge horizontally or vertically depending on AR
    const bt = rows[0]!.boxTree;
    expect(bt.type).toBe('combined');
    expect(boxTreeLeafIds(bt).sort()).toEqual([1, 2]);
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
    // Bottom-up merge: produces a valid combined tree
    const bt = rows[0]!.boxTree;
    expect(bt.type).toBe('combined');
    expect(boxTreeLeafIds(bt).sort()).toEqual([1, 2, 3]);
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
    // Bottom-up merge: produces a valid combined tree
    const bt = rows[0]!.boxTree;
    expect(bt.type).toBe('combined');
    expect(boxTreeLeafIds(bt).sort()).toEqual([1, 2, 3]);
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
    // Bottom-up merge: produces a valid combined tree
    const bt = rows[0]!.boxTree;
    expect(bt.type).toBe('combined');
    expect(boxTreeLeafIds(bt).sort()).toEqual([1, 2, 3, 4, 5]);
  });

  // ---------------------------------------------------------------
  // Test 9: V1★ + H5★ + H3★ + H3★ — STANDALONE skip at position 0
  // V1★ effective=0, ≤ 2 threshold → skippable
  // Hero found at position 1: H5★ → templateKey { h: 1, v: 0 }
  // H5★ becomes standalone, V1★ stays for next row
  // ---------------------------------------------------------------
  it('9: V1★ + H5★ + H3★ + H3★ → STANDALONE skip, H5★ first row', () => {
    const items = [V(1, 1), H(2, 5), H(3, 3), H(4, 3)];
    const rows = buildRows(items, DESKTOP);

    // Row 1: H5★ standalone (skipped V1★)
    expect(rows[0]!.templateKey).toEqual({ h: 1, v: 0 });
    expect(rowIds(rows[0]!)).toEqual([2]);
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('L(2)');

    // Remaining: V1★, H3★, H3★
    // V1★ cv=1.0, H3★ cv=1.67. Total=1.0+1.67+1.67=4.34, fill=87% < 90%
    // templateKey: { h: 2, v: 1 }
    expect(rows).toHaveLength(2);
    expect(rowIds(rows[1]!)).toEqual([1, 3, 4]);
    expect(rows[1]!.templateKey).toEqual({ h: 2, v: 1 });
  });

  // ---------------------------------------------------------------
  // Test 10: V1★ + V2★ + H5★ — STANDALONE skip reaching position 2
  // V1★ eff=0, V2★ eff=1 → both ≤ 2 threshold
  // Hero found at position 2: H5★ → templateKey { h: 1, v: 0 }
  // ---------------------------------------------------------------
  it('10: V1★ + V2★ + H5★ → STANDALONE skip to position 2', () => {
    const items = [V(1, 1), V(2, 2), H(3, 5)];
    const rows = buildRows(items, DESKTOP);

    // Row 1: H5★ standalone (skipped past V1★ and V2★)
    expect(rows[0]!.templateKey).toEqual({ h: 1, v: 0 });
    expect(rowIds(rows[0]!)).toEqual([3]);

    // Remaining: V1★, V2★
    expect(rows).toHaveLength(2);
    expect(rowIds(rows[1]!)).toEqual([1, 2]);
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

    // Bottom-up merge: produces a valid combined tree with all 4 leaves
    const tree = rows[0]!.boxTree;
    expect(tree.type).toBe('combined');
    expect(boxTreeLeafIds(tree).sort()).toEqual([1, 2, 3, 4]);
  });

  // ---------------------------------------------------------------
  // Test 12: 10 mixed images — realistic collection
  // ---------------------------------------------------------------
  it('12: 10 mixed images — realistic collection end-to-end', () => {
    const items = [
      H(1, 5), // cv=5.0
      H(2, 4), // cv=2.5
      V(3, 3), // eff=2, cv=1.25
      V(4, 3), // eff=2, cv=1.25
      H(5, 3), // cv=1.67
      H(6, 3), // cv=1.67
      H(7, 3), // cv=1.67
      V(8, 1), // eff=0, cv=1.0
      H(9, 2), // cv=1.25
      V(10, 2), // eff=1, cv=1.0
    ];
    const rows = buildRows(items, DESKTOP);

    // Every item should appear exactly once
    const allIds = rows.flatMap(r => rowIds(r)).sort((a, b) => a - b);
    expect(allIds).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    // Row 1: H5★ standalone → templateKey { h: 1, v: 0 }
    expect(rows[0]!.templateKey).toEqual({ h: 1, v: 0 });
    expect(rowIds(rows[0]!)).toEqual([1]);

    // Remaining rows cover all other items
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  // ---------------------------------------------------------------
  // Test 13: All 3★ images (uniform rating, degenerate case)
  // ---------------------------------------------------------------
  it('13: all 3★ images (uniform rating)', () => {
    const items = [H(1, 3), H(2, 3), H(3, 3), H(4, 3), H(5, 3), H(6, 3)];
    const rows = buildRows(items, DESKTOP);

    // All 6 items should appear exactly once
    const allIds = rows.flatMap(r => rowIds(r)).sort((a, b) => a - b);
    expect(allIds).toEqual([1, 2, 3, 4, 5, 6]);
    // Each row should have a valid templateKey and boxTree
    for (const row of rows) {
      expect(row.templateKey).toBeDefined();
      expect(row.boxTree).toBeDefined();
      expect(boxTreeLeafIds(row.boxTree).sort((a, b) => a - b)).toEqual(
        rowIds(row).sort((a, b) => a - b)
      );
    }
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
  // Test 15: H4★ + H3★ + V1★ + H2★ + V1★ — dom-stacked-2h1v template
  // H4★ cv=2.5, H3★ cv=1.67, V1★ cv=1.0. Total=5.17, fill=103% ✓
  // templateKey row 1: { h: 2, v: 1 } (H4★ dominant → DVP structure)
  // ---------------------------------------------------------------
  it('15: H4★ + H3★ + V1★ + H2★ + V1★ → dom-stacked-2h1v first row', () => {
    const items = [H(1, 4), H(2, 3), V(3, 1), H(4, 2), V(5, 1)];
    const rows = buildRows(items, DESKTOP);

    // All items used
    const allIds = rows.flatMap(r => rowIds(r)).sort((a, b) => a - b);
    expect(allIds).toEqual([1, 2, 3, 4, 5]);

    // Each row should have a valid boxTree
    for (const row of rows) {
      expect(row.boxTree).toBeDefined();
      expect(boxTreeLeafIds(row.boxTree).sort((a, b) => a - b)).toEqual(
        rowIds(row).sort((a, b) => a - b)
      );
    }
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
  // Test 17: Best-fit divergence — V4★ + H3★ + H4★ + H1★
  // V4★ eff=3 cv=1.67, H3★ cv=1.67, H4★ cv=2.5, H1★ cv=1.0
  // Sequential: 1.67+1.67=3.34 (67%), +2.5=5.84 (117%) > 115% → fails
  // At 67% < 90% → best-fit kicks in
  // Takes V4★(0), then best-fit: H4★(2, cv=2.5) → total=4.17
  // Then best-fit: H1★(3, cv=1.0) → total=5.17 (103%) ✓
  // Row contains V4★(V) + H4★(H) + H1★(H) → templateKey { h: 2, v: 1 }
  // ---------------------------------------------------------------
  it('17: best-fit fallback — V4★ + H3★ + H4★ + H1★', () => {
    const items = [V(1, 4), H(2, 3), H(3, 4), H(4, 1)];
    const rows = buildRows(items, DESKTOP);

    expect(rows[0]!.templateKey).toEqual({ h: 2, v: 1 });
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
  // Test 18: H4★ + H4★ — h-pair template (100% fill)
  // templateKey: { h: 2, v: 0 }
  // ---------------------------------------------------------------
  it('18: H4★ + H4★ → h-pair (100% fill)', () => {
    const items = [H(1, 4), H(2, 4)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2]);
    expect(rows[0]!.templateKey).toEqual({ h: 2, v: 0 });
    // Bottom-up merge: produces a valid combined tree
    const bt = rows[0]!.boxTree;
    expect(bt.type).toBe('combined');
    expect(boxTreeLeafIds(bt).sort()).toEqual([1, 2]);
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
    // Bottom-up merge: produces a valid combined tree
    const bt = rows[0]!.boxTree;
    expect(bt.type).toBe('combined');
    expect(boxTreeLeafIds(bt).sort()).toEqual([1, 2, 3]);
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
    expect(rows[0]!.label).toBe('compose-5');
  });

  // ---------------------------------------------------------------
  // Test 21: Large mixed collection — 15 images
  // ---------------------------------------------------------------
  it('21: large mixed collection (15 images) — all items consumed', () => {
    const items = [
      H(1, 5), // standalone
      H(2, 4),
      V(3, 3),
      V(4, 3), // DVP
      H(5, 3),
      H(6, 3),
      H(7, 3), // triple
      V(8, 2),
      V(9, 2), // vertical pair (fill too low)
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

    // First row should be H5★ standalone
    expect(rows[0]!.label).toBe('compose-1');
    expect(rowIds(rows[0]!)).toEqual([1]);
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
      // Bottom-up merge produces a valid 2-leaf combined tree
      const bt = acToBoxTree(ac);
      expect(bt.type).toBe('combined');
      expect(boxTreeLeafIds(bt).sort()).toEqual([1, 2]);
    });

    it('looks up 1-2 with dominant → DVP', () => {
      const imgs = [makeImg(1, 'H', 4), makeImg(2, 'V', 3), makeImg(3, 'V', 3)];
      const { composition: ac } = lookupComposition(imgs);
      // Bottom-up merge produces a valid 3-leaf combined tree
      const bt = acToBoxTree(ac);
      expect(bt.type).toBe('combined');
      expect(boxTreeLeafIds(bt).sort()).toEqual([1, 2, 3]);
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

    it('uses compose-N label for 6+ images', () => {
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
      expect(label).toBe('compose-6');
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
