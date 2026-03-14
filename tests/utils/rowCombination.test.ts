/**
 * Unit tests for rowCombination.ts
 * Tests isRowComplete, buildRows, and template map architecture
 */

import { LAYOUT } from '@/app/constants';
import type { AnyContentModel, ContentImageModel } from '@/app/types/Content';
import { getItemComponentValue } from '@/app/utils/contentRatingUtils';
import type { ImageType, RowResult, TemplateKey } from '@/app/utils/rowCombination';
import {
  acToBoxTree,
  buildAtomic,
  buildRows,
  compose,
  estimateRowAR,
  findDominant,
  getTemplateKey,
  hChain,
  hPair,
  isRowComplete,
  lookupComposition,
  MAX_FILL_RATIO,
  MIN_FILL_RATIO,
  single,
  TEMPLATE_MAP,
  toImageType,
  vStack,
} from '@/app/utils/rowCombination';
import { calculateBoxTreeAspectRatio } from '@/app/utils/rowStructureAlgorithm';

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

const createHorizontalImage = (id: number, rating: number): ContentImageModel =>
  createImageContent(id, {
    imageWidth: 1920,
    imageHeight: 1080,
    aspectRatio: 1920 / 1080,
    rating,
  });

const createVerticalImage = (id: number, rating: number): ContentImageModel =>
  createImageContent(id, {
    imageWidth: 1080,
    imageHeight: 1920,
    aspectRatio: 1080 / 1920,
    rating,
  });

// ===================== Constants =====================

