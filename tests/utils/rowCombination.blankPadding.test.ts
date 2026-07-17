/**
 * Unit tests for blank-spacer row-width normalization.
 * Covers the BLANK content type, its guard, and padRowToWidth's math,
 * threshold, solo-hero skip, and id determinism.
 */

import { LAYOUT } from '@/app/constants';
import type { ContentBlankModel } from '@/app/types/Content';
import { getWidthCost } from '@/app/utils/contentRatingUtils';
import { isBlankContent } from '@/app/utils/contentTypeGuards';
import type { BoxTree } from '@/app/utils/rowCombination';
import { BLANK_ID_BASE, buildRows, MIN_FILL_RATIO } from '@/app/utils/rowCombination';
import { calculateSizesFromBoxTree } from '@/app/utils/rowStructureAlgorithm';
import {
  createHorizontalImage,
  createPanorama,
  createVerticalImage,
} from '@/tests/fixtures/contentFixtures';

const DESKTOP = LAYOUT.desktopSlotWidth; // 8

/** Collect every blank leaf in a BoxTree, in traversal order. */
function collectBlanks(tree: BoxTree): ContentBlankModel[] {
  if (tree.type === 'leaf') {
    return isBlankContent(tree.content) ? [tree.content] : [];
  }
  return [...collectBlanks(tree.children[0]), ...collectBlanks(tree.children[1])];
}

describe('isBlankContent', () => {
  it('returns true for a BLANK block', () => {
    const blank: ContentBlankModel = {
      id: BLANK_ID_BASE,
      contentType: 'BLANK',
      orderIndex: 0,
      visible: true,
      width: 8.8889,
      height: 1,
    };
    expect(isBlankContent(blank)).toBe(true);
  });

  it('returns false for a real image', () => {
    expect(isBlankContent(createHorizontalImage(1, 3))).toBe(false);
  });
});

