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
  // Penalty retired: V5★ P=5.0, Hv≈1.68. 2×1.68≈3.35, fill≈42% of rw=8 (verticals
  // cost little horizontal space) — they still pair into the one available row.
  // ---------------------------------------------------------------
  it('2: V5★ + V5★ → 2 verticals (~42% fill)', () => {
    const items = [V(1, 5), V(2, 5)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2]);
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),L(2))');
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
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),L(2))');
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
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),L(2))');
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
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),H(L(2),L(3)))');
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
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),L(2))');
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
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),V(L(2),H(L(3),L(4))))');
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
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),H(L(2),L(3)))');
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
    const tree = rows[0]!.boxTree;
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
    expect(rows[0]!.boxTree.type).toBe('leaf');
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
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),V(L(2),V(L(3),L(4))))');
  });

  // ---------------------------------------------------------------
  // Test 18: H4★ + H4★ — 2 horizontals (100% fill)
  // ---------------------------------------------------------------
  it('18: H4★ + H4★ → 2 horizontals (~62% fill)', () => {
    const items = [H(1, 4), H(2, 4)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2]);
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),L(2))');
  });

  // ---------------------------------------------------------------
  // Test 19: H4★ + V3★ + V3★ — dominant H + stacked V-pair (100% fill)
  // ---------------------------------------------------------------
  it('19: H4★ + V3★ + V3★ → H(leaf, V(leaf,leaf)) (~61% fill)', () => {
    const items = [H(1, 4), V(2, 3), V(3, 3)];
    const rows = buildRows(items, DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rowIds(rows[0]!)).toEqual([1, 2, 3]);
    expect(boxTreeShape(rows[0]!.boxTree)).toBe('H(L(1),V(L(2),L(3)))');
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
      const img = toImageType(item);

      expect(img.source).toBe(item);
      expect(img.ar).toBe('H');
      expect(img.numericAR).toBeCloseTo(1.7778, 3);
      expect(img.effectiveRating).toBe(4); // horizontal, no penalty
    });

    it('should convert a vertical image with no penalty (retired)', () => {
      const item = V(2, 3);
      const img = toImageType(item);

      expect(img.source).toBe(item);
      expect(img.ar).toBe('V');
      expect(img.numericAR).toBeCloseTo(0.5625);
      expect(img.effectiveRating).toBe(3); // V3★ → eff 3 (penalty retired; was 2)
    });

    it('should handle V1★ → effective 1 (penalty retired)', () => {
      const item = V(3, 1);
      const img = toImageType(item);

      expect(img.ar).toBe('V');
      expect(img.numericAR).toBeCloseTo(0.5625);
      expect(img.effectiveRating).toBe(1); // was 0 under the penalty
    });

    it('should preserve source reference', () => {
      const item = H(5, 5);
      const img = toImageType(item);
      expect(img.source).toBe(item); // Same object reference
    });
  });

  describe('AtomicComponent builders', () => {
    const makeImg = (id: number, ar: 'H' | 'V', rating: number): ImageType => {
      const item = ar === 'H' ? H(id, rating) : V(id, rating);
      return toImageType(item);
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
      return toImageType(item);
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

      const main = toImageType(mainItem);
      const sec1 = toImageType(sec1Item);
      const sec2 = toImageType(sec2Item);

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
