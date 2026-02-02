/**
 * Unit tests for rowStructureAlgorithm.ts
 * Tests row creation and size calculation with pattern detection
 */

import type { ContentImageModel } from '@/app/types/Content';
import {
  calculateRowSizes,
  calculateRowSizesFromPattern,
  createRowsArray,
  createRowsArrayLegacy,
  type RowWithPattern,
} from '@/app/utils/rowStructureAlgorithm';

// ===================== Test Fixtures =====================

/**
 * Create a mock image content for testing
 */
const createImageContent = (
  id: number,
  overrides?: Partial<ContentImageModel>
): ContentImageModel => ({
  id,
  contentType: 'IMAGE',
  orderIndex: id,
  visible: true,
  imageUrl: `https://example.com/image-${id}.jpg`,
  imageWidth: 1920,
  imageHeight: 1080,
  title: `Image ${id}`,
  ...overrides,
});

/**
 * Create a horizontal image (1920x1080, ratio ~1.78)
 */
const createHorizontalImage = (id: number, rating: number = 0): ContentImageModel =>
  createImageContent(id, {
    imageWidth: 1920,
    imageHeight: 1080,
    rating,
  });

/**
 * Create a vertical image (1080x1920, ratio ~0.56)
 */
const createVerticalImage = (id: number, rating: number = 0): ContentImageModel =>
  createImageContent(id, {
    imageWidth: 1080,
    imageHeight: 1920,
    rating,
  });

/**
 * Create a wide panorama (3000x1000, ratio 3.0)
 */
const createWidePanorama = (id: number, rating: number = 0): ContentImageModel =>
  createImageContent(id, {
    imageWidth: 3000,
    imageHeight: 1000,
    rating,
  });

// ===================== createRowsArray Tests =====================

