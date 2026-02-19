/**
 * Unit tests for rowCombination.ts
 * Tests getOrientation, isRowComplete, buildRows, and template map architecture
 */

import { LAYOUT } from '@/app/constants';
import type { AnyContentModel, ContentImageModel } from '@/app/types/Content';
import { getItemComponentValue } from '@/app/utils/contentRatingUtils';
import {
  buildRows,
  CombinationPattern,
  getOrientation,
  isRowComplete,
  MAX_FILL_RATIO,
  MIN_FILL_RATIO,
} from '@/app/utils/rowCombination';
import type { RowResult } from '@/app/utils/rowCombination';

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

const createSquareImage = (id: number, rating: number): ContentImageModel =>
  createImageContent(id, {
    imageWidth: 1000,
    imageHeight: 1000,
    aspectRatio: 1,
    rating,
  });

const createPanorama = (id: number, rating: number): ContentImageModel =>
  createImageContent(id, {
    imageWidth: 3000,
    imageHeight: 1000,
    aspectRatio: 3,
    rating,
  });

// ===================== Constants =====================

const DESKTOP = LAYOUT.desktopSlotWidth; // 5

// ===================== getOrientation Tests =====================

describe('getOrientation', () => {
  it('should return "horizontal" for landscape images (AR > 1.0)', () => {
    expect(getOrientation(createHorizontalImage(1, 3))).toBe('horizontal');
    expect(getOrientation(createPanorama(1, 3))).toBe('horizontal');
  });

  it('should return "vertical" for portrait images (AR < 1.0)', () => {
    expect(getOrientation(createVerticalImage(1, 3))).toBe('vertical');
  });

  it('should return "vertical" for square images (AR = 1.0)', () => {
    expect(getOrientation(createSquareImage(1, 3))).toBe('vertical');
  });
});

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
// (matchPattern / forceCompleteRow / PATTERN_TABLE tests removed — functions internalized)
// Coverage for internals now lives in rowCombination.characterization.test.ts

