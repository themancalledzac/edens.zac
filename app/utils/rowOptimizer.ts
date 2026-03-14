/**
 * Row Optimizer — Phase 2 post-pass on buildRows() output.
 *
 * Adjusts row boundaries and within-row item order to maximize fill quality,
 * without replacing the greedy algorithm in buildRows().
 */

import type { AnyContentModel } from '@/app/types/Content';
import { getItemComponentValue } from '@/app/utils/contentRatingUtils';
import type { RowResult } from '@/app/utils/rowCombination';
import {
  acToBoxTree,
  deriveDirection,
  lookupComposition,
  toImageType,
} from '@/app/utils/rowCombination';

const MAX_ROW_ITEMS = 5;
const MIN_ROW_ITEMS = 1;

/**
 * Fill-quality metric for a row.
 * 1.0 = perfect fill, lower = worse.
 */
export function rowScore(components: AnyContentModel[], rowWidth: number): number {
  if (components.length === 0) return 0;
  const totalCV = components.reduce((sum, item) => sum + getItemComponentValue(item, rowWidth), 0);
  const fillRatio = totalCV / rowWidth;
  return Math.max(0, 1 - Math.abs(1.0 - fillRatio));
}

/**
 * Reconstruct a RowResult from a set of components.
 * Reuses the existing template map pipeline.
 */
export function rebuildRow(components: AnyContentModel[], rowWidth: number): RowResult {
  const images = components.map(item => toImageType(item, rowWidth));
  const { composition, templateKey, label } = lookupComposition(images);
  const boxTree = acToBoxTree(composition);
  const direction = deriveDirection(composition);

  return { components, direction, templateKey, label, boxTree };
}

/**
 * Single forward pass over adjacent row pairs.
 * Tries moving one item across the boundary (+/-1) and accepts if it improves pair score.
 */
export function optimizeBoundaries(rows: RowResult[], rowWidth: number): RowResult[] {
  if (rows.length < 2) return rows;

  const result = [...rows];

  for (let i = 0; i < result.length - 1; i++) {
    const rowA = result[i]!;
    const rowB = result[i + 1]!;

    const currentScore = rowScore(rowA.components, rowWidth) + rowScore(rowB.components, rowWidth);

    let bestScore = currentScore;
    let bestA: AnyContentModel[] = rowA.components;
    let bestB: AnyContentModel[] = rowB.components;

    // Candidate 1: move last item of A → start of B
    if (rowA.components.length > MIN_ROW_ITEMS && rowB.components.length < MAX_ROW_ITEMS) {
      const candA = rowA.components.slice(0, -1);
      const candB = [rowA.components[rowA.components.length - 1]!, ...rowB.components];
      const candScore = rowScore(candA, rowWidth) + rowScore(candB, rowWidth);
      if (candScore > bestScore) {
        bestScore = candScore;
        bestA = candA;
        bestB = candB;
      }
    }

    // Candidate 2: move first item of B → end of A
    if (rowB.components.length > MIN_ROW_ITEMS && rowA.components.length < MAX_ROW_ITEMS) {
      const candA = [...rowA.components, rowB.components[0]!];
      const candB = rowB.components.slice(1);
      const candScore = rowScore(candA, rowWidth) + rowScore(candB, rowWidth);
      if (candScore > bestScore) {
        bestScore = candScore;
        bestA = candA;
        bestB = candB;
      }
    }

    // Accept if improved
    if (bestScore > currentScore) {
      result[i] = rebuildRow(bestA, rowWidth);
      result[i + 1] = rebuildRow(bestB, rowWidth);
    }
  }

  return result;
}

/**
 * For 2-item rows, swap items so the higher-rated image is on the left.
 */
export function reorderWithinRows(rows: RowResult[], rowWidth: number): RowResult[] {
  return rows.map(row => {
    if (row.components.length !== 2) return row;

    const imgA = toImageType(row.components[0]!, rowWidth);
    const imgB = toImageType(row.components[1]!, rowWidth);

    if (imgB.effectiveRating > imgA.effectiveRating) {
      const swapped = [row.components[1]!, row.components[0]!];
      return rebuildRow(swapped, rowWidth);
    }

    return row;
  });
}

/**
 * Public API — optimize row boundaries and within-row order.
 * Drop-in wrapper around buildRows() output.
 */
export function optimizeRows(rows: RowResult[], rowWidth: number): RowResult[] {
  return reorderWithinRows(optimizeBoundaries(rows, rowWidth), rowWidth);
}