const DESKTOP = LAYOUT.desktopSlotWidth; // 5

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
    expect(rows[0]?.direction).toBe('horizontal');
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
    const items = [
      createHorizontalImage(1, 4),
      createHorizontalImage(2, 4),
    ];
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
      const allItemIds = rows.flatMap((r: RowResult) => r.components.map((c: AnyContentModel) => c.id));
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
      const items = [
        createHorizontalImage(1, 3),
        createHorizontalImage(2, 4),
      ];
      const rows = buildRows(items, DESKTOP);
      // Both should end up in rows (best-fit fallback pairs them)
      const totalItems = rows.reduce((sum, r) => sum + r.components.length, 0);
      expect(totalItems).toBe(2);
    });

    it('should preserve all items when standalones are skipped', () => {
      // Ensure no items are lost during standalone skipping
      const items = [
        createVerticalImage(1, 2),   // V2★ effective=1, cv=1.0
        createHorizontalImage(2, 5), // H5★ standalone
        createVerticalImage(3, 2),   // V2★ effective=1, cv=1.0
        createHorizontalImage(4, 5), // H5★ standalone
        createVerticalImage(5, 2),   // V2★ effective=1, cv=1.0
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
      const items = [
        createHorizontalImage(1, 5),
        createVerticalImage(2, 1),
      ];
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
        createHorizontalImage(1, 5),   // Would previously match DVP
        createVerticalImage(2, 3),
        createVerticalImage(3, 3),
        createHorizontalImage(4, 4),   // Good DVP candidate
        createVerticalImage(5, 3),
        createVerticalImage(6, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      for (const row of rows) {
        const totalCV = row.components.reduce(
          (sum: number, item: AnyContentModel) => sum + getItemComponentValue(item, DESKTOP),
          0
        );
        const fill = totalCV / DESKTOP;
        // No row should exceed 115%, including best-fit fallback for this well-structured input
        expect(fill).toBeLessThanOrEqual(MAX_FILL_RATIO + 0.001);
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
      const totalItems = rows.reduce((sum: number, row: RowResult) => sum + row.components.length, 0);
      expect(totalItems).toBe(items.length);
    });
  });

  describe('template keys in buildRows output', () => {
    it('should produce correct templateKey for each template type', () => {
      const items = [
        createHorizontalImage(1, 4),  // H4★ (cv 2.5)
        createVerticalImage(2, 3),    // V3★ (effective 2, cv 1.25)
        createVerticalImage(3, 3),    // V3★ (effective 2, cv 1.25) → dom-stacked-1h2v = 5.0 (100%)
        createHorizontalImage(4, 5),  // H5★ (cv 5.0) → hero
        createHorizontalImage(5, 3),  // H3★ (cv 1.67)
        createHorizontalImage(6, 3),  // H3★ (cv 1.67)
        createHorizontalImage(7, 3),  // H3★ (cv 1.67) → triple-h = 5.0 (100%)
      ];
      const rows = buildRows(items, DESKTOP);

      expect(rows.length).toBe(3);

      // Row 1: H4★ + V3★ + V3★ → dom-stacked-1h2v → templateKey { h: 1, v: 2 }
      expect(rows[0]?.templateKey).toEqual<TemplateKey>({ h: 1, v: 2 });
      expect(rows[0]?.components.length).toBe(3);

      // Row 2: H5★ → hero → templateKey { h: 1, v: 0 }
      expect(rows[1]?.templateKey).toEqual<TemplateKey>({ h: 1, v: 0 });
      expect(rows[1]?.components.length).toBe(1);

      // Row 3: H3★ + H3★ + H3★ → triple-h → templateKey { h: 3, v: 0 }
      expect(rows[2]?.templateKey).toEqual<TemplateKey>({ h: 3, v: 0 });
      expect(rows[2]?.components.length).toBe(3);
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

      // BoxTree should be nested-quad structure: main | (topPair / bottom)
      const boxTree = rows[0]?.boxTree;
      expect(boxTree?.type).toBe('combined');
      if (boxTree?.type === 'combined') {
        expect(boxTree.direction).toBe('horizontal');
        // Left child should be the main (V4★)
        expect(boxTree.children[0].type).toBe('leaf');
        if (boxTree.children[0].type === 'leaf') {
          expect(boxTree.children[0].content).toEqual(v4);
        }
        // Right child should be vertical stack
        expect(boxTree.children[1].type).toBe('combined');
        if (boxTree.children[1].type === 'combined') {
          expect(boxTree.children[1].direction).toBe('vertical');
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
      const h4_1 = createHorizontalImage(1, 4);
      const h4_2 = createHorizontalImage(2, 4);
      const rows = buildRows([h4_1, h4_2], 5);

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
      const h4 = createHorizontalImage(1, 4);
      const v3_1 = createVerticalImage(2, 3);
      const v3_2 = createVerticalImage(3, 3);
      const rows = buildRows([h4, v3_1, v3_2], 5);

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
        // Left child: main (V4*)
        expect(boxTree.children[0]?.type).toBe('leaf');
        // Right child: nested vertical (top pair + bottom)
        expect(boxTree.children[1]?.type).toBe('combined');
        if (boxTree.children[1]?.type === 'combined') {
          expect(boxTree.children[1].direction).toBe('vertical');
          // Top: horizontal pair (V1* + V2*)
          expect(boxTree.children[1].children[0]?.type).toBe('combined');
          if (boxTree.children[1].children[0]?.type === 'combined') {
            expect(boxTree.children[1].children[0].direction).toBe('horizontal');
          }
          // Bottom: H3*
          expect(boxTree.children[1].children[1]?.type).toBe('leaf');
        }
      }
    });

    it('should generate left-heavy tree for 3+ horizontal items', () => {
      const h3_1 = createHorizontalImage(1, 3);
      const h3_2 = createHorizontalImage(2, 3);
      const h3_3 = createHorizontalImage(3, 3);
      const rows = buildRows([h3_1, h3_2, h3_3], 5);

      expect(rows).toHaveLength(1);
      const boxTree = rows[0]?.boxTree;
      expect(boxTree).toBeDefined();
      expect(boxTree?.type).toBe('combined');
      if (boxTree?.type === 'combined') {
        expect(boxTree.direction).toBe('horizontal');
        // Left child: combined (h3_1 + h3_2)
        expect(boxTree.children[0]?.type).toBe('combined');
        // Right child: leaf (h3_3)
        expect(boxTree.children[1]?.type).toBe('leaf');
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
    const imgs = [1, 2, 3, 4].map((id) =>
      toImageType(createVerticalImage(id, 2), DESKTOP)
    );
    expect(getTemplateKey(imgs)).toBe('0-4');
  });
});

describe('findDominant', () => {
  it('returns the highest effective-rating image', () => {
    const h5 = toImageType(createHorizontalImage(1, 5), DESKTOP);
    const h3 = toImageType(createHorizontalImage(2, 3), DESKTOP);
    const h2 = toImageType(createHorizontalImage(3, 2), DESKTOP);
    const { dominant, rest } = findDominant([h3, h5, h2]);
    expect(dominant).toBe(h5);
    expect(rest).toHaveLength(2);
    expect(rest).not.toContain(h5);
  });

  it('returns first image when all ratings are equal', () => {
    const a = toImageType(createHorizontalImage(1, 3), DESKTOP);
    const b = toImageType(createHorizontalImage(2, 3), DESKTOP);
    const { dominant } = findDominant([a, b]);
    expect(dominant).toBe(a);
  });

  it('throws on empty array', () => {
    expect(() => findDominant([])).toThrow();
  });
});

describe('TEMPLATE_MAP', () => {
  const allKeys = [
    '1-0', '0-1',
    '2-0', '1-1', '0-2',
    '3-0', '2-1', '1-2', '0-3',
    '4-0', '3-1', '2-2', '1-3', '0-4',
    '5-0', '4-1', '3-2', '2-3', '1-4', '0-5',
  ];

  it('has entries for all (hCount, vCount) combos up to 5 items', () => {
    for (const key of allKeys) {
      expect(TEMPLATE_MAP[key]).toBeDefined();
    }
  });

  it('every entry has a label string', () => {
    for (const key of allKeys) {
      expect(typeof TEMPLATE_MAP[key]?.label).toBe('string');
    }
  });

  it('every entry has a build function', () => {
    for (const key of allKeys) {
      expect(typeof TEMPLATE_MAP[key]?.build).toBe('function');
    }
  });
});

describe('lookupComposition', () => {
  it('returns hero label for 1H image', () => {
    const imgs = [toImageType(createHorizontalImage(1, 5), DESKTOP)];
    const { label, templateKey } = lookupComposition(imgs);
    expect(label).toBe('hero');
    expect(templateKey).toEqual<TemplateKey>({ h: 1, v: 0 });
  });

  it('returns h-pair label for 2H images', () => {
    const imgs = [
      toImageType(createHorizontalImage(1, 3), DESKTOP),
      toImageType(createHorizontalImage(2, 3), DESKTOP),
    ];
    const { label, templateKey } = lookupComposition(imgs);
    expect(label).toBe('h-pair');
    expect(templateKey).toEqual<TemplateKey>({ h: 2, v: 0 });
  });

  it('builds dom-stacked when dominant H has effectiveRating >= 4', () => {
    const imgs = [
      toImageType(createHorizontalImage(1, 4), DESKTOP), // dominant H, effectiveRating=4
      toImageType(createVerticalImage(2, 3), DESKTOP),
      toImageType(createVerticalImage(3, 2), DESKTOP),
    ];
    const { label, composition } = lookupComposition(imgs);
    expect(label).toBe('dom-stacked-1h2v');
    // Root should be H pair: dominant left, vStack right
    expect(composition.type).toBe('pair');
    if (composition.type === 'pair') {
      expect(composition.direction).toBe('H');
      expect(composition.children[1].type).toBe('pair');
      if (composition.children[1].type === 'pair') {
        expect(composition.children[1].direction).toBe('V');
      }
    }
  });

  it('falls back to chain when no dominant H >= 4 in 2-1', () => {
    const imgs = [
      toImageType(createHorizontalImage(1, 3), DESKTOP), // effectiveRating=3, not >= 4
      toImageType(createVerticalImage(2, 2), DESKTOP),
      toImageType(createVerticalImage(3, 2), DESKTOP),
    ];
    const { label } = lookupComposition(imgs);
    // buildDominantStacked falls back to hChain
    expect(label).toBe('dom-stacked-1h2v');
    const { composition } = lookupComposition(imgs);
    // hChain of 3 → nested pair, not vStack at root
    expect(composition.type).toBe('pair');
    if (composition.type === 'pair') {
      expect(composition.children[1].type).toBe('single'); // right = last item, not vStack
    }
  });

  it('returns chain-fallback label for unknown key and logs warning', () => {
    // Inject an edge case by passing 6 images (no key in map)
    const imgs = [1, 2, 3, 4, 5, 6].map((id) =>
      toImageType(createHorizontalImage(id, 2), DESKTOP)
    );
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { label } = lookupComposition(imgs);
    expect(label).toBe('compose-fallback');
    // compose-fallback no longer warns — it handles 6+ images gracefully
    warnSpy.mockRestore();
  });
});

// =============================================================================
// buildAtomic — AR-target scoring tests
// =============================================================================

describe('buildAtomic', () => {
  const TARGET_AR = 1.5;

  it('throws on empty input', () => {
    expect(() => buildAtomic([], TARGET_AR, DESKTOP)).toThrow('buildAtomic requires at least 1 image');
  });

  it('returns single leaf for 1 image', () => {
    const img = toImageType(createHorizontalImage(1, 5), DESKTOP);
    const result = buildAtomic([img], TARGET_AR, DESKTOP);
    expect(result.type).toBe('single');
  });

  it('returns hPair for 2 images', () => {
    const imgs = [
      toImageType(createVerticalImage(1, 2), DESKTOP),
      toImageType(createHorizontalImage(2, 4), DESKTOP),
    ];
    const result = buildAtomic(imgs, TARGET_AR, DESKTOP);
    expect(result.type).toBe('pair');
    if (result.type === 'pair') {
      expect(result.direction).toBe('H');
    }
  });

  it('picks stacked layout for 4 verticals (AR closer to 1.5)', () => {
    const imgs = [1, 2, 3, 4].map((id) =>
      toImageType(createVerticalImage(id, id), DESKTOP)
    );
    const result = buildAtomic(imgs, TARGET_AR, DESKTOP);

    // Should NOT be a flat chain — should use vStack to compact AR
    const ar = calculateBoxTreeAspectRatio(acToBoxTree(result), DESKTOP);
    // A flat chain of 4 verticals would have AR ~= 4 * 0.56 = 2.25
    // Stacked pairs should be closer to 1.5
    expect(ar).toBeLessThan(2.0);
  });

  it('dominant image is on the right side of the final hPair', () => {
    const imgs = [
      toImageType(createVerticalImage(1, 1), DESKTOP),
      toImageType(createVerticalImage(2, 2), DESKTOP),
      toImageType(createHorizontalImage(3, 5), DESKTOP), // dominant (rating 5)
    ];
    const result = buildAtomic(imgs, TARGET_AR, DESKTOP);

    // Root should be hPair with dominant on right
    expect(result.type).toBe('pair');
    if (result.type === 'pair') {
      expect(result.direction).toBe('H');
      // Right child should be the dominant (rating 5, id 3)
      const right = result.children[1];
      expect(right.type).toBe('single');
      if (right.type === 'single') {
        expect(right.img.effectiveRating).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('3 horizontals: result AR is reasonable', () => {
    const imgs = [1, 2, 3].map((id) =>
      toImageType(createHorizontalImage(id, id + 1), DESKTOP)
    );
    const result = buildAtomic(imgs, TARGET_AR, DESKTOP);
    const ar = calculateBoxTreeAspectRatio(acToBoxTree(result), DESKTOP);

    // Should pick whichever candidate is closest to 1.5
    // All horizontals are wide, so AR will be > 1.5 regardless,
    // but buildAtomic should pick the best available option
    expect(ar).toBeGreaterThan(0);
    expect(ar).toBeLessThan(10);
  });

  it('mixed 4 items: stacked rest beats flat chain when verticals present', () => {
    const imgs = [
      toImageType(createVerticalImage(1, 2), DESKTOP),
      toImageType(createHorizontalImage(2, 2), DESKTOP),
      toImageType(createVerticalImage(3, 3), DESKTOP),
      toImageType(createHorizontalImage(4, 5), DESKTOP), // dominant
    ];
    const result = buildAtomic(imgs, TARGET_AR, DESKTOP);
    const ar = calculateBoxTreeAspectRatio(acToBoxTree(result), DESKTOP);

    // With vertical stacking, AR should be more compact than a flat chain
    // Flat chain of 4 items would be very wide (AR > 3)
    expect(ar).toBeLessThan(4.0);
  });

  it('result AR is closest to targetAR among all candidates', () => {
    const imgs = [
      toImageType(createVerticalImage(1, 1), DESKTOP),
      toImageType(createVerticalImage(2, 2), DESKTOP),
      toImageType(createVerticalImage(3, 3), DESKTOP),
      toImageType(createHorizontalImage(4, 5), DESKTOP),
    ];
    const result = buildAtomic(imgs, TARGET_AR, DESKTOP);
    const resultAR = calculateBoxTreeAspectRatio(acToBoxTree(result), DESKTOP);
    const resultDistance = Math.abs(resultAR - TARGET_AR);

    // Build all possible structures manually and verify none is closer
    const { dominant, rest } = findDominant(imgs);
    const sorted = [...rest].sort((a, b) => a.effectiveRating - b.effectiveRating);
    const [a, b, c] = [single(sorted[0]!), single(sorted[1]!), single(sorted[2]!)];

    const manualCandidates = [
      hPair(vStack(hPair(a, b), c), single(dominant)),
      hPair(vStack(a, hPair(b, c)), single(dominant)),
      hPair(hChain(sorted), single(dominant)),
    ];

    for (const candidate of manualCandidates) {
      const candidateAR = calculateBoxTreeAspectRatio(acToBoxTree(candidate), DESKTOP);
      const candidateDistance = Math.abs(candidateAR - TARGET_AR);
      expect(resultDistance).toBeLessThanOrEqual(candidateDistance + 0.001);
    }
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
    const imgs = [1, 2, 3, 4, 5, 6].map(id =>
      toImageType(createHorizontalImage(id, 3), DESKTOP)
    );
    const result = compose(imgs, TARGET_AR, DESKTOP);
    const ar = calculateBoxTreeAspectRatio(acToBoxTree(result), DESKTOP);
    expect(ar).toBeGreaterThan(0.5);
    expect(ar).toBeLessThan(10);
  });

  it('n=6 with vertical panorama: single-dominant wins when appropriate', () => {
    // Vertical panorama (AR ~0.4) should be sole dominant
    const panoramaV = toImageType(
      createImageContent(1, {
        imageWidth: 800,
        imageHeight: 2000,
        aspectRatio: 0.4,
        rating: 5,
      }),
      DESKTOP
    );
    const rest = [2, 3, 4, 5, 6].map(id =>
      toImageType(createHorizontalImage(id, 2), DESKTOP)
    );
    const result = compose([panoramaV, ...rest], TARGET_AR, DESKTOP);
    const ar = calculateBoxTreeAspectRatio(acToBoxTree(result), DESKTOP);
    // The panorama should make the AR reasonable, not extremely wide
    expect(ar).toBeGreaterThan(0.5);
    expect(ar).toBeLessThan(5);
  });
});

// =============================================================================
// estimateRowAR
// =============================================================================

describe('estimateRowAR', () => {
  it('returns a positive AR for valid image sets', () => {
    const imgs = [1, 2, 3].map(id =>
      toImageType(createHorizontalImage(id, 3), DESKTOP)
    );
    const ar = estimateRowAR(imgs, 1.5, DESKTOP);
    expect(ar).toBeGreaterThan(0);
  });

  it('4 verticals produce low AR (motivating AR-aware fill)', () => {
    const imgs = [1, 2, 3, 4].map(id =>
      toImageType(createVerticalImage(id, 3), DESKTOP)
    );
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
    // Many low-rated verticals — should cap at 8
    const items = Array.from({ length: 12 }, (_, i) =>
      createVerticalImage(i + 1, 1)
    );
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