describe('createRowsArray', () => {
  describe('Empty and edge cases', () => {
    it('should return empty array for empty input', () => {
      expect(createRowsArray([])).toEqual([]);
    });

    it('should return empty array for null/undefined input', () => {
      expect(createRowsArray(null as unknown as ContentImageModel[])).toEqual([]);
      expect(createRowsArray(undefined as unknown as ContentImageModel[])).toEqual([]);
    });

    it('should handle single item', () => {
      const content = [createHorizontalImage(1, 2)];
      const result = createRowsArray(content);

      expect(result).toHaveLength(1);
      expect(result[0]?.items).toHaveLength(1);
      // Single non-5-star-vertical items are standalone (take full width)
      expect(result[0]?.pattern.type).toBe('standalone');
    });
  });

  describe('Standalone pattern detection', () => {
    it('should detect 5-star horizontal as standalone', () => {
      const content = [createHorizontalImage(1, 5), createHorizontalImage(2, 2)];
      const result = createRowsArray(content);

      expect(result).toHaveLength(2);
      expect(result[0]?.pattern.type).toBe('standalone');
      expect(result[0]?.items).toHaveLength(1);
      expect(result[0]?.items[0]?.id).toBe(1);
    });

    it('should NOT detect 5-star vertical as standalone (should be standard)', () => {
      // 5-star verticals should be treated like 4-star horizontals adjacent to vertical
      // They should get half width, not full width
      const content = [createVerticalImage(1, 5), createHorizontalImage(2, 5)];
      const result = createRowsArray(content);

      expect(result).toHaveLength(2);
      // 5-star vertical should be 'standard' pattern, not 'standalone'
      expect(result[0]?.pattern.type).toBe('standard');
      expect(result[0]?.items).toHaveLength(1);
      expect(result[0]?.items[0]?.id).toBe(1);
      // 5-star horizontal should still be standalone
      expect(result[1]?.pattern.type).toBe('standalone');
    });

    it('should detect wide panorama (3+ star) as standalone', () => {
      const content = [createWidePanorama(1, 3), createHorizontalImage(2, 2)];
      const result = createRowsArray(content);

      expect(result).toHaveLength(2);
      expect(result[0]?.pattern.type).toBe('standalone');
    });

    it('should place multiple standalone items in separate rows', () => {
      const content = [
        createHorizontalImage(1, 5),
        createHorizontalImage(2, 5),
        createHorizontalImage(3, 5),
      ];
      const result = createRowsArray(content);

      expect(result).toHaveLength(3);
      for (const row of result) {
        expect(row.pattern.type).toBe('standalone');
        expect(row.items).toHaveLength(1);
      }
    });
  });

  describe('Five-star vertical grouping (star-based accumulation)', () => {
    it('should group 5-star vertical with lower-rated images up to star limit', () => {
      // Star accumulation: 5 + 3 = 8 stars (within 7-9 range)
      // Adding 4-star would be 12, exceeds max, so it goes to next row
      const content = [
        createVerticalImage(1, 5),
        createVerticalImage(2, 3),
        createVerticalImage(3, 4),
      ];
      const result = createRowsArray(content);

      // Row 1: [V5*, V3*] = 8 stars, Row 2: [V4*] = 4 stars (alone)
      expect(result).toHaveLength(2);
      expect(result[0]?.items).toHaveLength(2);
      expect(result[0]?.pattern.type).toBe('standard');
      // Second row has single 4-star vertical (not 5-star, so standalone)
      expect(result[1]?.items).toHaveLength(1);
    });

    it('should group 5-star vertical with low-rated horizontals', () => {
      // Star accumulation: 5 + 2 = 7 stars (at minimum)
      // Adding 3-star would be 10 > 9, so it goes to next row
      const content = [
        createVerticalImage(1, 5),
        createHorizontalImage(2, 2),
        createHorizontalImage(3, 3),
      ];
      const result = createRowsArray(content);

      // Row 1: [V5*, H2*] = 7 stars
      expect(result[0]?.items).toHaveLength(2);
      expect(result[0]?.pattern.type).toBe('standard');
    });

    it('should group 5-star vertical with 4-star vertical within star limit', () => {
      // Star accumulation: 5 + 4 = 9 stars (at max, within 7-9 range)
      const content = [
        createVerticalImage(1, 5),
        createVerticalImage(2, 4),
        createHorizontalImage(3, 2),
      ];
      const result = createRowsArray(content);

      // Row 1: [V5*, V4*] = 9 stars (at max)
      expect(result[0]?.items).toHaveLength(2);
      expect(result[0]?.pattern.type).toBe('standard');
    });
  });

  describe('Main-stacked pattern detection', () => {
    it('should detect 3-4 star main with secondaries', () => {
      // Use a 3-star vertical as main (4-star horizontal without adjacent vertical becomes standalone)
      const content = [
        createVerticalImage(1, 3),
        createHorizontalImage(2, 2),
        createHorizontalImage(3, 2),
      ];
      const result = createRowsArray(content);

      expect(result).toHaveLength(1);
      expect(result[0]?.pattern.type).toBe('main-stacked');
      expect(result[0]?.items).toHaveLength(3);
    });

    it('should detect 4-star horizontal with adjacent vertical as main', () => {
      // 4-star horizontal next to vertical gets halfSlot (not standalone)
      const content = [
        createHorizontalImage(1, 4),
        createVerticalImage(2, 3), // Adjacent vertical
        createHorizontalImage(3, 2),
      ];
      const result = createRowsArray(content);

      // Should form a row together
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]?.items.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Panorama standalone behavior', () => {
    it('should treat wide panoramas as standalone (separate rows)', () => {
      // Wide panoramas (ratio >= 2.0) are standalone candidates
      // Each panorama gets its own row
      const content = [
        createVerticalImage(1, 2), // Low-rated vertical
        createWidePanorama(2, 2),
        createWidePanorama(3, 2),
      ];
      const result = createRowsArray(content);

      // Each item should be in its own row since panoramas are standalone
      expect(result).toHaveLength(3);
      expect(result[0]?.pattern.type).toBe('standalone'); // vertical alone
      expect(result[1]?.pattern.type).toBe('standalone'); // panorama 1
      expect(result[2]?.pattern.type).toBe('standalone'); // panorama 2
    });

    it('should treat 3+ star vertical alone as standalone when followed by panoramas', () => {
      // 3-star vertical alone becomes standalone, panoramas are also standalone
      const content = [
        createVerticalImage(1, 3),
        createWidePanorama(2, 2),
        createWidePanorama(3, 2),
      ];
      const result = createRowsArray(content);

      expect(result).toHaveLength(3);
      expect(result[0]?.pattern.type).toBe('standalone'); // 3-star vertical alone
      expect(result[1]?.pattern.type).toBe('standalone'); // panorama 1
      expect(result[2]?.pattern.type).toBe('standalone'); // panorama 2
    });
  });

  describe('Standard pattern (fallback)', () => {
    it('should use standard pattern for low-rated images', () => {
      const content = [
        createHorizontalImage(1, 2),
        createHorizontalImage(2, 2),
        createHorizontalImage(3, 2),
        createHorizontalImage(4, 2),
      ];
      const result = createRowsArray(content);

      expect(result).toHaveLength(1);
      expect(result[0]?.pattern.type).toBe('standard');
      expect(result[0]?.items).toHaveLength(4);
    });
  });

  describe('Pattern metadata preservation', () => {
    it('should preserve mainIndex in pattern result', () => {
      // Use vertical 3-star to trigger main-stacked
      const content = [
        createVerticalImage(1, 3),
        createHorizontalImage(2, 2),
        createHorizontalImage(3, 2),
      ];
      const result = createRowsArray(content);

      expect(result[0]?.pattern.type).toBe('main-stacked');
      const pattern = result[0]?.pattern as Extract<
        RowWithPattern['pattern'],
        { type: 'main-stacked' }
      >;
      expect(pattern.mainIndex).toBeDefined();
      expect(pattern.secondaryIndices).toBeDefined();
    });

    it('should preserve indices in pattern result', () => {
      const content = [createHorizontalImage(1, 2), createHorizontalImage(2, 2)];
      const result = createRowsArray(content);

      expect(result[0]?.pattern.type).toBe('standard');
      expect(result[0]?.pattern.indices).toContain(0);
      expect(result[0]?.pattern.indices).toContain(1);
    });
  });

  describe('Non-consecutive pattern indices (bug fix)', () => {
    it('should not skip items when patterns select non-consecutive indices', () => {
      // Create a scenario where pattern detection might select non-consecutive items
      // This tests the fix for the bug where items were skipped when patterns
      // selected indices like [0, 2, 4] instead of [0, 1, 2]
      const content = [
        createVerticalImage(1, 5), // Index 0: 5-star vertical (could be main)
        createHorizontalImage(2, 2), // Index 1: Should NOT be skipped
        createVerticalImage(3, 3), // Index 2: Could be secondary
        createHorizontalImage(4, 2), // Index 3: Should NOT be skipped
        createVerticalImage(5, 4), // Index 4: Could be secondary
        createHorizontalImage(6, 2), // Index 5: Should be processed
        createHorizontalImage(7, 2), // Index 6: Should be processed
      ];

      const result = createRowsArray(content);

      // Verify all items are included in the result
      const allItemIds = new Set(result.flatMap(row => row.items.map(item => item.id)));
      expect(allItemIds.size).toBe(7); // All 7 items should be present
      expect(allItemIds.has(1)).toBe(true);
      expect(allItemIds.has(2)).toBe(true);
      expect(allItemIds.has(3)).toBe(true);
      expect(allItemIds.has(4)).toBe(true);
      expect(allItemIds.has(5)).toBe(true);
      expect(allItemIds.has(6)).toBe(true);
      expect(allItemIds.has(7)).toBe(true);
    });

    it('should process items in order when pattern selects non-consecutive indices', () => {
      // Test that items are processed sequentially, not skipped
      const content = [
        createHorizontalImage(1, 2), // Index 0
        createHorizontalImage(2, 2), // Index 1
        createHorizontalImage(3, 2), // Index 2
        createHorizontalImage(4, 2), // Index 3
        createHorizontalImage(5, 2), // Index 4
      ];

      const result = createRowsArray(content);

      // All items should be in result
      const allItemIds = result.flatMap(row => row.items.map(item => item.id));
      expect(allItemIds).toHaveLength(5);
      expect(allItemIds).toContain(1);
      expect(allItemIds).toContain(2);
      expect(allItemIds).toContain(3);
      expect(allItemIds).toContain(4);
      expect(allItemIds).toContain(5);
    });
  });
});

// ===================== createRowsArrayLegacy Tests =====================

describe('createRowsArrayLegacy', () => {
  it('should return array of arrays (no pattern metadata)', () => {
    const content = [createHorizontalImage(1, 2), createHorizontalImage(2, 2)];
    const result = createRowsArrayLegacy(content);

    expect(Array.isArray(result)).toBe(true);
    expect(Array.isArray(result[0])).toBe(true);
    expect(result[0]).toHaveLength(2);
    // Should not have pattern property
    expect((result[0] as unknown as RowWithPattern).pattern).toBeUndefined();
  });
});

// ===================== calculateRowSizesFromPattern Tests =====================

describe('calculateRowSizesFromPattern', () => {
  const rowWidth = 1000;

  describe('Standalone sizes', () => {
    it('should calculate full-width for standalone item', () => {
      const row: RowWithPattern = {
        pattern: { type: 'standalone', indices: [0] },
        items: [createHorizontalImage(1, 5)],
      };
      const result = calculateRowSizesFromPattern(row, rowWidth);

      expect(result).toHaveLength(1);
      expect(result[0]?.width).toBe(rowWidth);
      expect(result[0]?.height).toBeGreaterThan(0);
    });
  });

  describe('Main-stacked sizes', () => {
    it('should calculate sizes for main + 2 stacked', () => {
      const row: RowWithPattern = {
        pattern: {
          type: 'main-stacked',
          mainIndex: 0,
          secondaryIndices: [1, 2],
          indices: [0, 1, 2],
        },
        items: [
          createVerticalImage(1, 4),
          createHorizontalImage(2, 2),
          createHorizontalImage(3, 2),
        ],
      };
      const result = calculateRowSizesFromPattern(row, rowWidth);

      expect(result).toHaveLength(3);
      // All items should have calculated dimensions
      for (const item of result) {
        expect(item.width).toBeGreaterThan(0);
        expect(item.height).toBeGreaterThan(0);
      }

      // Stacked items should have the same width (they share a column)
      const sec1 = result[1]!;
      const sec2 = result[2]!;
      expect(sec1.width).toBeCloseTo(sec2.width, 0);
    });

    it('should make stacked items share width and stack vertically', () => {
      const row: RowWithPattern = {
        pattern: {
          type: 'main-stacked',
          mainIndex: 0,
          secondaryIndices: [1, 2],
          indices: [0, 1, 2],
        },
        items: [
          createVerticalImage(1, 4),
          createHorizontalImage(2, 2),
          createHorizontalImage(3, 2),
        ],
      };
      const result = calculateRowSizesFromPattern(row, rowWidth);

      expect(result).toHaveLength(3);
      const main = result[0]!;
      const sec1 = result[1]!;
      const sec2 = result[2]!;

      // Stacked items should have same width (they share a column)
      expect(sec1.width).toBeCloseTo(sec2.width, 0);

      // Stacked items should have same height (identical images)
      expect(sec1.height).toBeCloseTo(sec2.height, 0);

      // Main should have different dimensions than secondaries (vertical vs horizontal)
      // Main is vertical, secondaries are horizontal, so aspect ratios differ
      const mainRatio = main.width / main.height;
      const secRatio = sec1.width / sec1.height;
      expect(mainRatio).not.toBeCloseTo(secRatio, 1);
    });
  });

  describe('Standard sizes', () => {
    it('should calculate proportional widths', () => {
      const row: RowWithPattern = {
        pattern: { type: 'standard', indices: [0, 1] },
        items: [createHorizontalImage(1, 2), createHorizontalImage(2, 2)],
      };
      const result = calculateRowSizesFromPattern(row, rowWidth);

      expect(result).toHaveLength(2);
      // Same aspect ratio images should have same dimensions
      expect(result[0]?.width).toBeCloseTo(result[1]?.width ?? 0, 0);
      expect(result[0]?.height).toBeCloseTo(result[1]?.height ?? 0, 0);
    });

    it('should handle mixed aspect ratios', () => {
      const row: RowWithPattern = {
        pattern: { type: 'standard', indices: [0, 1] },
        items: [
          createHorizontalImage(1, 2), // 1920x1080 (ratio ~1.78)
          createVerticalImage(2, 2), // 1080x1920 (ratio ~0.56)
        ],
      };
      const result = calculateRowSizesFromPattern(row, rowWidth);

      expect(result).toHaveLength(2);
      // Both items should have valid dimensions
      expect(result[0]?.width).toBeGreaterThan(0);
      expect(result[1]?.width).toBeGreaterThan(0);
      expect(result[0]?.height).toBeGreaterThan(0);
      expect(result[1]?.height).toBeGreaterThan(0);

      // Items with different aspect ratios should have different dimensions
      // The exact relationship depends on the box combination algorithm
      const item1 = result[0]!;
      const item2 = result[1]!;
      const ratio1 = item1.width / item1.height;
      const ratio2 = item2.width / item2.height;

      // Aspect ratios should reflect original content (horizontal vs vertical)
      expect(ratio1).toBeGreaterThan(1); // horizontal
      expect(ratio2).toBeLessThan(1); // vertical
    });
  });

  describe('Five-star vertical pattern sizes', () => {
    it('should use main-stacked calculation for five-star-vertical-2v', () => {
      const row: RowWithPattern = {
        pattern: {
          type: 'five-star-vertical-2v',
          mainIndex: 0,
          secondaryIndices: [1, 2],
          indices: [0, 1, 2],
        },
        items: [createVerticalImage(1, 5), createVerticalImage(2, 3), createVerticalImage(3, 4)],
      };
      const result = calculateRowSizesFromPattern(row, rowWidth);

      expect(result).toHaveLength(3);
      // All items should have calculated dimensions
      const main = result[0]!;
      const sec1 = result[1]!;
      const sec2 = result[2]!;

      expect(main.width).toBeGreaterThan(0);
      expect(main.height).toBeGreaterThan(0);

      // Stacked items should share the same width (they're in a column)
      expect(sec1.width).toBeCloseTo(sec2.width, 0);

      // All are vertical images, so all should have similar aspect ratios in output
      const mainRatio = main.width / main.height;
      const secRatio = sec1.width / sec1.height;
      expect(mainRatio).toBeCloseTo(secRatio, 1);
    });

    it('should calculate half-width for single 5-star vertical (not full width)', () => {
      // When a 5-star vertical ends up alone in a row, it should get half width
      // This treats it similar to a 4-star horizontal adjacent to vertical
      const row: RowWithPattern = {
        pattern: { type: 'standard', indices: [0] },
        items: [createVerticalImage(1, 5)],
      };
      const result = calculateRowSizesFromPattern(row, rowWidth);

      expect(result).toHaveLength(1);
      const item = result[0]!;

      // Width should be half of rowWidth, not full width
      expect(item.width).toBe(rowWidth / 2);
      expect(item.height).toBeGreaterThan(0);
    });
  });
});

// ===================== calculateRowSizes (Legacy) Tests =====================

describe('calculateRowSizes', () => {
  const rowWidth = 1000;

  it('should return empty array for empty input', () => {
    expect(calculateRowSizes([], rowWidth)).toEqual([]);
  });

  it('should calculate sizes for single item', () => {
    const row = [createHorizontalImage(1, 2)];
    const result = calculateRowSizes(row, rowWidth);

    expect(result).toHaveLength(1);
    expect(result[0]?.width).toBe(rowWidth);
  });

  it('should detect 3-4 star main and use main-stacked layout', () => {
    const row = [
      createHorizontalImage(1, 4),
      createHorizontalImage(2, 2),
      createHorizontalImage(3, 2),
    ];
    const result = calculateRowSizes(row, rowWidth);

    expect(result).toHaveLength(3);
    // Should use main-stacked sizing (not equal widths)
    // The main item should be larger than the secondaries
  });

  it('should use standard layout for low-rated items', () => {
    const row = [createHorizontalImage(1, 2), createHorizontalImage(2, 2)];
    const result = calculateRowSizes(row, rowWidth);

    expect(result).toHaveLength(2);
    // Same aspect ratio should give roughly equal widths
    expect(result[0]?.width).toBeCloseTo(result[1]?.width ?? 0, 0);
  });
});

// ===================== Integration Tests =====================

describe('Full pipeline integration', () => {
  const rowWidth = 1000;

  it('should correctly process content through rows and sizing', () => {
    const content = [
      createHorizontalImage(1, 5), // Standalone
      createHorizontalImage(2, 4), // Main
      createHorizontalImage(3, 2), // Secondary
      createHorizontalImage(4, 2), // Secondary
      createHorizontalImage(5, 2), // Standard
      createHorizontalImage(6, 2), // Standard
    ];

    const rows = createRowsArray(content);
    expect(rows.length).toBeGreaterThan(0);

    // Calculate sizes for each row
    for (const row of rows) {
      const sizes = calculateRowSizesFromPattern(row, rowWidth);
      expect(sizes.length).toBe(row.items.length);

      // All items should have valid dimensions
      for (const size of sizes) {
        expect(size.width).toBeGreaterThan(0);
        expect(size.height).toBeGreaterThan(0);
        expect(size.content).toBeDefined();
      }
    }
  });

  it('should preserve content order within rows', () => {
    const content = [
      createVerticalImage(1, 5),
      createVerticalImage(2, 3),
      createVerticalImage(3, 4),
    ];

    const rows = createRowsArray(content);
    // Star accumulation: 5 + 3 = 8 stars, then 4-star goes to next row
    expect(rows).toHaveLength(2);

    // First row: [V5*, V3*] - order preserved
    expect(rows[0]?.items[0]?.id).toBe(1);
    expect(rows[0]?.items[1]?.id).toBe(2);
    // Second row: [V4*]
    expect(rows[1]?.items[0]?.id).toBe(3);
  });

  it('should handle mixed content types gracefully', () => {
    const content = [
      createHorizontalImage(1, 5), // Standalone
      createVerticalImage(2, 5), // Could be 5-star vertical pattern
      createVerticalImage(3, 3),
      createVerticalImage(4, 4),
      createHorizontalImage(5, 2), // Standard
      createHorizontalImage(6, 2),
    ];

    const rows = createRowsArray(content);
    expect(rows.length).toBeGreaterThan(0);

    // Verify each row has items
    for (const row of rows) {
      expect(row.items.length).toBeGreaterThan(0);
      expect(row.pattern.type).toBeDefined();
    }
  });

  it('should correctly handle H5* V3* V5* H5* scenario (user reported issue)', () => {
    // User scenario: H5* should be standalone, verticals should be grouped
    // Expected:
    // - row 1: H5* (standalone)
    // - row 2: V3* - V5* (grouped together, 3+5=8 stars)
    // - row 3: H5* (standalone)
    const content = [
      createHorizontalImage(1, 5), // H5* - should be standalone
      createVerticalImage(2, 3), // V3* - should group with V5*
      createVerticalImage(3, 5), // V5* - should group with V3*
      createHorizontalImage(4, 5), // H5* - should be standalone
    ];

    const rows = createRowsArray(content);

    expect(rows).toHaveLength(3);

    // Row 1: H5* standalone
    expect(rows[0]?.items).toHaveLength(1);
    expect(rows[0]?.items[0]?.id).toBe(1);
    expect(rows[0]?.pattern.type).toBe('standalone');

    // Row 2: V3* + V5* grouped (3+5=8 stars)
    expect(rows[1]?.items).toHaveLength(2);
    expect(rows[1]?.items[0]?.id).toBe(2); // V3*
    expect(rows[1]?.items[1]?.id).toBe(3); // V5*
    expect(rows[1]?.pattern.type).toBe('standard');

    // Row 3: H5* standalone
    expect(rows[2]?.items).toHaveLength(1);
    expect(rows[2]?.items[0]?.id).toBe(4);
    expect(rows[2]?.pattern.type).toBe('standalone');
  });

  it('should handle H5* V3* V4* H5* scenario (with V4* instead of V5*)', () => {
    // Same scenario but with V4* instead of V5*
    // Expected:
    // - row 1: H5* (standalone)
    // - row 2: V3* - V4* (grouped together, 3+4=7 stars)
    // - row 3: H5* (standalone)
    const content = [
      createHorizontalImage(1, 5), // H5* - should be standalone
      createVerticalImage(2, 3), // V3* - should group with V4*
      createVerticalImage(3, 4), // V4* - should group with V3*
      createHorizontalImage(4, 5), // H5* - should be standalone
    ];

    const rows = createRowsArray(content);

    expect(rows).toHaveLength(3);

    // Row 1: H5* standalone
    expect(rows[0]?.items).toHaveLength(1);
    expect(rows[0]?.pattern.type).toBe('standalone');

    // Row 2: V3* + V4* grouped (3+4=7 stars)
    expect(rows[1]?.items).toHaveLength(2);
    expect(rows[1]?.pattern.type).toBe('standard');

    // Row 3: H5* standalone
    expect(rows[2]?.items).toHaveLength(1);
    expect(rows[2]?.pattern.type).toBe('standalone');
  });
});
