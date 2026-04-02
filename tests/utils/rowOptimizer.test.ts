/**
 * Unit tests for rowOptimizer.ts
 * Tests rowScore, rebuildRow, optimizeBoundaries, reorderWithinRows, and optimizeRows
 */

import { LAYOUT } from '@/app/constants';
import type { BoxTree, RowResult, TemplateKey } from '@/app/utils/rowCombination';
import { buildRows } from '@/app/utils/rowCombination';
import { optimizeBoundaries, optimizeRows, rebuildRow, rowScore } from '@/app/utils/rowOptimizer';
import { H, V } from '@/tests/fixtures/contentFixtures';

// ===================== Helpers =====================

const DESKTOP = LAYOUT.desktopSlotWidth; // 8

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
  it('returns 0.625 for H5★ at rw=8 (no longer perfect fill)', () => {
    const items = [H(1, 5)];
    // H5★ cv = 5.0, fill = 5.0/8 = 0.625, score = 1-|1-0.625| = 0.625
    expect(rowScore(items, DESKTOP)).toBeCloseTo(0.625);
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

  it('does not change a single row with two H5★ (125% overfill accepted)', () => {
    // At rw=8: H5★+H5★ = 10.0/8 = 125%. Overfill accepted to avoid solo rows.
    const rows = buildRows([H(1, 5), H(2, 5)], DESKTOP);
    expect(rows).toHaveLength(1);
    const optimized = optimizeBoundaries(rows, DESKTOP);
    expect(optimized).toHaveLength(1);
    expect(rowIds(optimized[0]!)).toEqual([1, 2]);
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