describe('buildRows blank padding', () => {
  it('pads an under-filled single-item row with one blank right sibling', () => {
    const rows = buildRows([createHorizontalImage(1, 0)], DESKTOP);

    expect(rows).toHaveLength(1);
    const tree = rows[0]!.boxTree;
    expect(tree.type).toBe('combined');
    if (tree.type !== 'combined') throw new Error('expected combined');
    expect(tree.direction).toBe('horizontal');
    expect(tree.children[0].type).toBe('leaf');

    const right = tree.children[1];
    expect(right.type).toBe('leaf');
    if (right.type !== 'leaf') throw new Error('expected leaf');
    expect(isBlankContent(right.content)).toBe(true);
  });

  it('keeps row.components real-only — the blank lives in boxTree alone', () => {
    const rows = buildRows([createHorizontalImage(1, 0)], DESKTOP);

    expect(rows[0]!.components).toHaveLength(1);
    expect(rows[0]!.components[0]!.id).toBe(1);
  });

  it('renders the real item at its natural proportional share S/rowWidth', () => {
    const item = createHorizontalImage(1, 0);
    const rows = buildRows([item], DESKTOP);

    // gap=0 isolates the padding math from CSS gap subtraction
    const sizes = calculateSizesFromBoxTree(rows[0]!.boxTree, 1000, 0, DESKTOP);
    const realWidth = sizes.find(s => s.content.id === 1)!.width;

    const expectedShare = getWidthCost(item) / DESKTOP; // 1.3333 / 8 = 0.1667
    expect(realWidth / 1000).toBeCloseTo(expectedShare, 5);
    expect(expectedShare).toBeCloseTo(0.1667, 3);
  });

  it('keeps the row height equal to the real item height (blank never stacks below)', () => {
    const item = createHorizontalImage(1, 0);
    const rows = buildRows([item], DESKTOP);

    const sizes = calculateSizesFromBoxTree(rows[0]!.boxTree, 1000, 0, DESKTOP);
    const real = sizes.find(s => s.content.id === 1)!;
    const blank = sizes.find(s => isBlankContent(s.content))!;

    // Horizontal siblings render at equal heights — the blank takes the
    // image's height rather than adding empty space below it.
    expect(blank.height).toBeCloseTo(real.height, 5);
    // And the image keeps its natural AR — never cropped or distorted.
    expect(real.width / real.height).toBeCloseTo(1920 / 1080, 5);
  });

  it('gives the blank an aspect ratio of r * gap / S', () => {
    const item = createHorizontalImage(1, 0);
    const rows = buildRows([item], DESKTOP);

    const tree = rows[0]!.boxTree;
    if (tree.type !== 'combined') throw new Error('expected combined');
    const right = tree.children[1];
    if (right.type !== 'leaf') throw new Error('expected leaf');
    const blank = right.content as ContentBlankModel;

    const r = 1920 / 1080;
    const S = getWidthCost(item);
    const expectedBlankAR = (r * (DESKTOP - S)) / S; // 8.8889
    expect(blank.width / blank.height).toBeCloseTo(expectedBlankAR, 4);
  });

  it('does not pad a complete row', () => {
    // Four 3-star horizontals: Hv 2.1082 each, total 8.43, fill 1.054 — complete
    const items = [1, 2, 3, 4].map(id => createHorizontalImage(id, 3));
    const rows = buildRows(items, DESKTOP);

    const totalHv = items.reduce((sum, i) => sum + getWidthCost(i), 0);
    expect(totalHv / DESKTOP).toBeGreaterThanOrEqual(MIN_FILL_RATIO);

    const blanks = collectBlanks(rows[0]!.boxTree);
    expect(blanks).toHaveLength(0);
  });

  it('does not pad a solo-hero row (extreme-AR panorama keeps full width)', () => {
    const rows = buildRows([createPanorama(1, 5)], DESKTOP);

    // Hv 5.4772 / 8 = 0.685 — under-filled, but solo-hero must stay full-width
    expect(getWidthCost(createPanorama(1, 5)) / DESKTOP).toBeLessThan(MIN_FILL_RATIO);
    expect(rows[0]!.boxTree.type).toBe('leaf');
  });

  it('assigns deterministic, unique, stable blank ids across rows', () => {
    // Greedy fill normally strands only the LAST row, so to get two padded rows
    // we need MAX_ROW_IMAGES to close rows early: 24 0-star verticals (Hv 0.75)
    // at a high-density rowWidth 16 pack 12 per row — S 9.0, fill 0.563 — so
    // both rows close at the item cap while still under-filled.
    const items = Array.from({ length: 24 }, (_, i) => createVerticalImage(i + 1, 0));
    const first = buildRows(items, 16).flatMap(r => collectBlanks(r.boxTree));
    const second = buildRows(items, 16).flatMap(r => collectBlanks(r.boxTree));

    // Guard the assertions below are meaningful — uniqueness is vacuous at n<2
    expect(first.length).toBeGreaterThanOrEqual(2);

    const ids = first.map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toBeLessThanOrEqual(BLANK_ID_BASE);
    // Same input → same ids → stable React keys across renders
    expect(second.map(b => b.id)).toEqual(ids);
  });

  it('pads a multi-item under-filled row without touching its internal composition', () => {
    // Two 0-star horizontals: total Hv 2.667, fill 0.333 — under-filled
    const items = [createHorizontalImage(1, 0), createHorizontalImage(2, 0)];
    const rows = buildRows(items, DESKTOP);

    const blanks = collectBlanks(rows[0]!.boxTree);
    expect(blanks).toHaveLength(1);

    const sizes = calculateSizesFromBoxTree(rows[0]!.boxTree, 1000, 0, DESKTOP);
    const realTotal = sizes
      .filter(s => !isBlankContent(s.content))
      .reduce((sum, s) => sum + s.width, 0);
    const expectedShare = items.reduce((sum, i) => sum + getWidthCost(i), 0) / DESKTOP;
    expect(realTotal / 1000).toBeCloseTo(expectedShare, 5);
  });
});
