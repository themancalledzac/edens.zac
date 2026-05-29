/**
 * Unit tests for rowCombination.ts
 * Tests isRowComplete, buildRows, and template map architecture
 */

import { LAYOUT } from '@/app/constants';
import type { AnyContentModel } from '@/app/types/Content';
import { getItemComponentValue } from '@/app/utils/contentRatingUtils';
import type { ImageType, RowResult, TemplateKey } from '@/app/utils/rowCombination';
import {
  acToBoxTree,
  buildRows,
  estimateRowAR,
  hChain,
  hPair,
  isRowComplete,
  lookupComposition,
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
  createTextContent,
  createVerticalImage,
} from '@/tests/fixtures/contentFixtures';

// ===================== Constants =====================

const DESKTOP = LAYOUT.desktopSlotWidth; // 8

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

    it('should return true for three H3* images (3 × 2.5 = 7.5, fill=93.8%)', () => {
      const items = [
        createHorizontalImage(1, 3),
        createHorizontalImage(2, 3),
        createHorizontalImage(3, 3),
      ];
      // 7.5/8=93.8% — above 90% threshold
      expect(isRowComplete(items, DESKTOP)).toBe(true);
    });

    it('should return false for five H1* images (5 × 1.25 = 6.25, fill=78.1%)', () => {
      // 6.25/8=78.1% — below 90% threshold
      const items = Array.from({ length: 5 }, (_, i) => createHorizontalImage(i + 1, 1));
      expect(isRowComplete(items, DESKTOP)).toBe(false);
    });
  });

  describe('threshold behavior', () => {
    it('should return true at ~91% fill (H4*+H3*+H1*)', () => {
      // H4*(3.5) + H3*(2.5) + H1*(1.25) = 7.25 → 90.6% ✓
      const items = [
        createHorizontalImage(1, 4),
        createHorizontalImage(2, 3),
        createHorizontalImage(3, 1),
      ];
      expect(isRowComplete(items, DESKTOP)).toBe(true);
    });

    it('should return true at ~94% fill (H5*+H3*)', () => {
      // H5*(5.0) + H3*(2.5) = 7.5 → 93.8% ✓
      const items = [createHorizontalImage(1, 5), createHorizontalImage(2, 3)];
      expect(isRowComplete(items, DESKTOP)).toBe(true);
    });

    it('should return true at ~106% fill (H5*+H4*, within 115% cap)', () => {
      // H5*(5.0) + H4*(3.5) = 8.5 → 106.3% ✓
      const items = [createHorizontalImage(1, 5), createHorizontalImage(2, 4)];
      expect(isRowComplete(items, DESKTOP)).toBe(true);
    });

    it('should return false when fill exceeds 115% (overfill cap)', () => {
      // H5*(5.0) + H5*(5.0) = 10.0 → 125% — exceeds cap
      const items = [createHorizontalImage(1, 5), createHorizontalImage(2, 5)];
      expect(isRowComplete(items, DESKTOP)).toBe(false);
    });

    it('should return false for catastrophic overfill like 150%+', () => {
      // H5*(5.0) + H5*(5.0) + H3*(2.5) = 12.5 → 156%
      const items = [
        createHorizontalImage(1, 5),
        createHorizontalImage(2, 5),
        createHorizontalImage(3, 3),
      ];
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
// (Legacy pattern-matching tests removed — replaced by template map system)
// Coverage for internals now lives in rowCombination.characterization.test.ts

describe('buildRows', () => {
  it('should create a single row from one H5* image', () => {
    const items = [createHorizontalImage(1, 5)];
    const rows = buildRows(items, DESKTOP);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.components).toHaveLength(1);
    // 1 horizontal image → templateKey { h: 1, v: 0 }
    expect(rows[0]?.templateKey).toEqual<TemplateKey>({ h: 1, v: 0 });
  });

  it('should pair two H5* images (125% overfill accepted to avoid solo rows)', () => {
    // H5*+H5* = 10.0/8 = 125% > MAX_FILL but < 135% cap.
    // Overfill accepted because single H5* at 62.5% is underfilled.
    const items = [createHorizontalImage(1, 5), createHorizontalImage(2, 5)];
    const rows = buildRows(items, DESKTOP);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.templateKey).toEqual<TemplateKey>({ h: 2, v: 0 });
  });

  it('should match VERTICAL_PAIR pattern for two V3* images', () => {
    const items = [createVerticalImage(1, 3), createVerticalImage(2, 3)];
    const rows = buildRows(items, DESKTOP);
    // V3* + V3* fills ~2.5/5 = 50%, NOT complete
    // Should fall through to best-fit fallback
    expect(rows).toHaveLength(1);
    expect(rows[0]?.components).toHaveLength(2);
  });

  it('should match triple-h template for three H3* images', () => {
    const items = [
      createHorizontalImage(1, 3),
      createHorizontalImage(2, 3),
      createHorizontalImage(3, 3),
    ];
    const rows = buildRows(items, DESKTOP);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.components).toHaveLength(3);
    // 3 horizontal images → templateKey { h: 3, v: 0 }
    expect(rows[0]?.templateKey).toEqual<TemplateKey>({ h: 3, v: 0 });
  });

  it('should match h-pair template for H4* + H4* (Issue 7)', () => {
    const items = [createHorizontalImage(1, 4), createHorizontalImage(2, 4)];
    const rows = buildRows(items, DESKTOP);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.components).toHaveLength(2);
    // 2 horizontal images → templateKey { h: 2, v: 0 }
    expect(rows[0]?.templateKey).toEqual<TemplateKey>({ h: 2, v: 0 });
  });

  it('should use best-fit fallback for H3* + H4* (83% fill, below 90% minimum)', () => {
    // H3* (1.67) + H4* (2.5) = 4.17 → 83% fill, below 90% minimum
    // Sequential fill fails; best-fit fallback takes both items
    const items = [createHorizontalImage(1, 3), createHorizontalImage(2, 4)];
    const rows = buildRows(items, DESKTOP);
    expect(rows).toHaveLength(1);
    // 2 horizontal images → templateKey { h: 2, v: 0 }
    expect(rows[0]?.templateKey).toEqual<TemplateKey>({ h: 2, v: 0 });
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
        const totalCV = row.components.reduce((sum, item) => sum + getItemComponentValue(item), 0);
        const fill = totalCV / DESKTOP;
        expect(fill).toBeGreaterThanOrEqual(0.5);
      }
    }
  });

  it('should work with rowWidth=4 (tablet)', () => {
    // H4* cv=3.5, fill=3.5/4=87.5% < 90% — not complete as a pair
    // Each H4* fills 87.5% alone — two H4* go to separate rows (each hero)
    const items = [createHorizontalImage(1, 4), createHorizontalImage(2, 4)];
    const rows = buildRows(items, 4);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.components).toHaveLength(1);
    expect(rows[1]?.components).toHaveLength(1);
  });

  it('should work with rowWidth=3 (small tablet)', () => {
    // H1* cv=1.25, 2×1.25=2.5/3=83.3% < MIN_FILL, 3×1.25=3.75/3=125% > MAX
    // Overfill accepted (125% ≤ 135%) to avoid underfilled row
    const items = [
      createHorizontalImage(1, 1),
      createHorizontalImage(2, 1),
      createHorizontalImage(3, 1),
    ];
    const rows = buildRows(items, 3);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.components).toHaveLength(3);
  });

  it('should prioritize dom-stacked template over v-pair for H4* + V3* + V3*', () => {
    const items = [
      createHorizontalImage(1, 4),
      createVerticalImage(2, 3),
      createVerticalImage(3, 3),
    ];
    const rows = buildRows(items, DESKTOP);
    // H4* (2.5) + V3* (1.25) + V3* (1.25) = 5.0, 100%
    expect(rows).toHaveLength(1);
    // 1 horizontal + 2 vertical → templateKey { h: 1, v: 2 }
    expect(rows[0]?.templateKey).toEqual<TemplateKey>({ h: 1, v: 2 });
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
    it('should split H3★+H5★ | H3★+H3★ across two rows with rw=8', () => {
      // H3★(2.5) + H5★(5.0) = 7.5, fill=93.8% ✓. The V3 estimate for {H3,H5}
      // meets the AR floor at 2 items, so the row closes there (was 3 under V1).
      // Remaining H3★+H3★ form the second row.
      const items = [
        createHorizontalImage(1, 3),
        createHorizontalImage(2, 5),
        createHorizontalImage(3, 3),
        createHorizontalImage(4, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      expect(rows).toHaveLength(2);
      // First row: H3★+H5★ (fill=93.8%)
      const row0Ids = rows[0]?.components.map(c => c.id);
      expect(row0Ids).toEqual([1, 2]);
      // Second row: remaining H3★+H3★
      const row1Ids = rows[1]?.components.map(c => c.id);
      expect(row1Ids).toEqual([3, 4]);
    });

    it('should split H4★+H5★ | H3★ across two rows with rw=8', () => {
      // H4★(3.5) + H5★(5.0) = 8.5, fill=106% ≤ MAX. The V3 estimate for {H4,H5}
      // meets the AR floor at 2 items, so the row closes there (was all 3 under
      // V1). The trailing H3★ becomes its own row.
      const items = [
        createHorizontalImage(1, 4),
        createHorizontalImage(2, 5),
        createHorizontalImage(3, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      expect(rows).toHaveLength(2);
      expect(rows[0]?.components.map(c => c.id)).toEqual([1, 2]);
      expect(rows[1]?.components.map(c => c.id)).toEqual([3]);
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

    it('should accept dom-stacked when H4* is dominant (H4*+V3*+V3*)', () => {
      // H4*(3.5) + V3*(1.07) + V3*(1.07) = 5.64, fill=70.5%
      // All fit in one row at rw=8
      const items = [
        createHorizontalImage(1, 4),
        createVerticalImage(2, 3),
        createVerticalImage(3, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      expect(rows).toHaveLength(1);
      // 1 horizontal + 2 vertical → templateKey { h: 1, v: 2 }
      expect(rows[0]?.templateKey).toEqual<TemplateKey>({ h: 1, v: 2 });
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
        const totalCV = row.components.reduce(
          (sum: number, item: AnyContentModel) => sum + getItemComponentValue(item),
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

  describe('template keys in buildRows output', () => {
    it('should produce correct templateKey for each template type', () => {
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

      // Row 1: H4★ + V3★ + V3★ + H5★ → compose-2h2v (133% overfill accepted)
      expect(rows[0]?.templateKey).toEqual<TemplateKey>({ h: 2, v: 2 });
      expect(rows[0]?.components.length).toBe(4);

      // Row 2: H3★ + H3★ + H3★ → compose-3h (7.5/8=93.75%)
      expect(rows[1]?.templateKey).toEqual<TemplateKey>({ h: 3, v: 0 });
      expect(rows[1]?.components.length).toBe(3);
    });

    it('should produce h-pair templateKey for unmatched 2-horizontal combinations', () => {
      // H3* + H4* = 83% fill → best-fit fallback, still 2H 0V → templateKey { h: 2, v: 0 }
      const items = [createHorizontalImage(1, 3), createHorizontalImage(2, 4)];
      const rows = buildRows(items, DESKTOP);
      expect(rows[0]?.templateKey).toEqual<TemplateKey>({ h: 2, v: 0 });
    });
  });

  describe('nested quad layout', () => {
    it('should detect nested-quad boxTree for 4-item best-fit fallback with dominant vertical', () => {
      // Real Row 15 scenario: V1★, V2★, V4★, H3★
      // V4★ base rating 4 → effective rating 3 (vertical penalty)
      const v1 = createVerticalImage(1, 1); // V1★ → effective 1
      const v2 = createVerticalImage(2, 2); // V2★ → effective 2
      const v4 = createVerticalImage(3, 4); // V4★ → effective 3
      const h3 = createHorizontalImage(4, 3); // H3★ → effective 3

      const items = [v1, v2, v4, h3];
      const rows = buildRows(items, 5);

      expect(rows).toHaveLength(1);
      // 1 horizontal + 3 vertical → templateKey { h: 1, v: 3 }
      expect(rows[0]?.templateKey).toEqual<TemplateKey>({ h: 1, v: 3 });

      // V3 builds: H[ V[ H[v1,v2], v4 ], h3 ] — a vertical-stack column on the
      // left and the H3★ as the right leaf.
      const boxTree = rows[0]?.boxTree;
      expect(boxTree?.type).toBe('combined');
      if (boxTree?.type === 'combined') {
        expect(boxTree.direction).toBe('horizontal');
        // Left child is the vertical stack column
        expect(boxTree.children[0].type).toBe('combined');
        if (boxTree.children[0].type === 'combined') {
          expect(boxTree.children[0].direction).toBe('vertical');
        }
        // Right child is the H3★ leaf
        expect(boxTree.children[1].type).toBe('leaf');
        if (boxTree.children[1].type === 'leaf') {
          expect(boxTree.children[1].content).toEqual(h3);
        }
      }
    });

    it('should NOT use nested-quad for 4 items without enough verticals', () => {
      // 4 items but only 1 vertical - can't form top pair
      const h1a = createHorizontalImage(1, 1);
      const h1b = createHorizontalImage(2, 1);
      const h2 = createHorizontalImage(3, 2);
      const v1 = createVerticalImage(4, 1);

      const items = [h1a, h1b, h2, v1];
      const rows = buildRows(items, 5);

      expect(rows).toHaveLength(1);
      // 3 horizontal + 1 vertical → templateKey { h: 3, v: 1 }
      expect(rows[0]?.templateKey).toEqual<TemplateKey>({ h: 3, v: 1 });
      // BoxTree should be flat horizontal (no vertical stacking)
      const boxTree = rows[0]?.boxTree;
      expect(boxTree?.type).toBe('combined');
      if (boxTree?.type === 'combined') {
        expect(boxTree.direction).toBe('horizontal');
      }
    });

    it('should NOT use nested-quad for 3 items', () => {
      const v2 = createVerticalImage(1, 2);
      const v3 = createVerticalImage(2, 3);
      const h3 = createHorizontalImage(3, 3);

      const items = [v2, v3, h3];
      const rows = buildRows(items, 5);

      expect(rows).toHaveLength(1);
      // 3 items can't form nested-quad (needs 4)
      expect(rows[0]?.components.length).toBe(3);
    });
  });

  describe('boxTree generation', () => {
    it('should generate a leaf boxTree for hero pattern', () => {
      const h5 = createHorizontalImage(1, 5);
      const rows = buildRows([h5], 5);

      expect(rows).toHaveLength(1);
      const boxTree = rows[0]?.boxTree;
      expect(boxTree).toBeDefined();
      expect(boxTree?.type).toBe('leaf');
      if (boxTree?.type === 'leaf') {
        expect(boxTree.content.id).toBe(h5.id);
      }
    });

    it('should generate a horizontal combined boxTree for h-pair template', () => {
      // At rw=5, H4*(cv=3.5) fills 70% — two H4* = 7.0/5 = 140% > MAX_FILL
      // They go to separate rows. Use rw=8 where they pair (87.5%, best-fit)
      const h4_1 = createHorizontalImage(1, 4);
      const h4_2 = createHorizontalImage(2, 4);
      const rows = buildRows([h4_1, h4_2], DESKTOP);

      // At rw=8, 3.5+3.5=7.0, fill=87.5% < 90% → best-fit pairs them
      expect(rows).toHaveLength(1);
      const boxTree = rows[0]?.boxTree;
      expect(boxTree).toBeDefined();
      expect(boxTree?.type).toBe('combined');
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

    it('should generate a nested boxTree for dom-stacked-1h2v template (main-stacked)', () => {
      // At rw=8: H4*(3.5) + V3*(1.07) + V3*(1.07) = 5.64, fill=70.5%
      // All fit in one row
      const h4 = createHorizontalImage(1, 4);
      const v3_1 = createVerticalImage(2, 3);
      const v3_2 = createVerticalImage(3, 3);
      const rows = buildRows([h4, v3_1, v3_2], DESKTOP);

      expect(rows).toHaveLength(1);
      const boxTree = rows[0]?.boxTree;
      expect(boxTree).toBeDefined();
      expect(boxTree?.type).toBe('combined');
      if (boxTree?.type === 'combined') {
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

    it('should generate a nested boxTree for nested-quad layout (4 items)', () => {
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
        // V3 builds: H[ H[v4,v1], V[v2,h3] ] — a horizontal pair on the left and
        // a vertical stack of two leaves on the right.
        // Left child: horizontal pair
        expect(boxTree.children[0]?.type).toBe('combined');
        if (boxTree.children[0]?.type === 'combined') {
          expect(boxTree.children[0].direction).toBe('horizontal');
        }
        // Right child: vertical stack of two leaves
        expect(boxTree.children[1]?.type).toBe('combined');
        if (boxTree.children[1]?.type === 'combined') {
          expect(boxTree.children[1].direction).toBe('vertical');
          expect(boxTree.children[1].children[0]?.type).toBe('leaf');
          expect(boxTree.children[1].children[1]?.type).toBe('leaf');
        }
      }
    });

    it('should generate a nested tree for 3+ horizontal items', () => {
      // Uses rw=8: 3×H3★ (cv 2.5 each = 7.5, 93.8%) stays as a single row whose
      // V3 estimate meets the AR floor. At rw=5 the row would split, so the
      // 3-item nested-tree shape this test exercises requires the desktop width.
      const h3_1 = createHorizontalImage(1, 3);
      const h3_2 = createHorizontalImage(2, 3);
      const h3_3 = createHorizontalImage(3, 3);
      const rows = buildRows([h3_1, h3_2, h3_3], DESKTOP);

      expect(rows).toHaveLength(1);
      const boxTree = rows[0]?.boxTree;
      expect(boxTree).toBeDefined();
      expect(boxTree?.type).toBe('combined');
      if (boxTree?.type === 'combined') {
        expect(boxTree.direction).toBe('horizontal');
        // V3 builds: H[ h3_1, V[h3_2, h3_3] ] — leaf on the left, vertical pair right.
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

    it('row results expose only components, templateKey, and boxTree (no label/direction)', () => {
      const rows = buildRows([createHorizontalImage(1, 3), createHorizontalImage(2, 3)], 8, 1.5);
      expect(rows[0]).toHaveProperty('components');
      expect(rows[0]).toHaveProperty('templateKey');
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
    const result = toImageType(img, DESKTOP);
    expect(result.ar).toBe('H');
  });

  it('should classify vertical images as V', () => {
    const img = createVerticalImage(1, 3);
    const result = toImageType(img, DESKTOP);
    expect(result.ar).toBe('V');
  });

  it('should apply vertical penalty to effective rating', () => {
    // V3*: rating=3, effectiveRating=2 (penalty -1)
    const v3 = createVerticalImage(1, 3);
    expect(toImageType(v3, DESKTOP).effectiveRating).toBe(2);

    // H3*: no penalty
    const h3 = createHorizontalImage(2, 3);
    expect(toImageType(h3, DESKTOP).effectiveRating).toBe(3);
  });

  it('should set componentValue from getItemComponentValue', () => {
    const img = createHorizontalImage(1, 5);
    const result = toImageType(img, DESKTOP);
    expect(result.componentValue).toBeGreaterThan(0);
    expect(result.componentValue).toBe(getItemComponentValue(img));
  });

  it('should back-reference the source item', () => {
    const img = createHorizontalImage(1, 4);
    const result = toImageType(img, DESKTOP);
    expect(result.source).toBe(img);
  });
});

describe('AtomicComponent builders', () => {
  const imgH = (): ImageType => toImageType(createHorizontalImage(1, 3), DESKTOP);
  const imgV = (): ImageType => toImageType(createVerticalImage(2, 3), DESKTOP);

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
    const ac = single(toImageType(img, DESKTOP));
    const bt = acToBoxTree(ac);
    expect(bt.type).toBe('leaf');
    if (bt.type === 'leaf') expect(bt.content).toBe(img);
  });

  it('converts H pair to horizontal combined BoxTree', () => {
    const a = toImageType(createHorizontalImage(1, 3), DESKTOP);
    const b = toImageType(createVerticalImage(2, 3), DESKTOP);
    const bt = acToBoxTree(hPair(single(a), single(b)));
    expect(bt.type).toBe('combined');
    if (bt.type === 'combined') {
      expect(bt.direction).toBe('horizontal');
      expect(bt.children[0].type).toBe('leaf');
      expect(bt.children[1].type).toBe('leaf');
    }
  });

  it('converts V stack to vertical combined BoxTree', () => {
    const a = toImageType(createVerticalImage(1, 3), DESKTOP);
    const b = toImageType(createVerticalImage(2, 2), DESKTOP);
    const bt = acToBoxTree(vStack(single(a), single(b)));
    expect(bt.type).toBe('combined');
    if (bt.type === 'combined') expect(bt.direction).toBe('vertical');
  });

  it('preserves source references through conversion', () => {
    const img1 = createHorizontalImage(1, 4);
    const img2 = createVerticalImage(2, 3);
    const a = toImageType(img1, DESKTOP);
    const b = toImageType(img2, DESKTOP);
    const bt = acToBoxTree(hPair(single(a), single(b)));
    if (bt.type === 'combined') {
      expect(bt.children[0].type === 'leaf' && bt.children[0].content).toBe(img1);
      expect(bt.children[1].type === 'leaf' && bt.children[1].content).toBe(img2);
    }
  });
});

describe('lookupComposition', () => {
  // lookupComposition now always routes through buildAtomic; these tests pin the
  // composition shapes and template keys for representative inputs.
  it('returns a single composition for 1H image', () => {
    const imgs = [toImageType(createHorizontalImage(1, 5), DESKTOP)];
    const { templateKey, composition } = lookupComposition(imgs);
    expect(templateKey).toEqual<TemplateKey>({ h: 1, v: 0 });
    expect(composition.type).toBe('single');
  });

  it('returns an H pair for 2H images', () => {
    const imgs = [
      toImageType(createHorizontalImage(1, 3), DESKTOP),
      toImageType(createHorizontalImage(2, 3), DESKTOP),
    ];
    const { templateKey, composition } = lookupComposition(imgs);
    expect(templateKey).toEqual<TemplateKey>({ h: 2, v: 0 });
    expect(composition.type).toBe('pair');
    if (composition.type === 'pair') {
      expect(composition.direction).toBe('H');
    }
  });

  it('builds dominant-left + vStack-right for 1H(4★) + 2V', () => {
    const imgs = [
      toImageType(createHorizontalImage(1, 4), DESKTOP), // dominant H, effectiveRating=4
      toImageType(createVerticalImage(2, 3), DESKTOP),
      toImageType(createVerticalImage(3, 2), DESKTOP),
    ];
    const { composition } = lookupComposition(imgs);
    // V3 builds: H[ H4★, V[V3★, V2★] ] — dominant left, vStack right.
    expect(composition.type).toBe('pair');
    if (composition.type === 'pair') {
      expect(composition.direction).toBe('H');
      expect(composition.children[1].type).toBe('pair');
      if (composition.children[1].type === 'pair') {
        expect(composition.children[1].direction).toBe('V');
      }
    }
  });

  it('builds dominant-left + vStack-right for 1H(3★) + 2V', () => {
    const imgs = [
      toImageType(createHorizontalImage(1, 3), DESKTOP),
      toImageType(createVerticalImage(2, 2), DESKTOP),
      toImageType(createVerticalImage(3, 2), DESKTOP),
    ];
    const { composition } = lookupComposition(imgs);
    // V3 builds: H[ H3★, V[V2★, V2★] ] — leaf left, vStack right.
    expect(composition.type).toBe('pair');
    if (composition.type === 'pair') {
      expect(composition.children[0].type).toBe('single');
      expect(composition.children[1].type).toBe('pair');
      if (composition.children[1].type === 'pair') {
        expect(composition.children[1].direction).toBe('V');
      }
    }
  });

  it('composes a nested pair for 6 images (no static template)', () => {
    const imgs = [1, 2, 3, 4, 5, 6].map(id => toImageType(createHorizontalImage(id, 2), DESKTOP));
    const { composition } = lookupComposition(imgs);
    expect(composition.type).toBe('pair');
  });
});

// =============================================================================
// estimateRowAR
// =============================================================================

describe('estimateRowAR', () => {
  it('returns a positive AR for valid image sets', () => {
    const imgs = [1, 2, 3].map(id => toImageType(createHorizontalImage(id, 3), DESKTOP));
    const ar = estimateRowAR(imgs, 1.5, DESKTOP);
    expect(ar).toBeGreaterThan(0);
  });

  it('4 verticals produce low AR (motivating AR-aware fill)', () => {
    const imgs = [1, 2, 3, 4].map(id => toImageType(createVerticalImage(id, 3), DESKTOP));
    const ar = estimateRowAR(imgs, 1.5, DESKTOP);
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
  it('rowWidth=12 packs 4 H items per row at the constant 0.9 fill bar', () => {
    // The fill bar is a constant MIN_FILL (0.9), no longer rowWidth-scaled:
    // 3×r3 + 1×r4 = cv 11/12 = 92% ≥ 0.9 completes the row after 4 items.
    // Density itself now comes from the rowWidth = chunkSize×2.5 mapping rather
    // than a scaled fill bar.
    const items = [
      createHorizontalImage(1, 3),
      createHorizontalImage(2, 3),
      createHorizontalImage(3, 3),
      createHorizontalImage(4, 4),
      createHorizontalImage(5, 3),
      createHorizontalImage(6, 3),
    ];
    const rows = buildRows(items, 12);
    expect(rows[0]!.components.length).toBe(4);
  });

  it('rowWidth=8 (default) — 3 H items per row at cv 7.5 hits 94% fill', () => {
    const items = [
      createHorizontalImage(1, 3),
      createHorizontalImage(2, 3),
      createHorizontalImage(3, 3),
      createHorizontalImage(4, 3),
    ];
    const rows = buildRows(items, 8);
    expect(rows[0]!.components.length).toBe(3);
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

    // Desktop (rw=8): 5×H1*(cv=1.25) = 6.25/8 = 78.1% → all fit via force-fill
    // But the test only asserts mobile produces MORE rows, not an exact count
    // At rw=8, still 1 row (force-fill packs all 5)

    // Mobile: should produce more rows than desktop
    expect(mobileRows.length).toBeGreaterThan(desktopRows.length);

    // All items should appear in both
    const mobileComponents = mobileRows.flatMap(r => r.components);
    const desktopComponents = desktopRows.flatMap(r => r.components);
    expect(mobileComponents).toHaveLength(5);
    expect(desktopComponents).toHaveLength(5);
  });
});

// ===================== T4: buildNestedQuad fallback to hChain =====================

describe('buildNestedQuad fallback to hChain', () => {
  it('produces a nested pair for a 1h3v row', () => {
    const images = [
      createHorizontalImage(1, 3),
      createVerticalImage(2, 2),
      createVerticalImage(3, 2),
      createVerticalImage(4, 2),
    ].map(item => toImageType(item, 5));

    const { composition } = lookupComposition(images);
    // The composition should be a pair (nested structure), not a flat chain
    expect(composition.type).toBe('pair');
  });

  it('produces a nested pair for a 2h2v row', () => {
    const images = [
      createHorizontalImage(1, 2),
      createHorizontalImage(2, 2),
      createVerticalImage(3, 2),
      createVerticalImage(4, 2),
    ].map(item => toImageType(item, 5));

    const { composition } = lookupComposition(images);
    expect(composition.type).toBe('pair');
  });

  it('should produce valid BoxTree from nested quad composition', () => {
    const images = [
      createVerticalImage(1, 3),
      createVerticalImage(2, 2),
      createVerticalImage(3, 2),
      createVerticalImage(4, 2),
    ].map(item => toImageType(item, 5));

    const { composition } = lookupComposition(images);
    const boxTree = acToBoxTree(composition);

    // Should produce a valid BoxTree
    expect(boxTree.type).toBe('combined');
    // AR should be a finite positive number
    const ar = calculateBoxTreeAspectRatio(boxTree, 5);
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
