/**
 * Unit tests for rowOptimizer.ts
 * Tests rowScore, rebuildRow, optimizeBoundaries, reorderWithinRows, and optimizeRows
 */

import { LAYOUT } from '@/app/constants';
import type { BoxTree, RowResult, TemplateKey } from '@/app/utils/rowCombination';
import { buildRows } from '@/app/utils/rowCombination';
import {
  optimizeBoundaries,
  optimizeRows,
  rebuildRow,
  reorderWithinRows,
  rowScore,
} from '@/app/utils/rowOptimizer';
import { H, V } from '@/tests/fixtures/contentFixtures';

// ===================== Helpers =====================

const DESKTOP = LAYOUT.desktopSlotWidth; // 5

function rowIds(row: RowResult): number[] {
  return row.components.map(c => c.id);
}

function boxTreeLeafIds(tree: BoxTree): number[] {
  if (tree.type === 'leaf') {
    return [tree.content.id];
  }
  return [...boxTreeLeafIds(tree.children[0]), ...boxTreeLeafIds(tree.children[1])];
}

function totalItemCount(rows: RowResult[]): number {
  return rows.reduce((sum, row) => sum + row.components.length, 0);
}

function allIds(rows: RowResult[]): number[] {
  return rows.flatMap(row => row.components.map(c => c.id));
}

// ===================== rowScore =====================

describe('rowScore', () => {
  it('returns 1.0 for a perfect fill (H5★ hero)', () => {
    const items = [H(1, 5)];
    // H5★ cv = 5.0, fill = 5.0/5 = 1.0
    expect(rowScore(items, DESKTOP)).toBeCloseTo(1.0);
  });

  it('returns < 1.0 for underfill', () => {
    // Single H3★: cv = 5/(5-3+1) = 5/3 ≈ 1.667, fill ≈ 0.333
    const items = [H(1, 3)];
    const score = rowScore(items, DESKTOP);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1.0);
  });

  it('returns 0 for empty row', () => {
    expect(rowScore([], DESKTOP)).toBe(0);
  });

  it('is symmetric: same items produce same score regardless of order', () => {
    const a = [H(1, 4), H(2, 3)];
    const b = [H(2, 3), H(1, 4)];
    expect(rowScore(a, DESKTOP)).toBeCloseTo(rowScore(b, DESKTOP));
  });
});

// ===================== rebuildRow =====================

describe('rebuildRow', () => {
  it('produces a valid RowResult for a single item', () => {
    const components = [H(1, 5)];
    const row = rebuildRow(components, DESKTOP);

    expect(row.components).toBe(components);
    expect(row.templateKey).toEqual<TemplateKey>({ h: 1, v: 0 });
    expect(row.boxTree.type).toBe('leaf');
    expect(row.direction).toBeNull();
  });

  it('produces a valid RowResult for two horizontal items', () => {
    const components = [H(1, 4), H(2, 3)];
    const row = rebuildRow(components, DESKTOP);

    expect(row.components).toBe(components);
    expect(row.templateKey).toEqual<TemplateKey>({ h: 2, v: 0 });
    expect(row.boxTree.type).toBe('combined');
    expect(boxTreeLeafIds(row.boxTree).sort()).toEqual([1, 2]);
  });

  it('boxTree leaf IDs match component IDs', () => {
    const components = [H(1, 3), V(2, 3), H(3, 3)];
    const row = rebuildRow(components, DESKTOP);
    expect(boxTreeLeafIds(row.boxTree).sort()).toEqual([1, 2, 3]);
  });
});

// ===================== optimizeBoundaries =====================

