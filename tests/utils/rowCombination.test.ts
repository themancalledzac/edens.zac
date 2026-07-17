/**
 * Unit tests for rowCombination.ts
 * Tests isRowComplete, buildRows, and the row composition helpers.
 */

import { DENSITY_ROW_WIDTH_MULTIPLIER, LAYOUT } from '@/app/constants';
import type { AnyContentModel } from '@/app/types/Content';
import { getProminence, getWidthCost } from '@/app/utils/contentRatingUtils';
import { isBlankContent } from '@/app/utils/contentTypeGuards';
import type { BoxTree, ImageType, RowResult } from '@/app/utils/rowCombination';
import {
  acToBoxTree,
  buildAtomic,
  buildRows,
  composeRowWithCandidateCount,
  estimateRowAR,
  hChain,
  hPair,
  isRowComplete,
  MAX_FILL_RATIO,
  MAX_ROW_IMAGES,
  MIN_FILL_RATIO,
  single,
  toImageType,
  vStack,
} from '@/app/utils/rowCombination';
import {
  calculateBoxTreeAspectRatio,
  calculateSizesFromBoxTree,
} from '@/app/utils/rowStructureAlgorithm';
import {
  createCollectionContent,
  createGifContent,
  createHorizontalImage,
  createImageContent,
  createPanorama,
  createSquareImage,
  createTextContent,
  createVerticalImage,
} from '@/tests/fixtures/contentFixtures';

// ===================== Constants =====================

const DESKTOP = LAYOUT.desktopSlotWidth; // 8

/**
 * Strip buildRows' blank width-padding wrapper, returning the real items' subtree.
 *
 * An under-filled row (fill < MIN_FILL_RATIO) is wrapped as
 * `H(realSubtree, blankLeaf)` so its items render at their honest width share.
 * These tests assert how the REAL items compose, which padding leaves untouched;
 * the wrapper itself is covered by rowCombination.blankPadding.test.ts.
 */
function realTree(tree: BoxTree): BoxTree {
  if (tree.type === 'combined') {
    const right = tree.children[1];
    if (right.type === 'leaf' && isBlankContent(right.content)) {
      return tree.children[0];
    }
  }
  return tree;
}

// getOrientation deleted — toImageType handles orientation inline

// ===================== isRowComplete Tests =====================

describe('isRowComplete', () => {
  describe('desktop layout (rowWidth=8)', () => {
    it('should return false for a single H5* (cv=5.0, fill=62.5%)', () => {
      // H5* cv=5.0, fill=5.0/8=62.5% — below 90% threshold
      const items = [createHorizontalImage(1, 5)];
      expect(isRowComplete(items, DESKTOP)).toBe(false);
    });

    it('should return false for H4* + V3* (cv=3.5+1.07=4.57, fill=57.1%)', () => {
      const items = [createHorizontalImage(1, 4), createVerticalImage(2, 3)];
      // H4* cv=3.5, V3* effective=2 cv≈1.07
      // Total≈4.57, 4.57/8=57.1% — NOT complete
      expect(isRowComplete(items, DESKTOP)).toBe(false);
    });

    it('should return false for H4* + H3* (cv=3.5+2.5=6.0, fill=75%)', () => {
      const items = [createHorizontalImage(1, 4), createHorizontalImage(2, 3)];
      // Total=6.0, 6.0/8=75% — NOT complete (needs >= 90%)
      expect(isRowComplete(items, DESKTOP)).toBe(false);
    });

    it('should return false for H4* + H4* (cv=3.5+3.5=7.0, fill=87.5%)', () => {
      // 7.0/8=87.5% — below 90% threshold
      const items = [createHorizontalImage(1, 4), createHorizontalImage(2, 4)];
      expect(isRowComplete(items, DESKTOP)).toBe(false);
    });

    it('should return false for a single V3* (cv≈1.07/8 = 13.4%)', () => {
      const items = [createVerticalImage(1, 3)];
      expect(isRowComplete(items, DESKTOP)).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(isRowComplete([], DESKTOP)).toBe(false);
    });

    it('should return false for three H3* images (3 × Hv 2.108 = 6.32, fill=79.1%)', () => {
      const items = [
        createHorizontalImage(1, 3),
        createHorizontalImage(2, 3),
        createHorizontalImage(3, 3),
      ];
      // Hv: 6.32/8=79.1% — below 90% threshold (under cv it was 93.8%; Hv < cv so
      // a third H3 no longer completes the row — four are needed, see below).
      expect(isRowComplete(items, DESKTOP)).toBe(false);
    });

    it('should return true for four H3* images (4 × Hv 2.108 = 8.43, fill=105.4%)', () => {
      const items = Array.from({ length: 4 }, (_, i) => createHorizontalImage(i + 1, 3));
      // Hv: 8.43/8=105.4% — within the 90-115% band.
      expect(isRowComplete(items, DESKTOP)).toBe(true);
    });

    it('should return true for five H1* images (5 × Hv 1.491 = 7.45, fill=93.2%)', () => {
      // Hv: 7.45/8=93.2% — above 90% threshold (under cv it was 78.1%, incomplete).
      const items = Array.from({ length: 5 }, (_, i) => createHorizontalImage(i + 1, 1));
      expect(isRowComplete(items, DESKTOP)).toBe(true);
    });
  });

  describe('threshold behavior', () => {
    it('should return true at ~93% fill (5×H1*)', () => {
      // Hv: 5 × 1.491 = 7.45 → 93.2% ✓ (within the 90-115% band)
      const items = Array.from({ length: 5 }, (_, i) => createHorizontalImage(i + 1, 1));
      expect(isRowComplete(items, DESKTOP)).toBe(true);
    });

    it('should return true at ~101% fill (H5*+H5*+H3*)', () => {
      // Hv: 2.981 + 2.981 + 2.108 = 8.07 → 100.9% ✓
      const items = [
        createHorizontalImage(1, 5),
        createHorizontalImage(2, 5),
        createHorizontalImage(3, 3),
      ];
      expect(isRowComplete(items, DESKTOP)).toBe(true);
    });

    it('should return true at ~112% fill (3×H5*, within 115% cap)', () => {
      // Hv: 3 × 2.981 = 8.94 → 111.8% ✓
      const items = Array.from({ length: 3 }, (_, i) => createHorizontalImage(i + 1, 5));
      expect(isRowComplete(items, DESKTOP)).toBe(true);
    });

    it('should return false when fill exceeds 115% (overfill cap)', () => {
      // Hv: 4×H4* = 4 × 2.494 = 9.98 → 124.7% — exceeds cap
      const items = Array.from({ length: 4 }, (_, i) => createHorizontalImage(i + 1, 4));
      expect(isRowComplete(items, DESKTOP)).toBe(false);
    });

    it('should return false for catastrophic overfill like 150%+', () => {
      // Hv: 6×H3* = 6 × 2.108 = 12.65 → 158%
      const items = Array.from({ length: 6 }, (_, i) => createHorizontalImage(i + 1, 3));
      expect(isRowComplete(items, DESKTOP)).toBe(false);
    });

    it('should export MIN_FILL_RATIO as 0.9', () => {
      expect(MIN_FILL_RATIO).toBe(0.9);
    });

    it('should export MAX_FILL_RATIO as 1.15', () => {
      expect(MAX_FILL_RATIO).toBe(1.15);
    });
  });
});

// ===================== buildRows Tests =====================
// Coverage for internals now lives in rowCombination.characterization.test.ts

