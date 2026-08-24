/**
 * Characterization Tests for buildRows() and buildAtomic()
 *
 * These tests capture the output of buildRows()/buildAtomic() as a regression
 * safety net. They assert on:
 *
 * - Number of rows returned
 * - components array per row (which items, in what order)
 * - boxTree structure per row (full tree shape)
 *
 * Rows that under-fill their width budget are padded by buildRows with a blank
 * spacer (see {@link realTree}); these tests characterize the composition of the
 * real items, so they unwrap it. Test 24 characterizes the wrapper itself.
 *
 * This file holds only the numbered end-to-end scenario pins. Type-level coverage
 * for toImageType, the AtomicComponent builders and acToBoxTree lives in
 * rowCombination.test.ts — do not add a second copy here.
 */

import { LAYOUT } from '@/app/constants';
import { type BoxTree, buildRows, type RowResult } from '@/app/utils/rowCombination';
import { realTree } from '@/tests/fixtures/boxTreeHelpers';
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
    expect(realTree(rows[0]!.boxTree).type).toBe('leaf');
    expect(boxTreeShape(realTree(rows[0]!.boxTree))).toBe('L(1)');
  });

  // ---------------------------------------------------------------
  // Test 2: V5★ + V5★ — 2 verticals
  // Penalty retired: V5★ P=5.0, Hv≈1.68. 2×1.68≈3.35, fill≈42% of rw=8 (verticals
  // cost little horizontal space) — they still pair into the one available row.
  // ---------------------------------------------------------------
  it('2: V5★ + V5★ → 2 verticals (~42% fill)', () => {
    const items = [V(1, 5), V(2, 5)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2]);
    expect(boxTreeShape(realTree(rows[0]!.boxTree))).toBe('H(L(1),L(2))');
  });

  // ---------------------------------------------------------------
  // Test 3: H3★ + H3★ — greedy sequential fill
  // H3★ P=2.5, Hv≈2.11. 2×2.11≈4.22, fill≈53% of rw=8 → row incomplete with 2
  // items (still pairs since there are only two).
  // ---------------------------------------------------------------
  it('3: H3★ + H3★ → 2 horizontals (~53% fill, below complete)', () => {
    const items = [H(1, 3), H(2, 3)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2]);
    expect(boxTreeShape(realTree(rows[0]!.boxTree))).toBe('H(L(1),L(2))');
  });

  // ---------------------------------------------------------------
  // Test 4: V2★ + V2★ — greedy sequential fill
  // Penalty retired: V2★ P=1.75, Hv≈0.99. 2×0.99≈1.98, fill≈25% of rw=8.
  // ---------------------------------------------------------------
  it('4: V2★ + V2★ → 2 verticals (~25% fill)', () => {
    const items = [V(1, 2), V(2, 2)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2]);
    expect(boxTreeShape(realTree(rows[0]!.boxTree))).toBe('H(L(1),L(2))');
  });

  // ---------------------------------------------------------------
  // Test 5: H4★ + V1★ + V1★ — dominant H + V-pair beside it
  // Penalty retired: H4★ Hv≈2.49, V1★ P=1.25/Hv≈0.84. Total≈4.17, fill≈52% of
  // rw=8. The dominant H4★ takes the left slot; the two V1★ sit beside it.
  // Area-to-value: equity-primary now pairs the two equal-P V1★ side by side
  // (H(L2,L3)) so they render EQUAL area, rather than stacking them (the old
  // V(L2,L3), where the gapless-vs-gap divergence sized them unevenly). Same
  // shape family, strictly more equitable for two identical-rating verticals.
  // ---------------------------------------------------------------
  it('5: H4★ + V1★ + V1★ → H(leaf, H(leaf,leaf)) (~52% fill)', () => {
    const items = [H(1, 4), V(2, 1), V(3, 1)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3]);
    // main | H(V1, V1) — the two equal V1★ paired side by side (equal area)
    expect(boxTreeShape(realTree(rows[0]!.boxTree))).toBe('H(L(1),H(L(2),L(3)))');
  });

  // ---------------------------------------------------------------
  // Test 6: H4★ + V2★ — H + V
  // Penalty retired: H4★ Hv≈2.49, V2★ P=1.75/Hv≈0.99. Total≈3.49, fill≈44% of rw=8.
  // ---------------------------------------------------------------
  it('6: H4★ + V2★ → H + V (~44% fill)', () => {
    const items = [H(1, 4), V(2, 2)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2]);
    expect(boxTreeShape(realTree(rows[0]!.boxTree))).toBe('H(L(1),L(2))');
  });

  // ---------------------------------------------------------------
  // Test 7: H2★ + H2★ + H2★ — 3 horizontals
  // H2★ P=1.75, Hv≈1.76. 3×1.76≈5.29, fill≈66% of rw=8 → row incomplete.
  // ---------------------------------------------------------------
  it('7: H2★ + H2★ + H2★ → 3 horizontals (~66% fill)', () => {
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
  // Penalty retired: H1★ Hv≈1.49, V1★ Hv≈0.84. 3×1.49 + 2×0.84 ≈ 6.15, fill≈77% of rw=8.
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
  // Test 9: V1★ + H5★ + H3★ + H3★ — width-cost (Hv) packing at rw=8
  // Hv: V1≈0.84, H5≈2.98, H3≈2.11. Sum of all four ≈ 8.04 (fill≈100.5%), so
  // under the cheaper Hv scale all four pack into ONE row.
  // Area-to-value: the equity-primary composer now gives the H5★ (P 5.0, the
  // row's dominant value) its own top-level column and stacks the two equal H3★
  // beneath the H5★ → H(L1, V(L2, H(L3,L4))). The H5★ renders BIGGEST (≈405k px²)
  // and the two equal H3★ render equal — vs the old uniform 2×2 that sized the
  // 5★ no larger than the 3★s. Strictly better area-tracks-value for the hero.
  // ---------------------------------------------------------------
  it('9: V1★ + H5★ + H3★ + H3★ → H5★ gets its own column (hero biggest)', () => {
    const items = [V(1, 1), H(2, 5), H(3, 3), H(4, 3)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3, 4]);
    expect(boxTreeShape(realTree(rows[0]!.boxTree))).toBe('H(L(1),V(L(2),H(L(3),L(4))))');
  });

  // ---------------------------------------------------------------
  // Test 10: V1★ + V2★ + H5★ — all in one row at rw=8
  // Penalty retired: V1★ Hv≈0.84, V2★ Hv≈0.99, H5★ Hv≈2.98. Total≈4.81, fill≈60%
  // of rw=8. Sequential fill takes all 3, best-fit completes.
  // Area-to-value: the H5★ (P 5.0) renders BIGGEST (≈328k px²) as its own column
  // while the two low-rated verticals sit beside it as a flat H-pair → H(L1,H(L2,L3))
  // (was H(V(L1,L2),L3), which stacked the verticals into a tall left column that
  // oversized the low-P pair). New shape sizes the 5★ dominant — area tracks value.
  // ---------------------------------------------------------------
  it('10: V1★ + V2★ + H5★ → H5★ dominant, verticals beside it', () => {
    const items = [V(1, 1), V(2, 2), H(3, 5)];
    const rows = buildRows(items, DESKTOP);

    // All 3 in one row → H(leaf-V1, H(V2, H5)) — the 5★ horizontal is the biggest
    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3]);
    expect(boxTreeShape(realTree(rows[0]!.boxTree))).toBe('H(L(1),H(L(2),L(3)))');
  });

  // ---------------------------------------------------------------
  // Test 11: 4 verticals (V3★, V1★, V1★, V1★)
  // Penalty retired: V3★ eff=3, V1★ eff=1 (was 2 and 0). Penalty-free
  // point-balance (total 6, half 3) splits exactly after the V3★, so the
  // top-rated vertical claims its own top-level slot instead of being paired.
  // ---------------------------------------------------------------
  it('11: V3★ + V1★ + V1★ + V1★ → hero V3★ splits off, rest nest', () => {
    const items = [V(1, 3), V(2, 1), V(3, 1), V(4, 1)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3, 4]);

    // Builds: H( V3★, H( V1★, V(V1★,V1★) ) ) — the top-rated V3★ takes the left
    // slot as a single leaf; the three V1★ nest on the right.
    const tree = realTree(rows[0]!.boxTree);
    expect(tree.type).toBe('combined');
    if (tree.type === 'combined') {
      expect(tree.direction).toBe('horizontal');
      // Left side: the V3★ hero as a single leaf
      expect(tree.children[0].type).toBe('leaf');
      // Right side: the remaining three verticals nested under a horizontal pair
      expect(tree.children[1].type).toBe('combined');
      if (tree.children[1].type === 'combined') {
        expect(tree.children[1].direction).toBe('horizontal');
      }
    }
  });

  // ---------------------------------------------------------------
  // Test 12: 10 mixed images — realistic collection
  // Penalty retired; packing cost is the width-cost Hv against rw=8:
  // H5★ Hv≈2.98, H4★ Hv≈2.49, V3★ Hv≈1.19, H3★ Hv≈2.11,
  // V1★ Hv≈0.84, H2★ Hv≈1.76, V2★ Hv≈0.99
  // ---------------------------------------------------------------
  it('12: 10 mixed images — realistic collection end-to-end', () => {
    const items = [
      H(1, 5), // Hv≈2.98
      H(2, 4), // Hv≈2.49
      V(3, 3), // eff=3, Hv≈1.19
      V(4, 3), // eff=3, Hv≈1.19
      H(5, 3), // Hv≈2.11
      H(6, 3), // Hv≈2.11
      H(7, 3), // Hv≈2.11
      V(8, 1), // eff=1, Hv≈0.84
      H(9, 2), // Hv≈1.76
      V(10, 2), // eff=2, Hv≈0.99
    ];
    const rows = buildRows(items, DESKTOP);

    // Every item should appear exactly once
    const allIds = rows.flatMap(r => rowIds(r)).sort((a, b) => a - b);
    expect(allIds).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    // Hv packs cheaper than cv, so each row holds more. Row 1 now takes 4 items
    // (H5★+H4★ + the two V3★) at AR 2.02; Row 2 takes the three H3★ plus V1★+H2★
    // (5 items, AR 1.90). That leaves the trailing V2★ as a lone leftover row —
    // a low-rated vertical orphan, the expected leftover of the denser packing.
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3, 4]);
    expect(rowIds(rows[1]!)).toEqual([5, 6, 7, 8, 9]);
    expect(rowIds(rows[2]!)).toEqual([10]);

    expect(rows).toHaveLength(3);
  });

  // ---------------------------------------------------------------
  // Test 13: All 3★ images (uniform rating, degenerate case)
  // ---------------------------------------------------------------
  it('13: all 3★ images (uniform rating)', () => {
    const items = [H(1, 3), H(2, 3), H(3, 3), H(4, 3), H(5, 3), H(6, 3)];
    const rows = buildRows(items, DESKTOP);

    // Hv(H3)≈2.108. 4×2.108=8.43 → 105% fills the rw=8 budget, so the first row
    // takes 4 (a balanced 2×2 at AR 1.778) and the remaining 2 pair off — vs the
    // old cv scale (cv 2.5) which fit only 3 per row.
    expect(rows).toHaveLength(2);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3, 4]);
    expect(rowIds(rows[1]!)).toEqual([5, 6]);
  });

  // ---------------------------------------------------------------
  // Test 14: Single V1★ (leftovers / final row)
  // ---------------------------------------------------------------
  it('14: single V1★ → single-item row', () => {
    const items = [V(1, 1)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1]);
    expect(realTree(rows[0]!.boxTree).type).toBe('leaf');
  });

  // ---------------------------------------------------------------
  // Test 15: H4★ + H3★ + V1★ + H2★ + V1★ — with rw=8
  // Penalty retired; width-cost Hv: H4★≈2.49, H3★≈2.11, V1★≈0.84, H2★≈1.76
  // Cumulative/8: 2.49(31%) + 2.11→4.60(58%) + 0.84→5.44(68%) + 1.76→7.21(90%✓)
  // → complete at 4. Actual: [1,2,3,4] → 3H + 1V
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
  // Penalty retired; width-cost Hv: H3★≈2.11, V1★≈0.84
  // Cumulative/8: 2.11(26%) + 0.84→2.95(37%) + 0.84→3.79(47%) + 2.11→5.89(74%)
  // These are the only four items, so they all land in the one row → 2H + 2V.
  // ---------------------------------------------------------------
  it('16: H3★ + V1★ + V1★ + H3★ → sequential fill (no best-fit needed)', () => {
    const items = [H(1, 3), V(2, 1), V(3, 1), H(4, 3)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3, 4]);
  });

  // ---------------------------------------------------------------
  // Test 17: V4★ + H3★ + H4★ + H1★ — width-cost (Hv) packing at rw=8
  // Hv: V4≈2.05, H3≈2.11, H4≈2.49, H1≈1.49. Sum ≈ 8.14 (fill≈102%), so under
  // the cheaper Hv scale all four pack into ONE row.
  // Area-to-value: the equity-primary composer now gives the leading V4★ (P 3.5,
  // the row's highest value) its OWN full-height left column → H(L1, V(L2, V(L3,L4))),
  // so the 4★ vertical hero renders BIGGEST (≈670k px²). The old uniform 2×2
  // sized the V4★ no larger than the H1★. The H4★/H1★ stacked in the right column
  // render equal (an accepted within-stack same-slot residual covered by the
  // no-inversion tolerance) — but the HERO is now correctly dominant.
  // ---------------------------------------------------------------
  it('17: V4★ + H3★ + H4★ + H1★ → V4★ hero gets its own column', () => {
    const items = [V(1, 4), H(2, 3), H(3, 4), H(4, 1)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3, 4]);
    expect(boxTreeShape(realTree(rows[0]!.boxTree))).toBe('H(L(1),V(L(2),V(L(3),L(4))))');
  });

  // ---------------------------------------------------------------
  // Test 18: H4★ + H4★ — 2 horizontals (100% fill)
  // ---------------------------------------------------------------
  it('18: H4★ + H4★ → 2 horizontals (~62% fill)', () => {
    const items = [H(1, 4), H(2, 4)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2]);
    expect(boxTreeShape(realTree(rows[0]!.boxTree))).toBe('H(L(1),L(2))');
  });

  // ---------------------------------------------------------------
  // Test 19: H4★ + V3★ + V3★ — dominant H + stacked V-pair (100% fill)
  // ---------------------------------------------------------------
  it('19: H4★ + V3★ + V3★ → H(leaf, V(leaf,leaf)) (~61% fill)', () => {
    const items = [H(1, 4), V(2, 3), V(3, 3)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3]);
    expect(boxTreeShape(realTree(rows[0]!.boxTree))).toBe('H(L(1),V(L(2),L(3)))');
  });

  // ---------------------------------------------------------------
  // Test 20: 5 H1★ images — single-row fallback
  // H1★ P=1.25, Hv≈1.49, all same rating (eff=1)
  // 3×1.49≈4.47, fill≈56% of rw=8 → isRowComplete fails for 3
  // 5×1.49≈7.46, fill≈93% → all 5 fill into one row
  // ---------------------------------------------------------------
  it('20: 5 H1★ images → single-row fallback', () => {
    const items = [H(1, 1), H(2, 1), H(3, 1), H(4, 1), H(5, 1)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3, 4, 5]);
  });

  // ---------------------------------------------------------------
  // Test 21: Large mixed collection — 15 images
  // With rw=8, a normal H5★ never solos: Hv≈2.98, fraction≈0.37 < the 0.5
  // HERO_SOLO_WIDTH_FRACTION bar (only a wide panorama would clear it).
  // ---------------------------------------------------------------
  it('21: large mixed collection (15 images) — all items consumed', () => {
    const items = [
      H(1, 5), // Hv≈2.98
      H(2, 4), // Hv≈2.49
      V(3, 3),
      V(4, 3), // V3★ eff=3, Hv≈1.19 each (penalty retired)
      H(5, 3),
      H(6, 3),
      H(7, 3), // Hv≈2.11 each
      V(8, 2),
      V(9, 2), // V2★ eff=2, Hv≈0.99 each
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

    // First row under Hv: H5★+H4★ (Hv 2.98+2.49=5.48, only 68%) doesn't fill the
    // budget, so the two trailing V3★ join → [1,2,3,4] at AR 2.02. (Under the old
    // cv scale H5+H4 = 8.5 = 106% closed the row at 2.)
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3, 4]);
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
      const leafIds = boxTreeLeafIds(realTree(row.boxTree));
      // BoxTree leaves should contain exactly the same items as components
      // (order may differ for a 2×2 nested shape, but content should match)
      expect(leafIds.sort((a, b) => a - b)).toEqual(componentIds.sort((a, b) => a - b));
    }
  });

  // ---------------------------------------------------------------
  // Test 24: blank width-padding wrapper — the raw shape every test above
  // hides behind realTree(). A single H5★ carries Hv 2.98, only 37% of the
  // rw=8 budget, so buildRows wraps it with a trailing blank rather than
  // letting calculateSizesFromBoxTree stretch it to the full page width.
  // ---------------------------------------------------------------
  it('24: under-filled row → real subtree wrapped with a blank right sibling', () => {
    const rows = buildRows([H(1, 5)], DESKTOP);

    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),L(-1000000))');
    // components stay real-only — the blank exists only in the boxTree
    expect(rowIds(rows[0]!)).toEqual([1]);
  });
});