describe('optimizeBoundaries', () => {
  it('returns empty array for empty input', () => {
    expect(optimizeBoundaries([], DESKTOP)).toEqual([]);
  });

  it('returns single row unchanged', () => {
    const rows = buildRows([H(1, 5)], DESKTOP);
    const optimized = optimizeBoundaries(rows, DESKTOP);
    expect(optimized).toHaveLength(1);
    expect(rowIds(optimized[0]!)).toEqual([1]);
  });

  it('does not change two already-optimal rows', () => {
    // Two hero rows: each is a perfect 1.0 fill
    const rows = buildRows([H(1, 5), H(2, 5)], DESKTOP);
    const optimized = optimizeBoundaries(rows, DESKTOP);
    expect(optimized).toHaveLength(2);
    expect(rowIds(optimized[0]!)).toEqual([1]);
    expect(rowIds(optimized[1]!)).toEqual([2]);
  });

  it('preserves total item count', () => {
    const items = [H(1, 3), H(2, 3), H(3, 3), H(4, 3), H(5, 3), H(6, 3)];
    const rows = buildRows(items, DESKTOP);
    const optimized = optimizeBoundaries(rows, DESKTOP);
    expect(totalItemCount(optimized)).toBe(items.length);
  });

  it('preserves all item IDs (no items lost or duplicated)', () => {
    const items = [H(1, 3), H(2, 3), H(3, 3), V(4, 2), V(5, 2), H(6, 4)];
    const rows = buildRows(items, DESKTOP);
    const optimized = optimizeBoundaries(rows, DESKTOP);
    expect(allIds(optimized).sort()).toEqual(items.map(i => i.id).sort());
  });

  it('never produces rows with more than 5 items', () => {
    const items = Array.from({ length: 15 }, (_, i) => H(i + 1, 3));
    const rows = buildRows(items, DESKTOP);
    const optimized = optimizeBoundaries(rows, DESKTOP);
    for (const row of optimized) {
      expect(row.components.length).toBeLessThanOrEqual(5);
    }
  });

  it('never produces empty rows', () => {
    const items = [H(1, 3), H(2, 3), H(3, 3), H(4, 3), H(5, 3), H(6, 3)];
    const rows = buildRows(items, DESKTOP);
    const optimized = optimizeBoundaries(rows, DESKTOP);
    for (const row of optimized) {
      expect(row.components.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('improves or maintains pair score (never makes it worse)', () => {
    const items = [H(1, 4), H(2, 3), H(3, 3), V(4, 2), H(5, 4), H(6, 3)];
    const rows = buildRows(items, DESKTOP);
    const optimized = optimizeBoundaries(rows, DESKTOP);

    const originalTotal = rows.reduce((sum, r) => sum + rowScore(r.components, DESKTOP), 0);
    const optimizedTotal = optimized.reduce((sum, r) => sum + rowScore(r.components, DESKTOP), 0);
    expect(optimizedTotal).toBeGreaterThanOrEqual(originalTotal);
  });
});

// ===================== reorderWithinRows =====================

describe('reorderWithinRows', () => {
  it('swaps 2-item row so higher-rated is on left', () => {
    // Build a row with lower-rated first, higher-rated second
    const components = [H(1, 3), H(2, 4)];
    const row = rebuildRow(components, DESKTOP);
    const result = reorderWithinRows([row], DESKTOP);

    // H2 (rating 4) should now be first
    expect(result[0]!.components[0]!.id).toBe(2);
    expect(result[0]!.components[1]!.id).toBe(1);
  });

  it('does not swap when already in correct order', () => {
    const components = [H(1, 4), H(2, 3)];
    const row = rebuildRow(components, DESKTOP);
    const result = reorderWithinRows([row], DESKTOP);

    expect(result[0]!.components[0]!.id).toBe(1);
    expect(result[0]!.components[1]!.id).toBe(2);
  });

  it('does not swap when ratings are equal', () => {
    const components = [H(1, 3), H(2, 3)];
    const row = rebuildRow(components, DESKTOP);
    const result = reorderWithinRows([row], DESKTOP);

    // Order preserved
    expect(result[0]!.components[0]!.id).toBe(1);
    expect(result[0]!.components[1]!.id).toBe(2);
  });

  it('does not touch single-item rows', () => {
    const row = rebuildRow([H(1, 5)], DESKTOP);
    const result = reorderWithinRows([row], DESKTOP);
    expect(result[0]!.components[0]!.id).toBe(1);
  });

  it('does not touch 3+ item rows', () => {
    const components = [H(1, 2), H(2, 4), H(3, 3)];
    const row = rebuildRow(components, DESKTOP);
    const result = reorderWithinRows([row], DESKTOP);

    // Order unchanged
    expect(rowIds(result[0]!)).toEqual([1, 2, 3]);
  });

  it('uses effectiveRating (applies vertical penalty)', () => {
    // V4★ has effectiveRating 3, H3★ has effectiveRating 3 → no swap (equal)
    const components = [V(1, 4), H(2, 3)];
    const row = rebuildRow(components, DESKTOP);
    const result = reorderWithinRows([row], DESKTOP);
    expect(result[0]!.components[0]!.id).toBe(1);
  });
});

// ===================== optimizeRows (integration) =====================

describe('optimizeRows', () => {
  it('returns empty array for empty input', () => {
    expect(optimizeRows([], DESKTOP)).toEqual([]);
  });

  it('handles single row', () => {
    const rows = buildRows([H(1, 5)], DESKTOP);
    const result = optimizeRows(rows, DESKTOP);
    expect(result).toHaveLength(1);
    expect(rowIds(result[0]!)).toEqual([1]);
  });

  it('preserves all items through full pipeline', () => {
    const items = [H(1, 4), V(2, 3), H(3, 3), H(4, 4), V(5, 2), H(6, 3), H(7, 3)];
    const rows = buildRows(items, DESKTOP);
    const result = optimizeRows(rows, DESKTOP);
    expect(allIds(result).sort()).toEqual(items.map(i => i.id).sort());
  });

  it('all output rows have valid boxTrees', () => {
    const items = [H(1, 4), H(2, 3), V(3, 3), H(4, 4), H(5, 3)];
    const rows = buildRows(items, DESKTOP);
    const result = optimizeRows(rows, DESKTOP);

    for (const row of result) {
      expect(row.boxTree).toBeDefined();
      expect(boxTreeLeafIds(row.boxTree).sort()).toEqual(rowIds(row).sort());
    }
  });

  it('all output rows have valid templateKeys', () => {
    const items = [H(1, 4), H(2, 3), V(3, 3), H(4, 4), H(5, 3)];
    const rows = buildRows(items, DESKTOP);
    const result = optimizeRows(rows, DESKTOP);

    for (const row of result) {
      expect(row.templateKey).toBeDefined();
      expect(typeof row.templateKey.h).toBe('number');
      expect(typeof row.templateKey.v).toBe('number');
      expect(row.templateKey.h + row.templateKey.v).toBe(row.components.length);
    }
  });
});