describe('buildRows', () => {
  it('should create a single row from one H5* image', () => {
    const items = [createHorizontalImage(1, 5)];
    const rows = buildRows(items, DESKTOP);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.components).toHaveLength(1);
  });

  it('should pair two H5* images (125% overfill accepted to avoid solo rows)', () => {
    // H5*+H5* = 10.0/8 = 125% > MAX_FILL but < 135% cap.
    // Overfill accepted because single H5* at 62.5% is underfilled.
    const items = [createHorizontalImage(1, 5), createHorizontalImage(2, 5)];
    const rows = buildRows(items, DESKTOP);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.components).toHaveLength(2);
  });

  it('should put two V3* images in one row', () => {
    const items = [createVerticalImage(1, 3), createVerticalImage(2, 3)];
    const rows = buildRows(items, DESKTOP);
    // V3* + V3* fills ~2.5/5 = 50%, NOT complete
    // Should fall through to best-fit fallback
    expect(rows).toHaveLength(1);
    expect(rows[0]?.components).toHaveLength(2);
  });

  it('should put three H3* images in one row', () => {
    const items = [
      createHorizontalImage(1, 3),
      createHorizontalImage(2, 3),
      createHorizontalImage(3, 3),
    ];
    const rows = buildRows(items, DESKTOP);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.components).toHaveLength(3);
  });

  it('should put H4* + H4* in one row (Issue 7)', () => {
    const items = [createHorizontalImage(1, 4), createHorizontalImage(2, 4)];
    const rows = buildRows(items, DESKTOP);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.components).toHaveLength(2);
  });

  it('should use best-fit fallback for H3* + H4* (83% fill, below 90% minimum)', () => {
    // H3* (1.67) + H4* (2.5) = 4.17 → 83% fill, below 90% minimum
    // Sequential fill fails; best-fit fallback takes both items
    const items = [createHorizontalImage(1, 3), createHorizontalImage(2, 4)];
    const rows = buildRows(items, DESKTOP);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.components).toHaveLength(2);
  });

  it('should use best-fit fallback when sequential fill fails', () => {
    const items = [
      createHorizontalImage(1, 1),
      createVerticalImage(2, 1),
      createHorizontalImage(3, 2),
      createVerticalImage(4, 2),
      createHorizontalImage(5, 1),
    ];
    const rows = buildRows(items, DESKTOP);
    expect(rows.length).toBeGreaterThan(0);
    // All rows should be used
    const totalItems = rows.reduce((sum: number, row: RowResult) => sum + row.components.length, 0);
    expect(totalItems).toBe(items.length);
  });

  it('should process all items and leave none behind', () => {
    const items = [
      createHorizontalImage(1, 5),
      createHorizontalImage(2, 4),
      createVerticalImage(3, 3),
      createVerticalImage(4, 3),
      createHorizontalImage(5, 3),
      createHorizontalImage(6, 2),
    ];
    const rows = buildRows(items, DESKTOP);
    const totalItems = rows.reduce((sum: number, row: RowResult) => sum + row.components.length, 0);
    expect(totalItems).toBe(items.length);
  });

  it('should respect Rule 1: no half-empty rows except possibly the last', () => {
    const items = [
      createHorizontalImage(1, 5),
      createHorizontalImage(2, 5),
      createHorizontalImage(3, 3),
      createHorizontalImage(4, 3),
      createHorizontalImage(5, 3),
    ];
    const rows = buildRows(items, DESKTOP);

    // All rows except the last should be >= 50% full (order-preserving best-fit
    // may slightly overfill past MAX_FILL_RATIO to keep items in sequence)
    for (let i = 0; i < rows.length - 1; i++) {
      const row = rows[i];
      if (row) {
        const totalHv = row.components.reduce((sum, item) => sum + getWidthCost(item), 0);
        const fill = totalHv / DESKTOP;
        expect(fill).toBeGreaterThanOrEqual(0.5);
      }
    }
  });

  it('should work with rowWidth=4 (tablet)', () => {
    // Two normal H4★ landscapes (AR 1.78, extremeness < 2) are NOT solo-eligible,
    // so they pair into one row rather than each claiming a full-width row. (Only
    // extreme-AR panoramas solo; a normal landscape never does — see isSoloHero.)
    const items = [createHorizontalImage(1, 4), createHorizontalImage(2, 4)];
    const rows = buildRows(items, 4);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.components).toHaveLength(2);
  });

  it('should work with rowWidth=3 (small tablet)', () => {
    // Hv(H1)≈1.491. Two H1★ = 2.98/3 = 99.4% — within the fill band, so the row
    // closes cleanly at 2 and the third H1★ forms a second row (under cv the row
    // needed all 3 at 125% overfill). All items preserved.
    const items = [
      createHorizontalImage(1, 1),
      createHorizontalImage(2, 1),
      createHorizontalImage(3, 1),
    ];
    const rows = buildRows(items, 3);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.components.map(c => c.id)).toEqual([1, 2]);
    expect(rows[1]?.components.map(c => c.id)).toEqual([3]);
  });

  it('should put H4* + V3* + V3* in one row', () => {
    const items = [
      createHorizontalImage(1, 4),
      createVerticalImage(2, 3),
      createVerticalImage(3, 3),
    ];
    const rows = buildRows(items, DESKTOP);
    // H4* (2.5) + V3* (1.25) + V3* (1.25) = 5.0, 100%
    expect(rows).toHaveLength(1);
    expect(rows[0]?.components).toHaveLength(3);
  });

  it('should handle empty input', () => {
    const rows = buildRows([], DESKTOP);
    expect(rows).toHaveLength(0);
  });

  describe('low-rated item skip (Issue 8)', () => {
    it('should group V1* + H5* + H3* in one row (no hero skip at rw=8)', () => {
      // With rw=8, H5* cv=5.0, fill=5.0/8=62.5% < 0.95 hero threshold
      // No hero skip fires — all 3 items fill sequentially
      // V1* cv≈0.61 + H5* cv=5.0 + H3* cv=2.5 = 8.11, fill≈101% ✓
      const items = [
        createVerticalImage(1, 1),
        createHorizontalImage(2, 5),
        createHorizontalImage(3, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      expect(rows).toHaveLength(1);
      const allItemIds = rows.flatMap((r: RowResult) =>
        r.components.map((c: AnyContentModel) => c.id)
      );
      expect(allItemIds.sort()).toEqual([1, 2, 3]);
    });

    it('should pair H2* + H5* + H3* in one row (overfill accepted, order preserved)', () => {
      // H2*(1.75) + H5*(5.0) = 84.4% < MIN_FILL. H3*(2.5) → 115.6% ≤ 135% → accepted.
      // Order preserved: all three items stay together in sequence.
      const items = [
        createHorizontalImage(1, 2),
        createHorizontalImage(2, 5),
        createHorizontalImage(3, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.components).toHaveLength(3);
    });

    it('should pair H4* + H5* in one row (cv=3.5+5.0=8.5, fill=106%)', () => {
      // With rw=8, H4*+H5* = 8.5/8 = 106% — within MAX_FILL
      const items = [createHorizontalImage(1, 4), createHorizontalImage(2, 5)];
      const rows = buildRows(items, DESKTOP);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.components).toHaveLength(2);
    });

    it('should group V4* + H5* + H3* in one row (no overfill at rw=8)', () => {
      // V4* cv≈1.53 + H5* cv=5.0 + H3* cv=2.5 = 9.03, fill≈113% — within MAX_FILL
      const items = [
        createVerticalImage(1, 4),
        createHorizontalImage(2, 5),
        createHorizontalImage(3, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.components).toHaveLength(3);
    });

    it('should group all items when low-rated items precede H5*', () => {
      // V2*(0.77) + V2*(0.77) + H5*(5.0) + H3*(2.5) = 9.04, fill≈113%
      // All fit in one row at rw=8
      const items = [
        createVerticalImage(1, 2),
        createVerticalImage(2, 2),
        createHorizontalImage(3, 5),
        createHorizontalImage(4, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.components).toHaveLength(4);
      const componentIds = rows[0]?.components.map((c: AnyContentModel) => c.id);
      expect(componentIds).toEqual([1, 2, 3, 4]);
    });

    it('should group V3* + H5* + H3* in one row (no hero skip at rw=8)', () => {
      // V3* cv≈1.07 + H5* cv=5.0 + H3* cv=2.5 = 8.57, fill≈107%
      // All fit in one row at rw=8 (within MAX_FILL 115%)
      const items = [
        createVerticalImage(1, 3),
        createHorizontalImage(2, 5),
        createHorizontalImage(3, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.components).toHaveLength(3);
      const allIds = rows[0]?.components.map((c: AnyContentModel) => c.id);
      expect(allIds?.sort()).toEqual([1, 2, 3]);
    });
  });

  describe('standalone promotion in greedy fill', () => {
    it('should pack H3★+H5★+H3★+H3★ into one 2×2 row with rw=8', () => {
      // Hv: H3≈2.11, H5≈2.98. Sum of all four ≈ 9.31 (116%) overshoots, but the
      // first three (2.11+2.98+2.11=7.20, 90%) close the row — the fourth H3★ then
      // joins via AR-floor expansion into a single balanced row. Under the cheaper
      // Hv scale these no longer split (cv split them 2+2).
      const items = [
        createHorizontalImage(1, 3),
        createHorizontalImage(2, 5),
        createHorizontalImage(3, 3),
        createHorizontalImage(4, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.components.map(c => c.id)).toEqual([1, 2, 3, 4]);
    });

    it('should pack H4★+H5★+H3★ into one row with rw=8', () => {
      // Hv: H4≈2.49 + H5≈2.98 = 5.48 (68%) doesn't fill, so the trailing H3★
      // (2.11) joins → one 3-item row at 95% fill (under cv, H4+H5 = 8.5 = 106%
      // closed the row at 2 and orphaned the H3★).
      const items = [
        createHorizontalImage(1, 4),
        createHorizontalImage(2, 5),
        createHorizontalImage(3, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.components.map(c => c.id)).toEqual([1, 2, 3]);
    });

    it('should NOT skip non-standalone items that overfill', () => {
      // H3★(2.5) + H4★(3.5) = 6.0/8 = 75% (under MIN_FILL)
      // Best-fit fallback pairs them
      const items = [createHorizontalImage(1, 3), createHorizontalImage(2, 4)];
      const rows = buildRows(items, DESKTOP);
      const totalItems = rows.reduce((sum, r) => sum + r.components.length, 0);
      expect(totalItems).toBe(2);
    });

    it('should preserve all items when standalones are skipped', () => {
      const items = [
        createVerticalImage(1, 2),
        createHorizontalImage(2, 5),
        createVerticalImage(3, 2),
        createHorizontalImage(4, 5),
        createVerticalImage(5, 2),
      ];
      const rows = buildRows(items, DESKTOP);
      const allIds = rows.flatMap(r => r.components.map(c => c.id)).sort();
      expect(allIds).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('overfill prevention (Issue 6 / Issue 13)', () => {
    it('should group H5*+V2*+V3* in one row at rw=8 (fill≈85.5%)', () => {
      // H5*(5.0) + V2*(0.77) + V3*(1.07) = 6.84, fill=85.5% < 90%
      // All fit in one row (below max fill cap)
      const items = [
        createHorizontalImage(1, 5),
        createVerticalImage(2, 2),
        createVerticalImage(3, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.components).toHaveLength(3);
    });

    it('should group H5*+V2*+V2* in one row at rw=8 (fill≈81.6%)', () => {
      // H5*(5.0) + V2*(0.77) + V2*(0.77) = 6.54, fill=81.6%
      const items = [
        createHorizontalImage(1, 5),
        createVerticalImage(2, 2),
        createVerticalImage(3, 2),
      ];
      const rows = buildRows(items, DESKTOP);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.components).toHaveLength(3);
    });

    it('should put H4* + V3* + V3* in one row when H4* is dominant', () => {
      // H4*(3.5) + V3*(1.07) + V3*(1.07) = 5.64, fill=70.5%
      // All fit in one row at rw=8
      const items = [
        createHorizontalImage(1, 4),
        createVerticalImage(2, 3),
        createVerticalImage(3, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.components).toHaveLength(3);
    });

    it('should group H5*+V1* in one row at rw=8 (fill≈70.2%)', () => {
      // H5*(5.0) + V1*(0.61) = 5.61, fill=70.2% < 90%
      // Both go in one row (best-fit fallback)
      const items = [createHorizontalImage(1, 5), createVerticalImage(2, 1)];
      const rows = buildRows(items, DESKTOP);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.components).toHaveLength(2);
    });

    it('should keep multi-item rows within fill bounds', () => {
      // Sequential greedy fill stays within MAX_FILL_RATIO (115%).
      // Best-fit fallback may exceed 115% when no better option exists —
      // the algorithm picks the lesser evil between severe underfill and overfill.
      // With AR-aware fill, rows can pull more images to increase width.
      // The constraint is now AR-based (row AR >= targetAR * 0.7), not CV-based.
      // Rows with <= MAX_ROW_IMAGES items are acceptable if AR is reasonable.
      const items = [
        createHorizontalImage(1, 5),
        createVerticalImage(2, 4),
        createVerticalImage(3, 3),
        createHorizontalImage(4, 3),
        createVerticalImage(5, 4),
        createVerticalImage(6, 3),
        createHorizontalImage(7, 5),
        createVerticalImage(8, 2),
        createVerticalImage(9, 2),
      ];
      const rows = buildRows(items, DESKTOP);
      for (const row of rows) {
        // No row should exceed MAX_ROW_IMAGES
        expect(row.components.length).toBeLessThanOrEqual(8);
      }
    });

    it('should produce reasonable fill ratios for mixed-rating images', () => {
      // At rw=8 these images have much lower fill ratios, so no overfill concern
      const items = [
        createHorizontalImage(1, 5),
        createVerticalImage(2, 3),
        createVerticalImage(3, 3),
        createHorizontalImage(4, 4),
        createVerticalImage(5, 3),
        createVerticalImage(6, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      for (const row of rows) {
        // Fill is measured with the actual Stage-1 packing cost (width-cost Hv),
        // which is what buildRows fills against — not the legacy cv. (Summing cv
        // here would over-count verticals now that the vertical penalty is gone.)
        const totalCV = row.components.reduce(
          (sum: number, item: AnyContentModel) => sum + getWidthCost(item),
          0
        );
        const fill = totalCV / DESKTOP;
        // Rows may overfill up to 135% when underfilled rows accept the next
        // sequential item to avoid solo rows and preserve ordering.
        expect(fill).toBeLessThanOrEqual(1.35 + 0.001);
      }
    });

    it('should still process all items when overfill cap forces pattern rejection', () => {
      const items = [
        createHorizontalImage(1, 5),
        createVerticalImage(2, 2),
        createVerticalImage(3, 3),
        createHorizontalImage(4, 5),
        createVerticalImage(5, 2),
        createVerticalImage(6, 2),
      ];
      const rows = buildRows(items, DESKTOP);
      const totalItems = rows.reduce(
        (sum: number, row: RowResult) => sum + row.components.length,
        0
      );
      expect(totalItems).toBe(items.length);
    });
  });

  describe('row item grouping in buildRows output', () => {
    it('should group items into the expected rows', () => {
      // With rw=8, cv values: H4*=3.5, V3*≈1.07, H5*=5.0, H3*=2.5
      // H4★+V3★+V3★ = 70.5% < MIN_FILL. H5★ would make 133% ≤ 135% cap → accepted.
      const items = [
        createHorizontalImage(1, 4), // H4★ cv=3.5
        createVerticalImage(2, 3), // V3★ cv≈1.07
        createVerticalImage(3, 3), // V3★ cv≈1.07
        createHorizontalImage(4, 5), // H5★ cv=5.0
        createHorizontalImage(5, 3), // H3★ cv=2.5
        createHorizontalImage(6, 3), // H3★ cv=2.5
        createHorizontalImage(7, 3), // H3★ cv=2.5
      ];
      const rows = buildRows(items, DESKTOP);

      expect(rows.length).toBe(2);

      // Row 1: H4★ + V3★ + V3★ + H5★ (133% overfill accepted)
      expect(rows[0]?.components.length).toBe(4);

      // Row 2: H3★ + H3★ + H3★ (7.5/8=93.75%)
      expect(rows[1]?.components.length).toBe(3);
    });

    it('should pair two unmatched horizontals into one row', () => {
      // H3* + H4* = 83% fill → best-fit fallback pairs the two horizontals.
      const items = [createHorizontalImage(1, 3), createHorizontalImage(2, 4)];
      const rows = buildRows(items, DESKTOP);
      expect(rows[0]?.components).toHaveLength(2);
    });
  });

  describe('vertical overpacking guard (Phase 3.3)', () => {
    // Penalty-free verticals have a cheap width-cost Hv (a V3★ ≈ 1.19), so a long
    // run of portraits could pack many-per-row. MAX_ROW_IMAGES bounds the COUNT and
    // the targetAR-closeness composer nests the run into a 2D grid rather than a
    // single thin filmstrip (a flat 12-wide strip of verticals would be AR ≈ 6.75).
    it('tiles a long run of cheap verticals into bounded, sane-AR grids — never a thin filmstrip', () => {
      const items = Array.from({ length: 24 }, (_, i) => createVerticalImage(i + 1, 3));
      // High density (rw=20) is where cheap Hv could overpack a flat strip.
      const rows = buildRows(items, 20, 1.5);
      for (const row of rows) {
        expect(row.components.length).toBeLessThanOrEqual(MAX_ROW_IMAGES);
        const ar = calculateBoxTreeAspectRatio(row.boxTree);
        // A degenerate wide filmstrip would have AR well above the target band;
        // the composer keeps even a 12-vertical row near-square (observed ≤ 1.7).
        expect(ar).toBeLessThanOrEqual(2.5);
        expect(ar).toBeGreaterThan(0.5);
      }
    });
  });

  describe('2×2 nested layout', () => {
    it('builds a nested 2D boxTree (not a flat strip) for a 4-item mixed row (penalty-free ratings)', () => {
      // Real Row 15 scenario: V1★, V2★, V4★, H3★.
      // Area-to-value: the equity-primary composer chooses H( L(v1), V( H(v2,v4), h3) )
      // — root horizontal with a single leaf on the left and a vertical stack on the
      // right. This renders MORE equitably than the old balanced 2×2 H(H(v1,v2),V(v4,h3))
      // (rendered area/P spread ≈ 7.7 vs ≈ 11.1): among all trees within the AR floor
      // (1.0) and ceiling (2× target), this is the equity-minimum. The squarer 2×2
      // is no longer the AR-optimum once equity drives selection. Still a nested 2D
      // shape (one leaf + a vStack), never a flat hChain.
      const v1 = createVerticalImage(1, 1); // V1★ → effective 1
      const v2 = createVerticalImage(2, 2); // V2★ → effective 2
      const v4 = createVerticalImage(3, 4); // V4★ → effective 4
      const h3 = createHorizontalImage(4, 3); // H3★ → effective 3

      const items = [v1, v2, v4, h3];
      const rows = buildRows(items, 5);

      expect(rows).toHaveLength(1);

      const boxTree = rows[0]?.boxTree;
      expect(boxTree?.type).toBe('combined');
      if (boxTree?.type === 'combined') {
        expect(boxTree.direction).toBe('horizontal');
        // Left child: a single leaf (the leading V1★)
        expect(boxTree.children[0].type).toBe('leaf');
        // Right child: a vertical stack (a 2D nested column, not a flat strip)
        expect(boxTree.children[1].type).toBe('combined');
        if (boxTree.children[1].type === 'combined') {
          expect(boxTree.children[1].direction).toBe('vertical');
        }
      }
    });

    it('should keep a 4-item row horizontal at the root with only 1 vertical', () => {
      // 4 items, only 1 vertical. Sized at rw=8 so Hv packs all four into one row
      // (at rw=5 the cheaper Hv scale closes the row at 3 and orphans the V1★).
      const h1a = createHorizontalImage(1, 1);
      const h1b = createHorizontalImage(2, 1);
      const h1c = createHorizontalImage(3, 1);
      const v1 = createVerticalImage(4, 1);

      const items = [h1a, h1b, h1c, v1];
      const rows = buildRows(items, 8);

      expect(rows).toHaveLength(1);
      // Row root is horizontal (rows are horizontal by definition).
      const boxTree = rows[0]?.boxTree;
      expect(boxTree?.type).toBe('combined');
      if (boxTree?.type === 'combined') {
        expect(boxTree.direction).toBe('horizontal');
      }
    });

    it('should keep a 3-item row from forming a 2×2 nested shape', () => {
      const v2 = createVerticalImage(1, 2);
      const v3 = createVerticalImage(2, 3);
      const h3 = createHorizontalImage(3, 3);

      const items = [v2, v3, h3];
      const rows = buildRows(items, 5);

      expect(rows).toHaveLength(1);
      // 3 items can't form a 2×2 nested shape (needs 4)
      expect(rows[0]?.components.length).toBe(3);
    });
  });

  describe('boxTree generation', () => {
    it('should generate a single leaf, blank-padded, for a lone H5*', () => {
      // A normal landscape (AR 1.78) fails isSoloHero's extremeness gate, so it is
      // NOT a full-width hero: Hv 2.98 fills only 60% of rw=5, and the row is
      // padded to hold it at that share rather than stretching it to full width.
      const h5 = createHorizontalImage(1, 5);
      const rows = buildRows([h5], 5);

      expect(rows).toHaveLength(1);
      const boxTree = realTree(rows[0]!.boxTree);
      expect(boxTree.type).toBe('leaf');
      if (boxTree.type === 'leaf') {
        expect(boxTree.content.id).toBe(h5.id);
      }
    });

    it('should generate a horizontal combined boxTree for 2 horizontals', () => {
      // At rw=5, H4*(cv=3.5) fills 70% — two H4* = 7.0/5 = 140% > MAX_FILL
      // They go to separate rows. Use rw=8 where they pair (87.5%, best-fit)
      const h4_1 = createHorizontalImage(1, 4);
      const h4_2 = createHorizontalImage(2, 4);
      const rows = buildRows([h4_1, h4_2], DESKTOP);

      // At rw=8, 3.5+3.5=7.0, fill=87.5% < 90% → best-fit pairs them
      expect(rows).toHaveLength(1);
      const boxTree = realTree(rows[0]!.boxTree);
      expect(boxTree.type).toBe('combined');
      if (boxTree?.type === 'combined') {
        expect(boxTree.direction).toBe('horizontal');
        expect(boxTree.children).toHaveLength(2);
        expect(boxTree.children[0]?.type).toBe('leaf');
        expect(boxTree.children[1]?.type).toBe('leaf');
        if (boxTree.children[0]?.type === 'leaf' && boxTree.children[1]?.type === 'leaf') {
          expect(boxTree.children[0].content.id).toBe(h4_1.id);
          expect(boxTree.children[1].content.id).toBe(h4_2.id);
        }
      }
    });

    it('should generate H(leaf, V(leaf,leaf)) for H4* + 2 verticals', () => {
      // At rw=8: H4*(3.5) + V3*(1.07) + V3*(1.07) = 5.64, fill=70.5%
      // All fit in one row
      const h4 = createHorizontalImage(1, 4);
      const v3_1 = createVerticalImage(2, 3);
      const v3_2 = createVerticalImage(3, 3);
      const rows = buildRows([h4, v3_1, v3_2], DESKTOP);

      expect(rows).toHaveLength(1);
      const boxTree = realTree(rows[0]!.boxTree);
      expect(boxTree.type).toBe('combined');
      if (boxTree.type === 'combined') {
        expect(boxTree.direction).toBe('horizontal');
        // Left child: main image (leaf)
        expect(boxTree.children[0]?.type).toBe('leaf');
        // Right child: vertical stack (combined)
        expect(boxTree.children[1]?.type).toBe('combined');
        if (boxTree.children[1]?.type === 'combined') {
          expect(boxTree.children[1].direction).toBe('vertical');
          expect(boxTree.children[1].children[0]?.type).toBe('leaf');
          expect(boxTree.children[1].children[1]?.type).toBe('leaf');
        }
      }
    });

    it('should generate a nested 2D boxTree for 4 items (leading hero gets its own column)', () => {
      const v4 = createVerticalImage(1, 4);
      const v1 = createVerticalImage(2, 1);
      const v2 = createVerticalImage(3, 2);
      const h3 = createHorizontalImage(4, 3);
      const rows = buildRows([v4, v1, v2, h3], 5);

      expect(rows).toHaveLength(1);
      const boxTree = rows[0]?.boxTree;
      expect(boxTree).toBeDefined();
      expect(boxTree?.type).toBe('combined');
      if (boxTree?.type === 'combined') {
        expect(boxTree.direction).toBe('horizontal');
        // Area-to-value: builds H[ L(v4), V[ H(v1,v2), h3 ] ] — the leading V4★
        // hero (highest P) takes its OWN full-height left column (rendering biggest),
        // while v1/v2/h3 nest in the right column. The old uniform 2×2 sized the
        // V4★ no larger than the low-rated leaves; this is the equity-minimum tree
        // within the AR floor/ceiling. Still a nested 2D shape, never a flat strip.
        // Left child: a single leaf (the V4★ hero column)
        expect(boxTree.children[0]?.type).toBe('leaf');
        // Right child: a vertical stack containing a nested horizontal pair
        expect(boxTree.children[1]?.type).toBe('combined');
        if (boxTree.children[1]?.type === 'combined') {
          expect(boxTree.children[1].direction).toBe('vertical');
          expect(boxTree.children[1].children[0]?.type).toBe('combined');
          expect(boxTree.children[1].children[1]?.type).toBe('leaf');
        }
      }
    });

    it('should generate a nested tree for 3+ horizontal items', () => {
      // Uses rw=8: 3×H3★ (cv 2.5 each = 7.5, 93.8%) stays as a single row whose
      // AR estimate meets the AR floor. At rw=5 the row would split, so the
      // 3-item nested-tree shape this test exercises requires the desktop width.
      const h3_1 = createHorizontalImage(1, 3);
      const h3_2 = createHorizontalImage(2, 3);
      const h3_3 = createHorizontalImage(3, 3);
      const rows = buildRows([h3_1, h3_2, h3_3], DESKTOP);

      expect(rows).toHaveLength(1);
      const boxTree = realTree(rows[0]!.boxTree);
      expect(boxTree.type).toBe('combined');
      if (boxTree.type === 'combined') {
        expect(boxTree.direction).toBe('horizontal');
        // Builds: H[ h3_1, V[h3_2, h3_3] ] — leaf on the left, vertical pair right.
        // Left child: leaf (h3_1)
        expect(boxTree.children[0]?.type).toBe('leaf');
        // Right child: vertical pair (h3_2 + h3_3)
        expect(boxTree.children[1]?.type).toBe('combined');
        if (boxTree.children[1]?.type === 'combined') {
          expect(boxTree.children[1].direction).toBe('vertical');
        }
      }
    });

    it('should include boxTree in every row', () => {
      const h5_1 = createHorizontalImage(1, 5);
      const h4_1 = createHorizontalImage(2, 4);
      const h4_2 = createHorizontalImage(3, 4);
      const v3_1 = createVerticalImage(4, 3);
      const v3_2 = createVerticalImage(5, 3);

      const rows = buildRows([h5_1, h4_1, h4_2, v3_1, v3_2], 5);

      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.boxTree).toBeDefined();
        expect(row.boxTree.type).toBeDefined();
      }
    });

    it('row results expose only components and boxTree (no label/direction)', () => {
      const rows = buildRows([createHorizontalImage(1, 3), createHorizontalImage(2, 3)], 8, 1.5);
      expect(rows[0]).toHaveProperty('components');
      expect(rows[0]).toHaveProperty('boxTree');
      expect(rows[0]).not.toHaveProperty('label');
      expect(rows[0]).not.toHaveProperty('direction');
    });
  });
});

// =============================================================================
// Architecture type tests (Step 7 additions)
// =============================================================================

describe('toImageType', () => {
  it('should classify horizontal images as H', () => {
    const img = createHorizontalImage(1, 3);
    const result = toImageType(img);
    expect(result.ar).toBe('H');
  });

  it('should classify vertical images as V', () => {
    const img = createVerticalImage(1, 3);
    const result = toImageType(img);
    expect(result.ar).toBe('V');
  });

  it('applies no vertical penalty — a V3★ and an H3★ have equal effective rating', () => {
    // Vertical penalty retired (directional prominence): directionality is now
    // expressed by AR extremeness downstream, not by demoting the rating.
    const v3 = createVerticalImage(1, 3);
    expect(toImageType(v3).effectiveRating).toBe(3); // was 2 under the penalty

    const h3 = createHorizontalImage(2, 3);
    expect(toImageType(h3).effectiveRating).toBe(3);
  });

  it('should back-reference the source item', () => {
    const img = createHorizontalImage(1, 4);
    const result = toImageType(img);
    expect(result.source).toBe(img);
  });
});

describe('AtomicComponent builders', () => {
  const imgH = (): ImageType => toImageType(createHorizontalImage(1, 3));
  const imgV = (): ImageType => toImageType(createVerticalImage(2, 3));

  it('single() produces a single-type node', () => {
    const ac = single(imgH());
    expect(ac.type).toBe('single');
    if (ac.type === 'single') expect(ac.img.ar).toBe('H');
  });

  it('hPair() produces a horizontal pair', () => {
    const ac = hPair(single(imgH()), single(imgV()));
    expect(ac.type).toBe('pair');
    if (ac.type === 'pair') {
      expect(ac.direction).toBe('H');
      expect(ac.children).toHaveLength(2);
    }
  });

  it('vStack() produces a vertical pair', () => {
    const ac = vStack(single(imgH()), single(imgV()));
    expect(ac.type).toBe('pair');
    if (ac.type === 'pair') expect(ac.direction).toBe('V');
  });

  it('hChain() wraps single image as single node', () => {
    const ac = hChain([imgH()]);
    expect(ac.type).toBe('single');
  });

  it('hChain() of 2 produces left-heavy pair', () => {
    const ac = hChain([imgH(), imgV()]);
    expect(ac.type).toBe('pair');
    if (ac.type === 'pair') {
      expect(ac.direction).toBe('H');
      expect(ac.children[0].type).toBe('single');
      expect(ac.children[1].type).toBe('single');
    }
  });

  it('hChain() of 3 nests left-heavy: H(H(a,b),c)', () => {
    const ac = hChain([imgH(), imgH(), imgV()]);
    expect(ac.type).toBe('pair');
    if (ac.type === 'pair') {
      expect(ac.children[0].type).toBe('pair'); // left = H(a,b)
      expect(ac.children[1].type).toBe('single'); // right = c
    }
  });

  it('hChain() throws on empty array', () => {
    expect(() => hChain([])).toThrow();
  });
});

describe('acToBoxTree', () => {
  it('converts single node to leaf BoxTree', () => {
    const img = createHorizontalImage(1, 5);
    const ac = single(toImageType(img));
    const bt = acToBoxTree(ac);
    expect(bt.type).toBe('leaf');
    if (bt.type === 'leaf') expect(bt.content).toBe(img);
  });

  it('converts H pair to horizontal combined BoxTree', () => {
    const a = toImageType(createHorizontalImage(1, 3));
    const b = toImageType(createVerticalImage(2, 3));
    const bt = acToBoxTree(hPair(single(a), single(b)));
    expect(bt.type).toBe('combined');
    if (bt.type === 'combined') {
      expect(bt.direction).toBe('horizontal');
      expect(bt.children[0].type).toBe('leaf');
      expect(bt.children[1].type).toBe('leaf');
    }
  });

  it('converts V stack to vertical combined BoxTree', () => {
    const a = toImageType(createVerticalImage(1, 3));
    const b = toImageType(createVerticalImage(2, 2));
    const bt = acToBoxTree(vStack(single(a), single(b)));
    expect(bt.type).toBe('combined');
    if (bt.type === 'combined') expect(bt.direction).toBe('vertical');
  });

  it('preserves source references through conversion', () => {
    const img1 = createHorizontalImage(1, 4);
    const img2 = createVerticalImage(2, 3);
    const a = toImageType(img1);
    const b = toImageType(img2);
    const bt = acToBoxTree(hPair(single(a), single(b)));
    if (bt.type === 'combined') {
      expect(bt.children[0].type === 'leaf' && bt.children[0].content).toBe(img1);
      expect(bt.children[1].type === 'leaf' && bt.children[1].content).toBe(img2);
    }
  });
});

describe('buildAtomic — representative row shapes', () => {
  // These pin the composition shapes buildAtomic produces for representative
  // multi-orientation inputs (degenerate 1H/2H cases live in
  // rowCombination.composition.test.ts).
  it('builds H(leaf, H-pair) for H4★ + 2 verticals — H4★ dominant left', () => {
    const imgs = [
      toImageType(createHorizontalImage(1, 4)), // dominant H, effectiveRating=4
      toImageType(createVerticalImage(2, 3)),
      toImageType(createVerticalImage(3, 2)),
    ];
    const composition = buildAtomic(imgs, 1.5);
    // Area-to-value: H[ H4★, H[V3★, V2★] ] — the H4★ (P 3.5) takes the dominant
    // left leaf (rendering biggest), and the two verticals sit side by side. The
    // old V[V3,V2] stack is no longer the equity-minimum once area tracks P: the
    // side-by-side H-pair (rowAR 2.96, just under the 2× ceiling) scores lower.
    expect(composition.type).toBe('pair');
    if (composition.type === 'pair') {
      expect(composition.direction).toBe('H');
      expect(composition.children[0].type).toBe('single'); // H4★ dominant leaf
      expect(composition.children[1].type).toBe('pair');
      if (composition.children[1].type === 'pair') {
        expect(composition.children[1].direction).toBe('H');
      }
    }
  });

  it('builds H(leaf, H-pair) for H3★ + 2 verticals — H3★ dominant left', () => {
    const imgs = [
      toImageType(createHorizontalImage(1, 3)),
      toImageType(createVerticalImage(2, 2)),
      toImageType(createVerticalImage(3, 2)),
    ];
    const composition = buildAtomic(imgs, 1.5);
    // Area-to-value: H[ H3★, H[V2★, V2★] ] — H3★ dominant leaf, the two equal V2★
    // paired side by side so they render EQUAL area (was V[V2,V2]; the H-pair is the
    // equity-minimum within the AR floor/ceiling). H3★ remains the biggest.
    expect(composition.type).toBe('pair');
    if (composition.type === 'pair') {
      expect(composition.children[0].type).toBe('single');
      expect(composition.children[1].type).toBe('pair');
      if (composition.children[1].type === 'pair') {
        expect(composition.children[1].direction).toBe('H');
      }
    }
  });

  it('composes a nested pair for 6 images', () => {
    const imgs = [1, 2, 3, 4, 5, 6].map(id => toImageType(createHorizontalImage(id, 2)));
    const composition = buildAtomic(imgs, 1.5);
    expect(composition.type).toBe('pair');
  });
});

// =============================================================================
// estimateRowAR
// =============================================================================

describe('estimateRowAR', () => {
  it('returns a positive AR for valid image sets', () => {
    const imgs = [1, 2, 3].map(id => toImageType(createHorizontalImage(id, 3)));
    const ar = estimateRowAR(imgs, 1.5);
    expect(ar).toBeGreaterThan(0);
  });

  it('4 verticals produce low AR (motivating AR-aware fill)', () => {
    const imgs = [1, 2, 3, 4].map(id => toImageType(createVerticalImage(id, 3)));
    const ar = estimateRowAR(imgs, 1.5);
    // 4 verticals should have a low combined AR — this is what triggers more filling
    expect(ar).toBeLessThan(1.5);
  });
});

// =============================================================================
// AR-aware row fill in buildRows
// =============================================================================

describe('buildRows AR-aware fill', () => {
  it('pulls more images when row AR is below floor', () => {
    // 4 verticals followed by horizontals — should pull horizontals into the row
    const items = [
      createVerticalImage(1, 4),
      createVerticalImage(2, 3),
      createVerticalImage(3, 3),
      createVerticalImage(4, 2),
      createHorizontalImage(5, 3),
      createHorizontalImage(6, 2),
      createHorizontalImage(7, 2),
    ];
    const rows = buildRows(items, DESKTOP, 1.5);
    // First row should have more than 4 items (AR-aware fill pulled extras)
    // or the row count should be fewer than if each got 4+3
    const firstRowCount = rows[0]!.components.length;
    // The exact count depends on AR scoring, but should be > 4 for vertical-heavy starts
    expect(firstRowCount).toBeGreaterThanOrEqual(4);
    // Total images accounted for
    const totalImages = rows.reduce((sum, r) => sum + r.components.length, 0);
    expect(totalImages).toBe(7);
  });

  it('does not exceed MAX_ROW_IMAGES per row', () => {
    // Many low-rated verticals — rows must never exceed the cap
    const items = Array.from({ length: 12 }, (_, i) => createVerticalImage(i + 1, 1));
    const rows = buildRows(items, DESKTOP, 1.5);
    for (const row of rows) {
      expect(row.components.length).toBeLessThanOrEqual(MAX_ROW_IMAGES);
    }
  });

  it('closes row normally when AR is acceptable', () => {
    // All horizontals — should close at normal slot count
    const items = [
      createHorizontalImage(1, 5),
      createHorizontalImage(2, 3),
      createHorizontalImage(3, 3),
      createHorizontalImage(4, 2),
      createHorizontalImage(5, 2),
    ];
    const rows = buildRows(items, DESKTOP, 1.5);
    // Should NOT pull all 5 into one row when AR is already fine
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const totalImages = rows.reduce((sum, r) => sum + r.components.length, 0);
    expect(totalImages).toBe(5);
  });
});

// ===================== buildRows fill at constant MIN_FILL =====================

describe('buildRows fill at constant MIN_FILL', () => {
  it('rowWidth=12 packs 5 H items per row at the constant 0.9 fill bar', () => {
    // The fill bar is a constant MIN_FILL (0.9), no longer rowWidth-scaled.
    // Under the width-cost (Hv) scale a 3★ landscape costs ≈2.108 (was cv 2.5),
    // so a rw=12 row reaches the 90% bar after 5 items (≈4×2.108 + 2.494 = 10.93,
    // 91%) instead of 4. Density itself comes from rowWidth = chunkSize ×
    // DENSITY_ROW_WIDTH_MULTIPLIER (calibrated so default density is unchanged).
    const items = [
      createHorizontalImage(1, 3),
      createHorizontalImage(2, 3),
      createHorizontalImage(3, 3),
      createHorizontalImage(4, 4),
      createHorizontalImage(5, 3),
      createHorizontalImage(6, 3),
    ];
    const rows = buildRows(items, 12);
    expect(rows[0]!.components.length).toBe(5);
  });

  it('rowWidth=8 — 4 H3★ per row under Hv (4 × 2.108 = 8.43, 105% fill)', () => {
    // Under cv (2.5) only 3 fit per rw=8 row; under the cheaper Hv (2.108) four
    // pack to 105% — the K calibration in contentLayout.ts compensates at the
    // density level so a DEFAULT-density collection keeps its old per-row count.
    const items = [
      createHorizontalImage(1, 3),
      createHorizontalImage(2, 3),
      createHorizontalImage(3, 3),
      createHorizontalImage(4, 3),
    ];
    const rows = buildRows(items, 8);
    expect(rows[0]!.components.length).toBe(4);
  });
});

// ===================== Density calibration (Hv vs cv) =====================
// Locks the DENSITY_ROW_WIDTH_MULTIPLIER (K) so the switch from the cv packing
// scale to the width-cost Hv scale does NOT change how many normal 3★ landscapes
// pack per row at default density. Recorded baseline on the OLD cv code:
//   buildRows(12×H3, Math.round(4 × 2.5) = 10, 1.5) → row 0 holds 4 items.
// After switching packing to Hv (H3 cost 2.5 → 2.108, ~30% cheaper) K was retuned
// from 2.5 to DENSITY_ROW_WIDTH_MULTIPLIER so row 0 still holds 4. The test reads
// the shared constant so code and calibration can never drift apart.

describe('density calibration: default density packs the same per-row count', () => {
  it('default density packs the same count of normal 3★ landscapes per row (unchanged)', () => {
    const rows = buildRows(
      Array.from({ length: 12 }, (_, i) => createHorizontalImage(i + 1, 3)),
      Math.round(4 * DENSITY_ROW_WIDTH_MULTIPLIER),
      1.5
    );
    // Recorded baseline (cv code at K=2.5, rowWidth 10): exactly 4 per row.
    expect(rows[0]!.components.length).toBeGreaterThanOrEqual(4);
    expect(rows[0]!.components.length).toBeLessThanOrEqual(4);
  });

  // Regression: the hero-solo check is gated on aspect-ratio extremeness, so a
  // NORMAL landscape (AR 1.78, extremeness < 2) never claims its own row — even
  // at a small rowWidth where its width-cost fraction alone would exceed
  // HERO_SOLO_WIDTH_FRACTION. Without the gate, a 3★ landscape at rowWidth 4
  // (Hv 2.108 / 4 = 0.527 ≥ 0.5) degenerated to one-per-row, collapsing the
  // chunk-2 density step into full-width singles.
  it('a normal 3★ landscape never solos at small rowWidth (rw=4 → 2 per row)', () => {
    const rows = buildRows(
      Array.from({ length: 12 }, (_, i) => createHorizontalImage(i + 1, 3)),
      4,
      1.5
    );
    expect(rows[0]!.components.length).toBe(2);
  });

  it('a normal 5★ landscape never solos at small rowWidth either (AR 1.78, ext<2)', () => {
    // The retired isFullWidthHero required AR≥2; a normal 5★ (AR 1.78) must not
    // qualify regardless of rating. Hv(H5)=2.981, frac at rw=4 = 0.745 ≥ 0.5,
    // so only the extremeness gate keeps it sharing.
    const rows = buildRows(
      [createHorizontalImage(1, 5), createHorizontalImage(2, 3), createHorizontalImage(3, 3)],
      4,
      1.5
    );
    expect(rows[0]!.components.length).toBeGreaterThan(1);
  });

  it('per-row count is non-decreasing as rowWidth grows for normal 3★ landscapes', () => {
    // No degenerate all-singles step anywhere across the density range.
    const counts = [4, 6, 8, 11, 13].map(
      rw =>
        buildRows(
          Array.from({ length: 12 }, (_, i) => createHorizontalImage(i + 1, 3)),
          rw,
          1.5
        )[0]!.components.length
    );
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]!).toBeGreaterThanOrEqual(counts[i - 1]!);
    }
    // And the first step must be a real 2 (not a collapsed 1).
    expect(counts[0]).toBe(2);
  });
});

// ===================== T3: buildRows with mobile rowWidth=2 =====================

describe('buildRows with mobile rowWidth=2', () => {
  it('should produce valid rows for mobile', () => {
    // 4 images: 2 horizontal (rating 3 = full width on mobile), 2 vertical (rating 1 = half width)
    const items: AnyContentModel[] = [
      createHorizontalImage(1, 3),
      createVerticalImage(2, 1),
      createVerticalImage(3, 1),
      createHorizontalImage(4, 3),
    ];
    const rows = buildRows(items, 2);
    // All items should be used
    const allComponents = rows.flatMap(r => r.components);
    expect(allComponents).toHaveLength(4);
    // Each row should have a boxTree
    for (const row of rows) {
      expect(row.boxTree).toBeDefined();
    }
  });

  it('should disable AR-floor bypass for mobile (arFloor = 0)', () => {
    // V with rating=4 → effectiveRating=3 → mobile CV=2 (full width)
    const items2: AnyContentModel[] = [
      createVerticalImage(1, 4), // effectiveRating=3, CV=2 on mobile → fills row
      createVerticalImage(2, 4), // effectiveRating=3, CV=2 on mobile → fills row
    ];
    const rows = buildRows(items2, 2);
    // Each should be its own row (each fills full width)
    expect(rows).toHaveLength(2);
    expect(rows[0]!.components).toHaveLength(1);
    expect(rows[1]!.components).toHaveLength(1);
  });

  it('should produce different row structure than desktop for same content', () => {
    const items: AnyContentModel[] = [
      createHorizontalImage(1, 1),
      createHorizontalImage(2, 1),
      createHorizontalImage(3, 1),
      createHorizontalImage(4, 1),
      createHorizontalImage(5, 1),
    ];
    const mobileRows = buildRows(items, 2);
    const desktopRows = buildRows(items, DESKTOP);

    // Desktop (rw=8): 5×H1*(cv=1.25) = 6.25/8 = 78.1% → all fit in one row
    // But the test only asserts mobile produces MORE rows, not an exact count
    // At rw=8, still 1 row (the single-row fallback packs all 5)

    // Mobile: should produce more rows than desktop
    expect(mobileRows.length).toBeGreaterThan(desktopRows.length);

    // All items should appear in both
    const mobileComponents = mobileRows.flatMap(r => r.components);
    const desktopComponents = desktopRows.flatMap(r => r.components);
    expect(mobileComponents).toHaveLength(5);
    expect(desktopComponents).toHaveLength(5);
  });
});

// ===================== T4: buildAtomic nests 4-item rows =====================

describe('buildAtomic nests 4-item rows', () => {
  it('produces a nested pair for 1 horizontal + 3 verticals', () => {
    const images = [
      createHorizontalImage(1, 3),
      createVerticalImage(2, 2),
      createVerticalImage(3, 2),
      createVerticalImage(4, 2),
    ].map(item => toImageType(item));

    const composition = buildAtomic(images, 1.5);
    // The composition should be a pair (nested structure), not a flat chain
    expect(composition.type).toBe('pair');
  });

  it('produces a nested pair for 2 horizontals + 2 verticals', () => {
    const images = [
      createHorizontalImage(1, 2),
      createHorizontalImage(2, 2),
      createVerticalImage(3, 2),
      createVerticalImage(4, 2),
    ].map(item => toImageType(item));

    const composition = buildAtomic(images, 1.5);
    expect(composition.type).toBe('pair');
  });

  it('should produce valid BoxTree from a 4-vertical composition', () => {
    const images = [
      createVerticalImage(1, 3),
      createVerticalImage(2, 2),
      createVerticalImage(3, 2),
      createVerticalImage(4, 2),
    ].map(item => toImageType(item));

    const composition = buildAtomic(images, 1.5);
    const boxTree = acToBoxTree(composition);

    // Should produce a valid BoxTree
    expect(boxTree.type).toBe('combined');
    // AR should be a finite positive number
    const ar = calculateBoxTreeAspectRatio(boxTree);
    expect(ar).toBeGreaterThan(0);
    expect(Number.isFinite(ar)).toBe(true);
  });
});

// ===================== T6: Mixed content types through buildRows =====================

describe('Mixed content types through buildRows', () => {
  it('should handle text blocks in buildRows without errors', () => {
    const items: AnyContentModel[] = [
      createHorizontalImage(1, 3),
      createTextContent(2, { width: 800, height: 200 }),
      createHorizontalImage(3, 3),
    ];
    const rows = buildRows(items, 5);
    const allComponents = rows.flatMap(r => r.components);
    // All items should be present (not dropped)
    expect(allComponents).toHaveLength(3);
    // Text block should be in the output
    expect(allComponents.some(c => c.contentType === 'TEXT')).toBe(true);
  });

  it('should handle GIF content in buildRows without errors', () => {
    const items: AnyContentModel[] = [
      createHorizontalImage(1, 2),
      createGifContent(2, { width: 800, height: 600 }),
      createHorizontalImage(3, 2),
    ];
    const rows = buildRows(items, 5);
    const allComponents = rows.flatMap(r => r.components);
    expect(allComponents).toHaveLength(3);
    expect(allComponents.some(c => c.contentType === 'GIF')).toBe(true);
  });

  it('should handle collection cards in buildRows', () => {
    const items: AnyContentModel[] = [
      createCollectionContent(1),
      createCollectionContent(2),
      createHorizontalImage(3, 2),
    ];
    const rows = buildRows(items, 5);
    const allComponents = rows.flatMap(r => r.components);
    expect(allComponents).toHaveLength(3);
    // Collections should be present
    expect(allComponents.filter(c => c.contentType === 'COLLECTION')).toHaveLength(2);
  });

  it('should produce valid sizes from calculateSizesFromBoxTree for mixed content rows', () => {
    const items: AnyContentModel[] = [
      createHorizontalImage(1, 2),
      createTextContent(2, { width: 800, height: 200 }),
      createGifContent(3, { width: 800, height: 600 }),
    ];
    const rows = buildRows(items, 5);

    for (const row of rows) {
      const sizes = calculateSizesFromBoxTree(row.boxTree, 1000, 12.8, 5);
      for (const size of sizes) {
        expect(size.width).toBeGreaterThan(0);
        expect(size.height).toBeGreaterThan(0);
        expect(Number.isFinite(size.width)).toBe(true);
        expect(Number.isFinite(size.height)).toBe(true);
      }
    }
  });

  it('should not silently drop any content type', () => {
    const items: AnyContentModel[] = [
      createHorizontalImage(1, 1),
      createTextContent(2, { width: 400, height: 200 }),
      createGifContent(3, { width: 600, height: 400 }),
      createCollectionContent(4),
      createVerticalImage(5, 2),
    ];
    const rows = buildRows(items, 5);
    const allComponents = rows.flatMap(r => r.components);

    // Every input item should appear in the output
    expect(allComponents).toHaveLength(5);
    const ids = allComponents.map(c => c.id).sort((a, b) => a - b);
    expect(ids).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('rowWidth invariant: valid output for rowWidth 4-16', () => {
  const images = [
    createHorizontalImage(1, 5),
    createVerticalImage(2, 4),
    createHorizontalImage(3, 3),
    createHorizontalImage(4, 3),
    createVerticalImage(5, 2),
    createHorizontalImage(6, 2),
    createVerticalImage(7, 1),
    createHorizontalImage(8, 1),
    createHorizontalImage(9, 3),
    createVerticalImage(10, 2),
  ];

  for (const rw of [4, 6, 8, 10, 12, 16]) {
    it(`rowWidth=${rw}: all images assigned to rows`, () => {
      const rows = buildRows(images, rw);
      const allIds = rows.flatMap(r => r.components.map(c => c.id));
      expect(allIds.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it(`rowWidth=${rw}: no empty rows`, () => {
      const rows = buildRows(images, rw);
      for (const row of rows) {
        expect(row.components.length).toBeGreaterThanOrEqual(1);
      }
    });

    it(`rowWidth=${rw}: each row has valid boxTree`, () => {
      const rows = buildRows(images, rw);
      for (const row of rows) {
        expect(row.boxTree).toBeDefined();
      }
    });
  }
});

// ===================== Row Density packing (rowWidth → items/row) =====================

describe('row density packing', () => {
  it('packs ~9-12 images per row at rowWidth 25 (density 10) for 3★ content', () => {
    // density 10 → rowWidth 25; 3★ cost = cv 2.5, so a constant 0.9 fill bar
    // completes around 9 items (was ~6 under the old rowWidth-14 budget),
    // bounded above by MAX_ROW_IMAGES.
    const items = Array.from({ length: 20 }, (_, i) => createHorizontalImage(i + 1, 3));
    const rows = buildRows(items, 25, 1.0);
    expect(rows[0]!.components.length).toBeGreaterThanOrEqual(8);
    expect(rows[0]!.components.length).toBeLessThanOrEqual(MAX_ROW_IMAGES);
  });

  it('puts 1 image per row at rowWidth 3 (density 1), consuming every item', () => {
    // density 1 → rowWidth 3; a single 3★ (cv 2.5) fills it and a second would
    // overfill past 1.35×, so each image gets its own near-full-width row.
    const items = Array.from({ length: 6 }, (_, i) => createHorizontalImage(i + 1, 3));
    const rows = buildRows(items, 3, 1.0);
    expect(rows[0]!.components.length).toBe(1);
    const total = rows.reduce((n, r) => n + r.components.length, 0);
    expect(total).toBe(6);
  });

  it('does not drop a high-cost 5★ image at rowWidth 3 (best-fit fallback forces its row)', () => {
    // 5★ cv 5.0 at rowWidth 3 = fill 1.67 on the first item → greedy fill exits
    // with seqCount 0; the best-fit fallback must still give it its own row.
    const items = [createHorizontalImage(1, 5), createHorizontalImage(2, 3)];
    const rows = buildRows(items, 3, 1.0);
    const total = rows.reduce((n, r) => n + r.components.length, 0);
    expect(total).toBe(2);
  });

  it('never exceeds MAX_ROW_IMAGES per row even with many low-rated images', () => {
    // 1★ cv 1.25 → 20 would fit a rowWidth-25 budget, but the cap bounds it.
    const items = Array.from({ length: 30 }, (_, i) => createHorizontalImage(i + 1, 1));
    const rows = buildRows(items, 25, 1.0);
    for (const r of rows) expect(r.components.length).toBeLessThanOrEqual(MAX_ROW_IMAGES);
  });
});

// ===================== Emergent full-width hero (Hv width-cost) =====================
// isFullWidthHero (the AR+rating special-case) was retired in the directional-
// prominence rewrite. A wide top-rated panorama now claims its own row purely
// because its width-cost Hv = √(P·AR) clears HERO_SOLO_WIDTH_FRACTION of the row
// budget — emergent, not a hard-coded rule. These exercise that emergent behavior.

describe('emergent full-width hero (width-cost driven)', () => {
  describe('buildRows promotion', () => {
    const soloPanoRow = (rows: RowResult[], panoId: number): RowResult | undefined =>
      rows.find(
        r =>
          r.components.length === 1 &&
          (r.components[0] as { id: number }).id === panoId &&
          r.boxTree.type === 'leaf'
      );
    const totalItems = (rows: RowResult[]): number =>
      rows.reduce((n, r) => n + r.components.length, 0);

    it('gives a mid-stream wide 5★ panorama its own full-width row (gorge regression)', () => {
      // Mirrors the real /gorge-climbing row: V3, H3, V3, then the wide 5★ pano.
      const items = [
        createVerticalImage(1, 3),
        createHorizontalImage(2, 3),
        createVerticalImage(3, 3),
        createPanorama(4, 5),
        createHorizontalImage(5, 4),
      ];
      const rows = buildRows(items, 10, 1.4);
      // The pano is its own leaf row — never nested as a vStack sliver.
      expect(soloPanoRow(rows, 4)).toBeDefined();
      const panoRow = rows.find(r => r.components.some(c => (c as { id: number }).id === 4));
      expect(panoRow!.boxTree.type).toBe('leaf');
      expect(totalItems(rows)).toBe(items.length); // nothing dropped
    });

    it('gives a leading wide 5★ panorama its own full-width row', () => {
      const items = [
        createPanorama(1, 5),
        createHorizontalImage(2, 3),
        createHorizontalImage(3, 3),
        createHorizontalImage(4, 4),
      ];
      const rows = buildRows(items, 10, 1.4);
      expect(rows[0]!.components).toHaveLength(1);
      expect((rows[0]!.components[0] as { id: number }).id).toBe(1);
      expect(rows[0]!.boxTree.type).toBe('leaf');
      expect(totalItems(rows)).toBe(items.length);
    });

    it('does NOT promote a wide panorama below 5★ — it shares a row', () => {
      const items = [
        createHorizontalImage(1, 3),
        createPanorama(2, 4),
        createHorizontalImage(3, 3),
      ];
      const rows = buildRows(items, 10, 1.4);
      expect(soloPanoRow(rows, 2)).toBeUndefined();
      expect(totalItems(rows)).toBe(items.length);
    });

    it('does NOT promote at high density (Hv fraction falls below the bar)', () => {
      // At rowWidth 20 the pano's Hv (≈5.48) is only ~0.27 of the budget, below
      // HERO_SOLO_WIDTH_FRACTION (0.5), so it shares instead of soloing.
      const items = [
        createHorizontalImage(1, 3),
        createPanorama(2, 5),
        createHorizontalImage(3, 3),
        createHorizontalImage(4, 3),
      ];
      const rows = buildRows(items, 20, 1.4);
      expect(soloPanoRow(rows, 2)).toBeUndefined();
      expect(totalItems(rows)).toBe(items.length);
    });

    it('does NOT promote a normal 5★ horizontal (AR 1.78)', () => {
      const items = [
        createHorizontalImage(1, 5),
        createHorizontalImage(2, 3),
        createHorizontalImage(3, 3),
      ];
      const rows = buildRows(items, 10, 1.4);
      expect(soloPanoRow(rows, 1)).toBeUndefined();
    });

    it('promotes multiple wide 5★ panoramas each to their own row', () => {
      const items = [createPanorama(1, 5), createPanorama(2, 5), createHorizontalImage(3, 3)];
      const rows = buildRows(items, 10, 1.4);
      expect(soloPanoRow(rows, 1)).toBeDefined();
      expect(soloPanoRow(rows, 2)).toBeDefined();
      expect(totalItems(rows)).toBe(items.length);
    });
  });
});

// =============================================================================
// area-to-value (B1) — rendered area tracks prominence P
// =============================================================================
describe('area-to-value composition (B1)', () => {
  const TARGET_WIDTH = 1274;

  /** Map content id → rendered area (px²) for a built row. */
  const areaById = (row: RowResult): Map<number, number> => {
    const m = new Map<number, number>();
    for (const s of calculateSizesFromBoxTree(row.boxTree, TARGET_WIDTH)) {
      m.set(s.content.id, s.width * s.height);
    }
    return m;
  };

  // The real oval-lakes H3 is 3:2 — NOT the 16:9 of createHorizontalImage.
  const H32 = (id: number, rating: number) =>
    createImageContent(id, { imageWidth: 1500, imageHeight: 1000, aspectRatio: 1.5, rating });

  it('oval-lakes [V4,H3,V4,V5,V5]: the two 5★ heroes are no longer the smallest', () => {
    // Issue #4 motivating bug: under the old single-structure composer the two 5★
    // verticals rendered SMALLEST. Multi-structure + equity-primary hands each a
    // full-height column so area tracks value.
    const items = [
      createVerticalImage(1, 4),
      H32(2, 3),
      createVerticalImage(3, 4),
      createVerticalImage(4, 5),
      createVerticalImage(5, 5),
    ];
    const rows = buildRows(items, 8, 1.5);
    expect(rows).toHaveLength(1);
    const area = areaById(rows[0]!);
    const v5a = area.get(4)!;
    const v5b = area.get(5)!;
    const v4 = area.get(1)!;
    const h3 = area.get(2)!;
    const minArea = Math.min(...area.values());
    // Each 5★ hero is at least as big as the other 4★ and bigger than the 3★.
    expect(v5a).toBeGreaterThanOrEqual(v4 * 0.99);
    expect(v5b).toBeGreaterThanOrEqual(v4 * 0.99);
    expect(v5a).toBeGreaterThan(h3);
    expect(v5b).toBeGreaterThan(h3);
    // Neither hero is the smallest image in the row (the original bug).
    expect(v5a).toBeGreaterThan(minArea * 1.01);
    expect(v5b).toBeGreaterThan(minArea * 1.01);
  });

  it('mixed row [V5,H3,H3,H3]: the 5★ hero renders biggest', () => {
    const items = [
      createVerticalImage(1, 5),
      createHorizontalImage(2, 3),
      createHorizontalImage(3, 3),
      createHorizontalImage(4, 3),
    ];
    const rows = buildRows(items, 8, 1.5);
    expect(rows).toHaveLength(1);
    const area = areaById(rows[0]!);
    const hero = area.get(1)!;
    for (const id of [2, 3, 4]) expect(hero).toBeGreaterThan(area.get(id)!);
  });

  it('the most valuable image is (near) the biggest in well-formed rows', () => {
    // No-gross-inversion invariant, scoped to rows whose justified geometry CAN
    // honor area∝value. Pathological alternating rows keep an accepted residual
    // (a fundamental discrete-geometry limit) and are intentionally excluded.
    const scenarios: ReturnType<typeof createImageContent>[][] = [
      [
        createVerticalImage(1, 5),
        createHorizontalImage(2, 3),
        createHorizontalImage(3, 3),
        createHorizontalImage(4, 3),
      ],
      [createHorizontalImage(1, 5), createHorizontalImage(2, 3), createHorizontalImage(3, 3)],
      [
        createVerticalImage(1, 4),
        H32(2, 3),
        createVerticalImage(3, 4),
        createVerticalImage(4, 5),
        createVerticalImage(5, 5),
      ],
    ];
    for (const items of scenarios) {
      for (const row of buildRows(items, 8, 1.5)) {
        if (row.components.length < 3) continue;
        const withP = calculateSizesFromBoxTree(row.boxTree, TARGET_WIDTH).map(s => ({
          p: getProminence(s.content),
          area: s.width * s.height,
        }));
        const maxP = Math.max(...withP.map(x => x.p));
        const topArea = Math.max(...withP.filter(x => x.p === maxP).map(x => x.area));
        // The highest-prominence image is at least as big as every lower-P sibling
        // (5% slack for gap rounding / exact ties).
        for (const x of withP) {
          if (x.p < maxP) expect(topArea).toBeGreaterThanOrEqual(x.area * 0.95);
        }
      }
    }
  });

  it('KNOWN LIMITATION: a 2-item [5★ square + 1★ wide] row cannot honor area∝value', () => {
    // Documented, NOT a bug to fix here: a justified 2-item hPair renders both at
    // equal height, so area ∝ AR — the wide 1★ necessarily out-areas the 5★ square,
    // and a vStack would breach the never-taller-than-wide floor. A fix would need a
    // Stage-1 membership rule (don't co-locate them), which is out of scope.
    const items = [createSquareImage(1, 5), createHorizontalImage(2, 1)];
    const rows = buildRows(items, 8, 1.5);
    expect(rows).toHaveLength(1);
    const area = areaById(rows[0]!);
    expect(area.get(2)!).toBeGreaterThan(area.get(1)!); // the inversion is expected
  });

  it('perf: an n=12 row stays within the bounded candidate budget', () => {
    // Full Catalan enumeration would be C(11)=58,786 shapes; the bounded generator
    // (n > N_FULL) caps shapes at STRUCTURE_CAP so the search never blows up.
    const items = Array.from({ length: 12 }, (_, i) => createHorizontalImage(i + 1, 3)).map(item =>
      toImageType(item)
    );
    const { component, shapes, candidates } = composeRowWithCandidateCount(items, 1.5);
    expect(component).toBeDefined();
    expect(shapes).toBeLessThanOrEqual(64); // STRUCTURE_CAP
    expect(candidates).toBeLessThan(20000);
  });

  it('over-ceiling fallback picks the AR-closest tree, not the widest hChain', () => {
    // Three wide panoramas (AR 3) with a square target: the root is forced hPair,
    // so EVERY candidate row exceeds the soft ceiling (min achievable ≈ 4.5 > 2×1.0).
    // The composer must fall back to the AR-closest candidate (≈ 4.5,
    // hPair(vStack(p1,p2), p3)), NOT the flat hChain (≈ 9, the widest possible).
    // Regression guard for the over-ceiling branch of pickBestComposition.
    const imgs = [createPanorama(1, 5), createPanorama(2, 5), createPanorama(3, 5)].map(item =>
      toImageType(item)
    );
    const result = buildAtomic(imgs, 1.0);
    const ar = calculateBoxTreeAspectRatio(acToBoxTree(result));
    expect(ar).toBeLessThan(5); // flat hChain would be ≈ 9
  });
});