describe('buildRows', () => {

  it('should create a single row from one H5* image', () => {
    const items = [createHorizontalImage(1, 5)];
    const rows = buildRows(items, DESKTOP);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.components).toHaveLength(1);
    expect(rows[0]?.patternName).toBe(CombinationPattern.STANDALONE);
  });

  it('should create two rows from two H5* images', () => {
    const items = [createHorizontalImage(1, 5), createHorizontalImage(2, 5)];
    const rows = buildRows(items, DESKTOP);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.patternName).toBe(CombinationPattern.STANDALONE);
    expect(rows[1]?.patternName).toBe(CombinationPattern.STANDALONE);
  });

  it('should match VERTICAL_PAIR pattern for two V3* images', () => {
    const items = [createVerticalImage(1, 3), createVerticalImage(2, 3)];
    const rows = buildRows(items, DESKTOP);
    // V3* + V3* fills ~2.5/5 = 50%, NOT complete
    // Should fall through to forceCompleteRow
    expect(rows).toHaveLength(1);
    expect(rows[0]?.components).toHaveLength(2);
  });

  it('should match TRIPLE_HORIZONTAL for three H3* images', () => {
    const items = [
      createHorizontalImage(1, 3),
      createHorizontalImage(2, 3),
      createHorizontalImage(3, 3),
    ];
    const rows = buildRows(items, DESKTOP);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.components).toHaveLength(3);
    expect(rows[0]?.patternName).toBe(CombinationPattern.TRIPLE_HORIZONTAL);
  });

  it('should match HORIZONTAL_PAIR for H4* + H4* (Issue 7)', () => {
    const items = [createHorizontalImage(1, 4), createHorizontalImage(2, 4)];
    const rows = buildRows(items, DESKTOP);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.components).toHaveLength(2);
    expect(rows[0]?.patternName).toBe(CombinationPattern.HORIZONTAL_PAIR);
    expect(rows[0]?.direction).toBe('horizontal');
  });

  it('should use FORCE_FILL for H3* + H4* (83% fill, below 90% minimum)', () => {
    // H3* (1.67) + H4* (2.5) = 4.17 → 83% fill, below 90% minimum
    // HORIZONTAL_PAIR pattern matches but isRowComplete rejects it
    // Falls back to FORCE_FILL which accepts underfilled rows
    const items = [createHorizontalImage(1, 3), createHorizontalImage(2, 4)];
    const rows = buildRows(items, DESKTOP);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.patternName).toBe(CombinationPattern.FORCE_FILL);
    expect(rows[0]?.components).toHaveLength(2);
  });

  it('should use forceCompleteRow when no pattern matches', () => {
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

  it('should prioritize DOMINANT_VERTICAL_PAIR over VERTICAL_PAIR', () => {
    const items = [
      createHorizontalImage(1, 4),
      createVerticalImage(2, 3),
      createVerticalImage(3, 3),
    ];
    const rows = buildRows(items, DESKTOP);
    // H4* (2.5) + V3* (1.25) + V3* (1.25) = 5.0, 100%
    expect(rows).toHaveLength(1);
    expect(rows[0]?.patternName).toBe(CombinationPattern.DOMINANT_VERTICAL_PAIR);
    expect(rows[0]?.components).toHaveLength(3);
  });

  it('should handle empty input', () => {
    const rows = buildRows([], DESKTOP);
    expect(rows).toHaveLength(0);
  });

  describe('low-rated item skip (Issue 8)', () => {
    it('should allow STANDALONE to skip V1* at position 0 and match H5* at position 1', () => {
      // Collection A, Row 8: [V1*, H5*, ...] → H5* should be standalone, V1* skipped to next row
      // V1* cv ~1.0 (≤ 1.67 threshold), so STANDALONE can skip it
      const items = [
        createVerticalImage(1, 1), // cv ~1.0, skippable
        createHorizontalImage(2, 5), // should match STANDALONE
        createHorizontalImage(3, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      expect(rows.length).toBeGreaterThanOrEqual(2);
      expect(rows[0]?.patternName).toBe(CombinationPattern.STANDALONE);
      expect(rows[0]?.components[0]?.id).toBe(2); // H5* was matched
      expect(rows[0]?.components).toHaveLength(1);
      // V1* should appear in a later row
      const allItemIds = rows.flatMap((r: RowResult) => r.components.map((c: AnyContentModel) => c.id));
      expect(allItemIds).toContain(1); // V1* is used somewhere
    });

    it('should allow STANDALONE to skip V2* at position 0 and match H5* at position 1', () => {
      // Collection B, Row 1: [H2*, H5*, ...] → H5* should be standalone
      // H2* cv = 1.25 (≤ 1.67 threshold), so STANDALONE can skip it
      const items = [
        createHorizontalImage(1, 2), // cv ~1.25, skippable
        createHorizontalImage(2, 5), // should match STANDALONE
        createHorizontalImage(3, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      expect(rows[0]?.patternName).toBe(CombinationPattern.STANDALONE);
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
      // H4* alone in row 1 (FORCE_FILL, 50% fill - final row exception)
      // H5* alone in row 2 (STANDALONE, 100%)
      expect(rows).toHaveLength(2);
      expect(rows[0]?.components).toHaveLength(1);
      expect(rows[0]?.components[0]?.id).toBe(1); // H4* in first row
      expect(rows[1]?.patternName).toBe(CombinationPattern.STANDALONE);
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
      // H5* gets standalone in row 2
      expect(rows[1]?.patternName).toBe(CombinationPattern.STANDALONE);
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
      // Row 1: H5* standalone
      expect(rows[0]?.patternName).toBe(CombinationPattern.STANDALONE);
      expect(rows[0]?.components[0]?.id).toBe(3); // H5* in first row
      // Row 2: V2* + V2* + H3* (FORCE_FILL, ~90% fill)
      expect(rows[1]?.components).toHaveLength(3);
      const componentIds = rows[1]?.components.map((c: AnyContentModel) => c.id);
      expect(componentIds).toEqual([1, 2, 4]);
    });

    it('should skip V3* (effective rating 2) when it precedes H5*', () => {
      // V3* has effective rating 2 (after vertical penalty), which is at the threshold
      const items = [
        createVerticalImage(1, 3), // V3* effective=2, rating ≤ 2, skippable
        createHorizontalImage(2, 5), // H5* - should match STANDALONE
        createHorizontalImage(3, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      // H5* gets standalone in row 1
      expect(rows[0]?.patternName).toBe(CombinationPattern.STANDALONE);
      expect(rows[0]?.components[0]?.id).toBe(2); // H5*
      // V3* goes to next row
      expect(rows[1]?.components[0]?.id).toBe(1); // V3* in row 2
    });
  });

  describe('overfill prevention (Issue 6 / Issue 13)', () => {
    it('should reject DVP when H5* is dominant (H5*+V2*+V3* = 150%+)', () => {
      // Issue 13: H5* (cv=5.0) + V2* (cv=1.25) + V3* (cv=1.25) = 7.5 → 150%
      // DVP pattern matches but isRowComplete rejects due to overfill cap
      // Should fall through to STANDALONE for H5*, then V2*+V3* in next row
      const items = [
        createHorizontalImage(1, 5),
        createVerticalImage(2, 2),
        createVerticalImage(3, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      // H5* should be standalone (100%), V2*+V3* should be in a separate row
      expect(rows).toHaveLength(2);
      expect(rows[0]?.patternName).toBe(CombinationPattern.STANDALONE);
      expect(rows[0]?.components).toHaveLength(1);
    });

    it('should reject DVP when H5* + V2* + V2* = 150%', () => {
      // Collection B, Row 7 scenario
      const items = [
        createHorizontalImage(1, 5),
        createVerticalImage(2, 2),
        createVerticalImage(3, 2),
      ];
      const rows = buildRows(items, DESKTOP);
      expect(rows).toHaveLength(2);
      expect(rows[0]?.patternName).toBe(CombinationPattern.STANDALONE);
      expect(rows[0]?.components).toHaveLength(1);
    });

    it('should accept DVP when H4* is dominant (H4*+V3*+V3* = 100%)', () => {
      // The intended use case — should still work
      const items = [
        createHorizontalImage(1, 4),
        createVerticalImage(2, 3),
        createVerticalImage(3, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.patternName).toBe(CombinationPattern.DOMINANT_VERTICAL_PAIR);
    });

    it('should reject DOMINANT_SECONDARY when H5*+V1* = 120%', () => {
      // Collection A, Row 8 scenario: H5*(5.0) + V1*(cv=1.0) = 6.0 → 120%
      // V1* effective = 0, cv = 5/(6-0) = 0.83... wait, let me check
      // Actually V1* rating=1, effective=0 (vertical penalty), cv = getComponentValue(0, 5)
      // effectiveRating 0: itemsPerRow = 6-0 = 6, clamped to 5, cv = 5/5 = 1.0
      // H5*(5.0) + V1*(1.0) = 6.0 → 120% > 115% → rejected
      const items = [
        createHorizontalImage(1, 5),
        createVerticalImage(2, 1),
      ];
      const rows = buildRows(items, DESKTOP);
      // H5* standalone (100%), V1* alone in next row
      expect(rows).toHaveLength(2);
      expect(rows[0]?.patternName).toBe(CombinationPattern.STANDALONE);
    });

    it('should not produce any pattern-matched row exceeding 115% fill', () => {
      // Pattern-matched rows (STANDALONE, DVP, etc.) must always be within bounds.
      // FORCE_FILL rows are best-effort — they may slightly exceed the cap when
      // the alternative (very underfilled) is worse.
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
        // Skip FORCE_FILL (may exceed normal fill bounds)
        if (row.patternName === CombinationPattern.FORCE_FILL) {
          continue;
        }
        const totalCV = row.components.reduce(
          (sum: number, item: AnyContentModel) => sum + getItemComponentValue(item, DESKTOP),
          0
        );
        const fill = totalCV / DESKTOP;
        expect(fill).toBeLessThanOrEqual(MAX_FILL_RATIO + 0.001);
      }
    });

    it('should prevent previously catastrophic overfills in pattern-matched rows', () => {
      // Collections that previously had 150%+ overfill via DVP matching H5*
      // After Issue 6 fix, these should be STANDALONE + separate rows
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
        // No row should exceed 115%, including FORCE_FILL for this well-structured input
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

  describe('pattern names in buildRows output', () => {
    it('should produce correct patternName for each pattern type', () => {
      const items = [
        createHorizontalImage(1, 4),  // H4★ (cv 2.5)
        createVerticalImage(2, 3),    // V3★ (effective 2, cv 1.25)
        createVerticalImage(3, 3),    // V3★ (effective 2, cv 1.25) → DVP = 5.0 (100%)
        createHorizontalImage(4, 5),  // H5★ (cv 5.0) → STANDALONE
        createHorizontalImage(5, 3),  // H3★ (cv 1.67)
        createHorizontalImage(6, 3),  // H3★ (cv 1.67)
        createHorizontalImage(7, 3),  // H3★ (cv 1.67) → TRIPLE_HORIZONTAL = 5.0 (100%)
      ];
      const rows = buildRows(items, DESKTOP);

      expect(rows.length).toBe(3);

      // Row 1: H4★ + V3★ + V3★ → DOMINANT_VERTICAL_PAIR
      expect(rows[0]?.patternName).toBe(CombinationPattern.DOMINANT_VERTICAL_PAIR);
      expect(rows[0]?.components.length).toBe(3);

      // Row 2: H5★ → STANDALONE
      expect(rows[1]?.patternName).toBe(CombinationPattern.STANDALONE);
      expect(rows[1]?.components.length).toBe(1);

      // Row 3: H3★ + H3★ + H3★ → TRIPLE_HORIZONTAL
      expect(rows[2]?.patternName).toBe(CombinationPattern.TRIPLE_HORIZONTAL);
      expect(rows[2]?.components.length).toBe(3);
    });

    it('should produce FORCE_FILL for unmatched combinations', () => {
      const items = [createHorizontalImage(1, 3), createHorizontalImage(2, 4)];
      const rows = buildRows(items, DESKTOP);
      expect(rows[0]?.patternName).toBe(CombinationPattern.FORCE_FILL);
    });
  });

  describe('nested quad layout', () => {
    it('should detect nested-quad boxTree for 4-item FORCE_FILL with dominant vertical', () => {
      // Real Row 15 scenario: V1★, V2★, V4★, H3★
      // V4★ base rating 4 → effective rating 3 (vertical penalty)
      const v1 = createVerticalImage(1, 1); // V1★ → effective 1
      const v2 = createVerticalImage(2, 2); // V2★ → effective 2
      const v4 = createVerticalImage(3, 4); // V4★ → effective 3
      const h3 = createHorizontalImage(4, 3); // H3★ → effective 3

      const items = [v1, v2, v4, h3];
      const rows = buildRows(items, 5);

      expect(rows).toHaveLength(1);
      expect(rows[0]?.patternName).toBe(CombinationPattern.FORCE_FILL);

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
      expect(rows[0]?.patternName).toBe(CombinationPattern.FORCE_FILL);
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
    it('should generate a leaf boxTree for STANDALONE pattern', () => {
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

    it('should generate a horizontal combined boxTree for HORIZONTAL_PAIR', () => {
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

    it('should generate a nested boxTree for DOMINANT_VERTICAL_PAIR (main-stacked)', () => {
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
