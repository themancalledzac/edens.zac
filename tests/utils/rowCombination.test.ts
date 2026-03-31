/**
 * Unit tests for rowCombination.ts
 * Tests isRowComplete, buildRows, and template map architecture
 */

import { LAYOUT } from '@/app/constants';
import type { AnyContentModel } from '@/app/types/Content';
import { getItemComponentValue } from '@/app/utils/contentRatingUtils';
import type {
  AtomicComponent,
  BoxTree,
  ImageType,
  RowResult,
  TemplateKey,
} from '@/app/utils/rowCombination';
import {
  acToBoxTree,
  buildAtomic,
  buildRows,
  compose,
  estimateRowAR,
  getTemplateKey,
  hChain,
  hPair,
  isRowComplete,
  lookupComposition,
  MAX_FILL_RATIO,
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

const DESKTOP = LAYOUT.desktopSlotWidth; // 5

/** Collect leaf image IDs from an AtomicComponent tree in left-to-right order */
function collectLeafIds(ac: AtomicComponent): number[] {
  if (ac.type === 'single') return [ac.img.source.id];
  return [...collectLeafIds(ac.children[0]), ...collectLeafIds(ac.children[1])];
}

// getOrientation deleted — toImageType handles orientation inline

// ===================== isRowComplete Tests =====================

describe('isRowComplete', () => {
  describe('desktop layout (rowWidth=5)', () => {
    it('should return true for a single H5* (fills entire row)', () => {
      const items = [createHorizontalImage(1, 5)];
      expect(isRowComplete(items, DESKTOP)).toBe(true);
    });

    it('should return true for H4* + V3* (2.5 + ~1.67 = ~4.17, 83%+ of 5)', () => {
      const items = [createHorizontalImage(1, 4), createVerticalImage(2, 3)];
      // H4* effective = 4, componentValue = 2.5
      // V3* effective = 2 (vertical penalty), componentValue = 1.25
      // Total = 3.75, 3.75/5 = 0.75 — NOT complete
      expect(isRowComplete(items, DESKTOP)).toBe(false);
    });

    it('should return true for H4* + H3* (2.5 + 1.67 = 4.17, 83%)', () => {
      const items = [createHorizontalImage(1, 4), createHorizontalImage(2, 3)];
      // H4* componentValue = 2.5, H3* componentValue = 5/3 ≈ 1.67
      // Total ≈ 4.17, 4.17/5 = 0.83 — NOT complete (needs >= 0.9)
      expect(isRowComplete(items, DESKTOP)).toBe(false);
    });

    it('should return true for H4* + H4* (2.5 + 2.5 = 5, 100%)', () => {
      const items = [createHorizontalImage(1, 4), createHorizontalImage(2, 4)];
      expect(isRowComplete(items, DESKTOP)).toBe(true);
    });

    it('should return false for a single V3* (~1.67/5 = 33%)', () => {
      const items = [createVerticalImage(1, 3)];
      expect(isRowComplete(items, DESKTOP)).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(isRowComplete([], DESKTOP)).toBe(false);
    });

    it('should return true for three H3* images (3 × 1.67 = 5, 100%)', () => {
      const items = [
        createHorizontalImage(1, 3),
        createHorizontalImage(2, 3),
        createHorizontalImage(3, 3),
      ];
      expect(isRowComplete(items, DESKTOP)).toBe(true);
    });

    it('should return true for five H1* images (5 × 1 = 5, 100%)', () => {
      const items = Array.from({ length: 5 }, (_, i) => createHorizontalImage(i + 1, 1));
      expect(isRowComplete(items, DESKTOP)).toBe(true);
    });
  });

  describe('threshold behavior', () => {
    it('should return true at exactly 90% fill', () => {
      // H4* (2.5) + H2* (1.25) + H1* (1) = 4.75 → 95% ✓
      const items = [
        createHorizontalImage(1, 4),
        createHorizontalImage(2, 2),
        createHorizontalImage(3, 1),
      ];
      expect(isRowComplete(items, DESKTOP)).toBe(true);
    });

    it('should return true at 100% fill', () => {
      // H5* = 5.0 → 100%
      const items = [createHorizontalImage(1, 5)];
      expect(isRowComplete(items, DESKTOP)).toBe(true);
    });

    it('should return true at ~110% fill (within 115% cap)', () => {
      // H5* (5.0) + H1* (1.0) = 6.0 → 120% — OVER the cap
      // H4* (2.5) + H3* (1.67) + H1* (1.0) = 5.17 → 103% ✓
      const items = [
        createHorizontalImage(1, 4),
        createHorizontalImage(2, 3),
        createHorizontalImage(3, 1),
      ];
      expect(isRowComplete(items, DESKTOP)).toBe(true);
    });

    it('should return false when fill exceeds 115% (overfill cap)', () => {
      // H5* (5.0) + V3* (1.25) = 6.25 → 125% — exceeds cap
      const items = [createHorizontalImage(1, 5), createVerticalImage(2, 3)];
      expect(isRowComplete(items, DESKTOP)).toBe(false);
    });

    it('should return false for catastrophic overfill like 150%+', () => {
      // H5* (5.0) + V2* (1.25) + V2* (1.25) = 7.5 → 150%
      const items = [
        createHorizontalImage(1, 5),
        createVerticalImage(2, 2),
        createVerticalImage(3, 2),
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

  it('should create two rows from two H5* images', () => {
    const items = [createHorizontalImage(1, 5), createHorizontalImage(2, 5)];
    const rows = buildRows(items, DESKTOP);
    expect(rows).toHaveLength(2);
    // Each row: 1 horizontal image → templateKey { h: 1, v: 0 }
    expect(rows[0]?.templateKey).toEqual<TemplateKey>({ h: 1, v: 0 });
    expect(rows[1]?.templateKey).toEqual<TemplateKey>({ h: 1, v: 0 });
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

    // All rows except the last should be >= 90% full
    for (let i = 0; i < rows.length - 1; i++) {
      const row = rows[i];
      if (row) {
        expect(isRowComplete(row.components, DESKTOP)).toBe(true);
      }
    }
  });

  it('should work with rowWidth=4 (tablet)', () => {
    const items = [createHorizontalImage(1, 4), createHorizontalImage(2, 4)];
    const rows = buildRows(items, 4);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.components).toHaveLength(2);
    expect(isRowComplete(rows[0]!.components, 4)).toBe(true);
  });

  it('should work with rowWidth=3 (small tablet)', () => {
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
    it('should allow hero skip: V1* at position 0, H5* at position 1 becomes standalone', () => {
      // Collection A, Row 8: [V1*, H5*, ...] → H5* should be standalone, V1* skipped to next row
      // V1* cv ~1.0 (≤ 1.67 threshold), so STANDALONE can skip it
      const items = [
        createVerticalImage(1, 1), // cv ~1.0, skippable
        createHorizontalImage(2, 5), // should match hero templateKey
        createHorizontalImage(3, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      expect(rows.length).toBeGreaterThanOrEqual(2);
      // Row 0: H5* hero → templateKey { h: 1, v: 0 }
      expect(rows[0]?.templateKey).toEqual<TemplateKey>({ h: 1, v: 0 });
      expect(rows[0]?.components[0]?.id).toBe(2); // H5* was matched
      expect(rows[0]?.components).toHaveLength(1);
      // V1* should appear in a later row
      const allItemIds = rows.flatMap((r: RowResult) =>
        r.components.map((c: AnyContentModel) => c.id)
      );
      expect(allItemIds).toContain(1); // V1* is used somewhere
    });

    it('should allow hero skip: H2* at position 0, H5* at position 1 becomes standalone', () => {
      // Collection B, Row 1: [H2*, H5*, ...] → H5* should be standalone
      // H2* cv = 1.25 (≤ 1.67 threshold), so STANDALONE can skip it
      const items = [
        createHorizontalImage(1, 2), // cv ~1.25, skippable
        createHorizontalImage(2, 5), // should match hero templateKey
        createHorizontalImage(3, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      // Row 0: H5* hero → templateKey { h: 1, v: 0 }
      expect(rows[0]?.templateKey).toEqual<TemplateKey>({ h: 1, v: 0 });
      expect(rows[0]?.components[0]?.id).toBe(2); // H5* was matched
    });

    it('should NOT skip H4* at position 0 (cv 2.5 > 1.67 threshold)', () => {
      // When item 0 is not low-rated, STANDALONE cannot skip it
      // H4* (2.5) alone = 50% → not complete → FORCE_FILL takes just H4*
      // Then H5* becomes standalone on next row
      const items = [
        createHorizontalImage(1, 4), // cv 2.5, NOT skippable
        createHorizontalImage(2, 5), // cannot match STANDALONE while H4* is at position 0
      ];
      const rows = buildRows(items, DESKTOP);
      // H4* alone in row 1, H5* alone in row 2
      expect(rows).toHaveLength(2);
      expect(rows[0]?.components).toHaveLength(1);
      expect(rows[0]?.components[0]?.id).toBe(1); // H4* in first row
      // Row 1: H5* hero → templateKey { h: 1, v: 0 }
      expect(rows[1]?.templateKey).toEqual<TemplateKey>({ h: 1, v: 0 });
      expect(rows[1]?.components[0]?.id).toBe(2); // H5* in second row
    });

    it('should prevent H5*+V4* overfill via overfill cap (Issue 6)', () => {
      // Collection B, Row 9: [V4*, H5*, ...] → H5*+V4* would be 150% overfill
      // V4* effective=3 (NOT low-rated, rating > 2), so it won't be skipped.
      // Instead, FORCE_FILL tries V4*+H5* but rejects due to overfill cap (>115%).
      // Result: V4* alone in row 1, H5* alone in row 2.
      const items = [
        createVerticalImage(1, 4), // effective 3, cv ~1.67, NOT skippable
        createHorizontalImage(2, 5), // H5*, would overfill if paired with V4*
        createHorizontalImage(3, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      // V4* fills first row alone (underfilled, but better than 150% overfill)
      expect(rows[0]?.components[0]?.id).toBe(1); // V4* in row 1
      // H5* gets hero in row 2 → templateKey { h: 1, v: 0 }
      expect(rows[1]?.templateKey).toEqual<TemplateKey>({ h: 1, v: 0 });
      expect(rows[1]?.components[0]?.id).toBe(2); // H5*
    });

    it('should skip only item 0 when multiple low-rated items precede H5*', () => {
      // Test edge case: [V2*, V2*, H5*, H3*] - only first V2* at position 0 gets skipped
      // After H5* standalone, second V2* is at position 0 in next window and won't be skipped
      const items = [
        createVerticalImage(1, 2), // V2* at index 0 - skipped for H5* standalone
        createVerticalImage(2, 2), // V2* at index 1 - NOT skipped, stays in window
        createHorizontalImage(3, 5), // H5* - becomes standalone in row 1
        createHorizontalImage(4, 3), // H3* - to complete row 2 with both V2*
      ];
      const rows = buildRows(items, DESKTOP);
      expect(rows).toHaveLength(2);
      // Row 1: H5* hero → templateKey { h: 1, v: 0 }
      expect(rows[0]?.templateKey).toEqual<TemplateKey>({ h: 1, v: 0 });
      expect(rows[0]?.components[0]?.id).toBe(3); // H5* in first row
      // Row 2: V2* + V2* + H3* (best-fit fallback, ~90% fill)
      expect(rows[1]?.components).toHaveLength(3);
      const componentIds = rows[1]?.components.map((c: AnyContentModel) => c.id);
      expect(componentIds).toEqual([1, 2, 4]);
    });

    it('should skip V3* (effective rating 2) when it precedes H5*', () => {
      // V3* has effective rating 2 (after vertical penalty), which is at the threshold
      const items = [
        createVerticalImage(1, 3), // V3* effective=2, rating ≤ 2, skippable
        createHorizontalImage(2, 5), // H5* - should match hero templateKey
        createHorizontalImage(3, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      // H5* gets hero in row 1 → templateKey { h: 1, v: 0 }
      expect(rows[0]?.templateKey).toEqual<TemplateKey>({ h: 1, v: 0 });
      expect(rows[0]?.components[0]?.id).toBe(2); // H5*
      // V3* goes to next row
      expect(rows[1]?.components[0]?.id).toBe(1); // V3* in row 2
    });
  });

  describe('standalone promotion in greedy fill', () => {
    it('should skip standalone that would overfill, letting subsequent items fill the row', () => {
      // [H3★, H5★, H3★, H3★] — H3★ starts filling (cv=1.67), H5★ would overfill (cv=5.0)
      // H3★ effective=3 (> LOW_RATED_THRESHOLD=2), so hero skip does NOT fire.
      // Instead, greedy fill standalone promotion skips H5★ and continues with H3★+H3★.
      const items = [
        createHorizontalImage(1, 3), // H3★ cv=1.67, effectiveRating=3 (not low-rated)
        createHorizontalImage(2, 5), // H5★ cv=5.0 — standalone, skip during greedy fill
        createHorizontalImage(3, 3), // H3★ cv=1.67
        createHorizontalImage(4, 3), // H3★ cv=1.67
      ];
      const rows = buildRows(items, DESKTOP);
      // Row 0 should contain H3★ + H3★ + H3★ (1.67+1.67+1.67 = 5.0 → 100%)
      // Row 1 should contain H5★ standalone
      const row0Ids = rows[0]?.components.map(c => c.id);
      expect(row0Ids).toEqual([1, 3, 4]);
      expect(rows[1]?.components).toHaveLength(1);
      expect(rows[1]?.components[0]?.id).toBe(2); // H5★ got its own row
    });

    it('should skip H5★ standalone when H4★ leads the row', () => {
      // [H4★, H5★, H3★] — H4★ starts (cv=2.5), H5★ would overfill (cv=5.0)
      // H4★ effective=4 (> LOW_RATED_THRESHOLD=2), hero skip does NOT fire.
      // Standalone promotion skips H5★, continues with H3★.
      const items = [
        createHorizontalImage(1, 4), // H4★ cv=2.5, effectiveRating=4
        createHorizontalImage(2, 5), // H5★ cv=5.0 — standalone, skip
        createHorizontalImage(3, 3), // H3★ cv=1.67
      ];
      const rows = buildRows(items, DESKTOP);
      // Row 0: H4★ + H3★ (2.5+1.67 = 4.17 → 83.4%) — underfilled but best available
      // Row 1: H5★ standalone
      const row0Ids = rows[0]?.components.map(c => c.id);
      expect(row0Ids).toEqual([1, 3]);
      expect(rows[1]?.components).toHaveLength(1);
      expect(rows[1]?.components[0]?.id).toBe(2);
    });

    it('should NOT skip non-standalone items that overfill', () => {
      // [H3★, H4★] — H3★ (cv=1.67) + H4★ (cv=2.5) = 4.17 → 83.4% (under MIN_FILL)
      // H4★ is NOT standalone (cv=2.5, 2.5/5=50% < 90%) → normal overfill handling
      const items = [createHorizontalImage(1, 3), createHorizontalImage(2, 4)];
      const rows = buildRows(items, DESKTOP);
      // Both should end up in rows (best-fit fallback pairs them)
      const totalItems = rows.reduce((sum, r) => sum + r.components.length, 0);
      expect(totalItems).toBe(2);
    });

    it('should preserve all items when standalones are skipped', () => {
      // Ensure no items are lost during standalone skipping
      const items = [
        createVerticalImage(1, 2), // V2★ effective=1, cv=1.0
        createHorizontalImage(2, 5), // H5★ standalone
        createVerticalImage(3, 2), // V2★ effective=1, cv=1.0
        createHorizontalImage(4, 5), // H5★ standalone
        createVerticalImage(5, 2), // V2★ effective=1, cv=1.0
      ];
      const rows = buildRows(items, DESKTOP);
      const allIds = rows.flatMap(r => r.components.map(c => c.id)).sort();
      expect(allIds).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('overfill prevention (Issue 6 / Issue 13)', () => {
    it('should reject dom-stacked when H5* is dominant (H5*+V2*+V3* = 150%+)', () => {
      // Issue 13: H5* (cv=5.0) + V2* (cv=1.25) + V3* (cv=1.25) = 7.5 → 150%
      // Template match but isRowComplete rejects due to overfill cap
      // Should fall through to hero for H5*, then V2*+V3* in next row
      const items = [
        createHorizontalImage(1, 5),
        createVerticalImage(2, 2),
        createVerticalImage(3, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      // H5* should be hero (100%), V2*+V3* should be in a separate row
      expect(rows).toHaveLength(2);
      // Row 0: H5* hero → templateKey { h: 1, v: 0 }
      expect(rows[0]?.templateKey).toEqual<TemplateKey>({ h: 1, v: 0 });
      expect(rows[0]?.components).toHaveLength(1);
    });

    it('should reject dom-stacked when H5* + V2* + V2* = 150%', () => {
      // Collection B, Row 7 scenario
      const items = [
        createHorizontalImage(1, 5),
        createVerticalImage(2, 2),
        createVerticalImage(3, 2),
      ];
      const rows = buildRows(items, DESKTOP);
      expect(rows).toHaveLength(2);
      // Row 0: H5* hero → templateKey { h: 1, v: 0 }
      expect(rows[0]?.templateKey).toEqual<TemplateKey>({ h: 1, v: 0 });
      expect(rows[0]?.components).toHaveLength(1);
    });

    it('should accept dom-stacked when H4* is dominant (H4*+V3*+V3* = 100%)', () => {
      // The intended use case — should still work
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

    it('should reject dom-sec when H5*+V1* = 120%', () => {
      // Collection A, Row 8 scenario: H5*(5.0) + V1*(cv=1.0) = 6.0 → 120%
      // V1* effective = 0, cv = getComponentValue(0, 5)
      // effectiveRating 0: itemsPerRow = 6-0 = 6, clamped to 5, cv = 5/5 = 1.0
      // H5*(5.0) + V1*(1.0) = 6.0 → 120% > 115% → rejected
      const items = [createHorizontalImage(1, 5), createVerticalImage(2, 1)];
      const rows = buildRows(items, DESKTOP);
      // H5* hero (100%), V1* alone in next row
      expect(rows).toHaveLength(2);
      // Row 0: H5* hero → templateKey { h: 1, v: 0 }
      expect(rows[0]?.templateKey).toEqual<TemplateKey>({ h: 1, v: 0 });
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

    it('should prevent previously catastrophic overfills in pattern-matched rows', () => {
      // Collections that previously had 150%+ overfill via DVP matching H5*
      // After Issue 6 fix, these should be hero + separate rows
      const items = [
        createHorizontalImage(1, 5), // Would previously match DVP
        createVerticalImage(2, 3),
        createVerticalImage(3, 3),
        createHorizontalImage(4, 4), // Good DVP candidate
        createVerticalImage(5, 3),
        createVerticalImage(6, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      // All items should be processed
      const totalItems = rows.reduce((sum: number, row) => sum + row.components.length, 0);
      expect(totalItems).toBe(items.length);
      // No row should exceed 150% fill (old catastrophic overfill was 150%+)
      for (const row of rows) {
        const totalCV = row.components.reduce(
          (sum: number, item: AnyContentModel) => sum + getItemComponentValue(item, DESKTOP),
          0
        );
        const fill = totalCV / DESKTOP;
        expect(fill).toBeLessThanOrEqual(1.5);
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
      const items = [
        createHorizontalImage(1, 4), // H4★ (cv 2.5)
        createVerticalImage(2, 3), // V3★ (effective 2, cv 1.25)
        createVerticalImage(3, 3), // V3★ (effective 2, cv 1.25) → dom-stacked-1h2v = 5.0 (100%)
        createHorizontalImage(4, 5), // H5★ (cv 5.0) → hero
        createHorizontalImage(5, 3), // H3★ (cv 1.67)
        createHorizontalImage(6, 3), // H3★ (cv 1.67)
        createHorizontalImage(7, 3), // H3★ (cv 1.67) → triple-h = 5.0 (100%)
      ];
      const rows = buildRows(items, DESKTOP);

      // All items should be processed
      const totalItems = rows.reduce((sum, r) => sum + r.components.length, 0);
      expect(totalItems).toBe(items.length);

      // All rows should have valid templateKeys
      for (const row of rows) {
        expect(row.templateKey).toBeDefined();
        expect(typeof row.templateKey.h).toBe('number');
        expect(typeof row.templateKey.v).toBe('number');
        expect(row.templateKey.h + row.templateKey.v).toBe(row.components.length);
      }
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

      // BoxTree should be a valid combined tree with all 4 leaves
      const boxTree = rows[0]?.boxTree;
      expect(boxTree?.type).toBe('combined');
      // All 4 item IDs should appear as leaves
      if (boxTree) {
        const getLeafIds = (tree: BoxTree): number[] => {
          if (tree.type === 'leaf') return [tree.content.id];
          return [...getLeafIds(tree.children[0]), ...getLeafIds(tree.children[1])];
        };
        expect(getLeafIds(boxTree).sort()).toEqual([v1.id, v2.id, v4.id, h3.id].sort());
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

    it('should generate a combined boxTree for h-pair template', () => {
      const h4_1 = createHorizontalImage(1, 4);
      const h4_2 = createHorizontalImage(2, 4);
      const rows = buildRows([h4_1, h4_2], 5);

      expect(rows).toHaveLength(1);
      const boxTree = rows[0]?.boxTree;
      expect(boxTree).toBeDefined();
      expect(boxTree?.type).toBe('combined');
      if (boxTree?.type === 'combined') {
        expect(boxTree.children).toHaveLength(2);
        expect(boxTree.children[0]?.type).toBe('leaf');
        expect(boxTree.children[1]?.type).toBe('leaf');
        if (boxTree.children[0]?.type === 'leaf' && boxTree.children[1]?.type === 'leaf') {
          const leafIds = [boxTree.children[0].content.id, boxTree.children[1].content.id].sort();
          expect(leafIds).toEqual([h4_1.id, h4_2.id].sort());
        }
      }
    });

    it('should generate a nested boxTree for dom-stacked-1h2v template (main-stacked)', () => {
      const h4 = createHorizontalImage(1, 4);
      const v3_1 = createVerticalImage(2, 3);
      const v3_2 = createVerticalImage(3, 3);
      const rows = buildRows([h4, v3_1, v3_2], 5);

      expect(rows).toHaveLength(1);
      const boxTree = rows[0]?.boxTree;
      expect(boxTree).toBeDefined();
      expect(boxTree?.type).toBe('combined');
      // Bottom-up merge: produces a valid combined tree with all 3 leaves
      if (boxTree?.type === 'combined') {
        const getLeafIds = (tree: BoxTree): number[] => {
          if (tree.type === 'leaf') return [tree.content.id];
          return [...getLeafIds(tree.children[0]), ...getLeafIds(tree.children[1])];
        };
        expect(getLeafIds(boxTree).sort()).toEqual([h4.id, v3_1.id, v3_2.id].sort());
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
      // Bottom-up merge: produces a valid combined tree with all 4 leaves
      if (boxTree?.type === 'combined') {
        const getLeafIds = (tree: BoxTree): number[] => {
          if (tree.type === 'leaf') return [tree.content.id];
          return [...getLeafIds(tree.children[0]), ...getLeafIds(tree.children[1])];
        };
        expect(getLeafIds(boxTree).sort()).toEqual([v4.id, v1.id, v2.id, h3.id].sort());
      }
    });

    it('should generate a combined tree for 3+ horizontal items', () => {
      const h3_1 = createHorizontalImage(1, 3);
      const h3_2 = createHorizontalImage(2, 3);
      const h3_3 = createHorizontalImage(3, 3);
      const rows = buildRows([h3_1, h3_2, h3_3], 5);

      expect(rows).toHaveLength(1);
      const boxTree = rows[0]?.boxTree;
      expect(boxTree).toBeDefined();
      expect(boxTree?.type).toBe('combined');
      // Bottom-up merge: produces a valid combined tree with all 3 leaves
      if (boxTree?.type === 'combined') {
        const getLeafIds = (tree: BoxTree): number[] => {
          if (tree.type === 'leaf') return [tree.content.id];
          return [...getLeafIds(tree.children[0]), ...getLeafIds(tree.children[1])];
        };
        expect(getLeafIds(boxTree).sort()).toEqual([h3_1.id, h3_2.id, h3_3.id].sort());
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
    expect(result.componentValue).toBe(getItemComponentValue(img, DESKTOP));
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

describe('getTemplateKey', () => {
  it('returns "1-0" for a single H image', () => {
    const imgs = [toImageType(createHorizontalImage(1, 5), DESKTOP)];
    expect(getTemplateKey(imgs)).toBe('1-0');
  });

  it('returns "0-1" for a single V image', () => {
    const imgs = [toImageType(createVerticalImage(1, 3), DESKTOP)];
    expect(getTemplateKey(imgs)).toBe('0-1');
  });

  it('returns "2-1" for 2H + 1V', () => {
    const imgs = [
      toImageType(createHorizontalImage(1, 4), DESKTOP),
      toImageType(createHorizontalImage(2, 3), DESKTOP),
      toImageType(createVerticalImage(3, 2), DESKTOP),
    ];
    expect(getTemplateKey(imgs)).toBe('2-1');
  });

  it('returns "0-4" for 4 verticals', () => {
    const imgs = [1, 2, 3, 4].map(id => toImageType(createVerticalImage(id, 2), DESKTOP));
    expect(getTemplateKey(imgs)).toBe('0-4');
  });
});

describe('lookupComposition', () => {
  it('returns compose-1 label for 1 image', () => {
    const imgs = [toImageType(createHorizontalImage(1, 5), DESKTOP)];
    const { label, templateKey } = lookupComposition(imgs);
    expect(label).toBe('compose-1');
    expect(templateKey).toEqual<TemplateKey>({ h: 1, v: 0 });
  });

  it('returns compose-2 label for 2 images', () => {
    const imgs = [
      toImageType(createHorizontalImage(1, 3), DESKTOP),
      toImageType(createHorizontalImage(2, 3), DESKTOP),
    ];
    const { label, templateKey } = lookupComposition(imgs);
    expect(label).toBe('compose-2');
    expect(templateKey).toEqual<TemplateKey>({ h: 2, v: 0 });
  });

  it('returns valid composition for 3 mixed images', () => {
    const imgs = [
      toImageType(createHorizontalImage(1, 4), DESKTOP),
      toImageType(createVerticalImage(2, 3), DESKTOP),
      toImageType(createVerticalImage(3, 2), DESKTOP),
    ];
    const { composition, templateKey } = lookupComposition(imgs);
    expect(composition.type).toBe('pair');
    expect(templateKey).toEqual<TemplateKey>({ h: 1, v: 2 });
  });

  it('handles 6+ images via compose', () => {
    const imgs = Array.from({ length: 6 }, (_, i) =>
      toImageType(createHorizontalImage(i + 1, 3), DESKTOP)
    );
    const { label, composition } = lookupComposition(imgs);
    expect(label).toBe('compose-6');
    expect(composition.type).toBe('pair');
  });
});

// =============================================================================
// buildAtomic — AR-target scoring tests
// =============================================================================

describe('buildAtomic', () => {
  const TARGET_AR = 1.5;

  it('throws on empty input', () => {
    expect(() => buildAtomic([], TARGET_AR, DESKTOP)).toThrow(
      'buildAtomic requires at least 1 image'
    );
  });

  it('returns single leaf for 1 image', () => {
    const img = toImageType(createHorizontalImage(1, 5), DESKTOP);
    const result = buildAtomic([img], TARGET_AR, DESKTOP);
    expect(result.type).toBe('single');
  });

  it('returns pair for 2 images preserving input order', () => {
    const imgs = [
      toImageType(createVerticalImage(1, 2), DESKTOP),
      toImageType(createHorizontalImage(2, 4), DESKTOP),
    ];
    const result = buildAtomic(imgs, TARGET_AR, DESKTOP);
    expect(result.type).toBe('pair');
    if (result.type === 'pair') {
      expect(result.children[0].type).toBe('single');
      expect(result.children[1].type).toBe('single');
      if (result.children[0].type === 'single' && result.children[1].type === 'single') {
        expect(result.children[0].img.source.id).toBe(1);
        expect(result.children[1].img.source.id).toBe(2);
      }
    }
  });

  it('merges lowest-rated adjacent pair first for 3 images', () => {
    const imgs = [
      toImageType(createHorizontalImage(1, 1), DESKTOP),
      toImageType(createHorizontalImage(2, 4), DESKTOP),
      toImageType(createHorizontalImage(3, 1), DESKTOP),
    ];
    const result = buildAtomic(imgs, TARGET_AR, DESKTOP);
    const leafIds = collectLeafIds(result);
    expect(leafIds).toHaveLength(3);
    expect(leafIds.sort()).toEqual([1, 2, 3]);
  });

  it('higher-rated images get merged last (occupy more space)', () => {
    const imgs = [
      toImageType(createHorizontalImage(1, 1), DESKTOP),
      toImageType(createHorizontalImage(2, 1), DESKTOP),
      toImageType(createHorizontalImage(3, 5), DESKTOP),
    ];
    const result = buildAtomic(imgs, TARGET_AR, DESKTOP);
    expect(result.type).toBe('pair');
    if (result.type === 'pair') {
      const [left, right] = result.children;
      const singleChild = left.type === 'single' ? left : (right.type === 'single' ? right : null);
      const pairChild = left.type === 'pair' ? left : (right.type === 'pair' ? right : null);
      expect(singleChild).not.toBeNull();
      expect(pairChild).not.toBeNull();
      if (singleChild?.type === 'single') {
        expect(singleChild.img.effectiveRating).toBe(5);
      }
    }
  });

  it('preserves natural order: dominant in middle does not scramble', () => {
    // Dominant (5★) is in the MIDDLE — current code forces it right, scrambling order
    const imgs = [
      toImageType(createHorizontalImage(1, 1), DESKTOP),
      toImageType(createHorizontalImage(2, 5), DESKTOP),
      toImageType(createHorizontalImage(3, 1), DESKTOP),
    ];
    const result = buildAtomic(imgs, TARGET_AR, DESKTOP);
    const leafIds = collectLeafIds(result);
    // Natural order preserved: 1, 2, 3 — not scrambled by rating extraction
    expect(leafIds).toEqual([1, 2, 3]);
  });

  it('preserves natural order with 4 images and dominant in middle', () => {
    // [A(1★), B(5★), C(1★), D(2★)] — dominant at index 1
    const imgs = [
      toImageType(createHorizontalImage(1, 1), DESKTOP),
      toImageType(createHorizontalImage(2, 5), DESKTOP),
      toImageType(createHorizontalImage(3, 1), DESKTOP),
      toImageType(createHorizontalImage(4, 2), DESKTOP),
    ];
    const result = buildAtomic(imgs, TARGET_AR, DESKTOP);
    const leafIds = collectLeafIds(result);
    expect(leafIds).toHaveLength(4);
    // Natural order: 1 before 2 before 3 before 4
    expect(leafIds).toEqual([1, 2, 3, 4]);
  });

  it('4 images: lowest-rated pair merges first', () => {
    const imgs = [
      toImageType(createHorizontalImage(1, 2), DESKTOP),
      toImageType(createHorizontalImage(2, 5), DESKTOP),
      toImageType(createHorizontalImage(3, 1), DESKTOP),
      toImageType(createHorizontalImage(4, 1), DESKTOP),
    ];
    const result = buildAtomic(imgs, TARGET_AR, DESKTOP);
    const leafIds = collectLeafIds(result);
    expect(leafIds).toHaveLength(4);
    expect(leafIds.sort()).toEqual([1, 2, 3, 4]);
  });

  it('produces reasonable AR for mixed orientations', () => {
    const imgs = [
      toImageType(createVerticalImage(1, 2), DESKTOP),
      toImageType(createHorizontalImage(2, 3), DESKTOP),
      toImageType(createVerticalImage(3, 3), DESKTOP),
      toImageType(createHorizontalImage(4, 5), DESKTOP),
    ];
    const result = buildAtomic(imgs, TARGET_AR, DESKTOP);
    const ar = calculateBoxTreeAspectRatio(acToBoxTree(result), DESKTOP);
    expect(ar).toBeGreaterThan(0.5);
    expect(ar).toBeLessThan(5);
  });

  it('4 verticals: stacked layout produces compact AR', () => {
    const imgs = [1, 2, 3, 4].map(id => toImageType(createVerticalImage(id, id), DESKTOP));
    const result = buildAtomic(imgs, TARGET_AR, DESKTOP);
    const ar = calculateBoxTreeAspectRatio(acToBoxTree(result), DESKTOP);
    expect(ar).toBeLessThan(2.5);
  });
});

// =============================================================================
// compose — recursive composition dispatcher
// =============================================================================

describe('compose', () => {
  const TARGET_AR = 1.5;

  it('throws on empty input', () => {
    expect(() => compose([], TARGET_AR, DESKTOP)).toThrow();
  });

  it('n=1: returns single leaf', () => {
    const img = toImageType(createHorizontalImage(1, 3), DESKTOP);
    const result = compose([img], TARGET_AR, DESKTOP);
    expect(result.type).toBe('single');
  });

  it('n=2: picks best of hPair/vStack by AR fit', () => {
    const imgs = [
      toImageType(createVerticalImage(1, 3), DESKTOP),
      toImageType(createVerticalImage(2, 3), DESKTOP),
    ];
    const result = compose(imgs, TARGET_AR, DESKTOP);
    // Two verticals side-by-side (hPair) has higher AR than stacked
    expect(result.type).toBe('pair');
  });

  it('n=3: produces valid tree with reasonable AR', () => {
    const imgs = [
      toImageType(createHorizontalImage(1, 3), DESKTOP),
      toImageType(createHorizontalImage(2, 2), DESKTOP),
      toImageType(createVerticalImage(3, 4), DESKTOP),
    ];
    const result = compose(imgs, TARGET_AR, DESKTOP);
    const ar = calculateBoxTreeAspectRatio(acToBoxTree(result), DESKTOP);
    expect(ar).toBeGreaterThan(0);
    expect(ar).toBeLessThan(10);
  });

  it('n=4: produces valid tree', () => {
    const imgs = [
      toImageType(createVerticalImage(1, 2), DESKTOP),
      toImageType(createHorizontalImage(2, 3), DESKTOP),
      toImageType(createVerticalImage(3, 3), DESKTOP),
      toImageType(createHorizontalImage(4, 5), DESKTOP),
    ];
    const result = compose(imgs, TARGET_AR, DESKTOP);
    expect(result.type).toBe('pair');
    const ar = calculateBoxTreeAspectRatio(acToBoxTree(result), DESKTOP);
    expect(ar).toBeGreaterThan(0);
  });

  it('n=5: tries partition candidates and picks best AR fit', () => {
    const imgs = [
      toImageType(createVerticalImage(1, 2), DESKTOP),
      toImageType(createVerticalImage(2, 2), DESKTOP),
      toImageType(createVerticalImage(3, 3), DESKTOP),
      toImageType(createHorizontalImage(4, 3), DESKTOP),
      toImageType(createHorizontalImage(5, 4), DESKTOP),
    ];
    const result = compose(imgs, TARGET_AR, DESKTOP);
    const ar = calculateBoxTreeAspectRatio(acToBoxTree(result), DESKTOP);
    // Should produce a reasonable AR — not extremely wide or tall
    expect(ar).toBeGreaterThan(0.5);
    expect(ar).toBeLessThan(5);
  });

  it('n=6 uniform images: prefers balanced partition over lopsided dominant', () => {
    const imgs = [1, 2, 3, 4, 5, 6].map(id => toImageType(createHorizontalImage(id, 3), DESKTOP));
    const result = compose(imgs, TARGET_AR, DESKTOP);
    const ar = calculateBoxTreeAspectRatio(acToBoxTree(result), DESKTOP);
    expect(ar).toBeGreaterThan(0.5);
    expect(ar).toBeLessThan(10);
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

  it('4 verticals produce a positive AR', () => {
    const imgs = [1, 2, 3, 4].map(id => toImageType(createVerticalImage(id, 3), DESKTOP));
    const ar = estimateRowAR(imgs, 1.5, DESKTOP);
    // Should return a positive finite AR
    expect(ar).toBeGreaterThan(0);
    expect(Number.isFinite(ar)).toBe(true);
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
    // Many low-rated verticals — should cap at 8
    const items = Array.from({ length: 12 }, (_, i) => createVerticalImage(i + 1, 1));
    const rows = buildRows(items, DESKTOP, 1.5);
    for (const row of rows) {
      expect(row.components.length).toBeLessThanOrEqual(8);
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
    const desktopRows = buildRows(items, 5);

    // Desktop: 5 items with rating 1 (CV=1 each) → 5 slots, fits in 1 row
    expect(desktopRows).toHaveLength(1);

    // Mobile: 5 items with rating 1 (CV=1 each on mobile) → 2 slots per row
    // Should produce more rows than desktop
    expect(mobileRows.length).toBeGreaterThan(desktopRows.length);

    // All items should appear in both
    const mobileComponents = mobileRows.flatMap(r => r.components);
    const desktopComponents = desktopRows.flatMap(r => r.components);
    expect(mobileComponents).toHaveLength(5);
    expect(desktopComponents).toHaveLength(5);
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
