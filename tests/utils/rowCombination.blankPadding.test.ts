/**
 * Unit tests for blank-spacer row-width normalization.
 * Covers the BLANK content type, its guard, and padRowToWidth's math,
 * threshold, solo-hero skip, and id determinism.
 */

import { LAYOUT } from '@/app/constants';
import type { ContentBlankModel } from '@/app/types/Content';
import { getWidthCost } from '@/app/utils/contentRatingUtils';
import { isBlankContent } from '@/app/utils/contentTypeGuards';
import { BLANK_ID_BASE, buildRows, MIN_FILL_RATIO } from '@/app/utils/rowCombination';
import { calculateSizesFromBoxTree } from '@/app/utils/rowStructureAlgorithm';
import { collectBlanks } from '@/tests/fixtures/boxTreeHelpers';
import {
  createHorizontalImage,
  createPanorama,
  createVerticalImage,
} from '@/tests/fixtures/contentFixtures';

const DESKTOP = LAYOUT.desktopSlotWidth; // 8

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

  it('renders the real item at its gap-adjusted share at the production gap', () => {
    // The gap=0 test above pins the pure padding math; this pins what a user
    // actually sees. The wrapper is a horizontal node, so the renderer inserts
    // one gridGap between the real subtree and the blank, and the real share
    // becomes (W - gap) / W * S/Wr rather than the exact S/Wr identity.
    const item = createHorizontalImage(1, 0);
    const rows = buildRows([item], DESKTOP);

    const W = 1000;
    const sizes = calculateSizesFromBoxTree(rows[0]!.boxTree, W, LAYOUT.gridGap, DESKTOP);
    const realWidth = sizes.find(s => s.content.id === 1)!.width;

    const expectedShare = ((W - LAYOUT.gridGap) / W) * (getWidthCost(item) / DESKTOP);
    expect(realWidth / W).toBeCloseTo(expectedShare, 5);
    // Still nowhere near the full-width hero the unpadded engine produced.
    expect(realWidth / W).toBeLessThan(0.17);
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

  it('assigns a deterministic, bounded blank id to the stranded last row', () => {
    // Greedy fill strands only the LAST row, so a page pads at most one row.
    // Four 3-star horizontals fill row 0 (complete); a trailing 0-star horizontal
    // strands row 1 as a genuine leftover (had room for more) and gets the blank.
    const items = [
      ...[1, 2, 3, 4].map(id => createHorizontalImage(id, 3)),
      createHorizontalImage(5, 0),
    ];
    const first = buildRows(items, DESKTOP);
    const blanks = first.flatMap(r => collectBlanks(r.boxTree));

    // Exactly one blank, on the trailing leftover row — its id is keyed off that
    // row's index (BLANK_ID_BASE - rowIndex), so distinct rows never collide.
    expect(blanks).toHaveLength(1);
    expect(blanks[0]!.id).toBe(BLANK_ID_BASE - (first.length - 1));
    expect(blanks[0]!.id).toBeLessThanOrEqual(BLANK_ID_BASE);

    // Same input → same id → stable React keys across renders.
    const second = buildRows(items, DESKTOP).flatMap(r => collectBlanks(r.boxTree));
    expect(second.map(b => b.id)).toEqual(blanks.map(b => b.id));
  });

  it('pads a multi-item under-filled leftover without touching its internal composition', () => {
    // Two 0-star horizontals: total Hv 2.667, fill 0.333, room for more — a
    // genuine leftover (the only row is the last row).
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

  it('never pads single-image mobile rows — every tile fills the width', () => {
    // The reported regression: at the narrow mobile budget (rowWidth 2) each
    // tile is its own row. A second tile would overfill, so every row is
    // COMPLETE at one image and must fill the phone width — no blank spacer,
    // not even on the last tile (it is at capacity, not a leftover).
    const items = [1, 2, 3].map(id => createVerticalImage(id, 4));
    const rows = buildRows(items, 2);

    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.boxTree.type).toBe('leaf');
      expect(collectBlanks(row.boxTree)).toHaveLength(0);
    }
  });

  it('does not pad an under-filled non-last row — only the trailing leftover reserves space', () => {
    // At high density (rowWidth 16) the MAX_ROW_IMAGES cap closes row 0 early
    // while still under-filled. That row is complete-by-cap, not a leftover, so
    // it fills the width; only the final stranded row may pad.
    const items = Array.from({ length: 24 }, (_, i) => createVerticalImage(i + 1, 0));
    const rows = buildRows(items, 16);

    expect(rows.length).toBeGreaterThanOrEqual(2);
    const lastIdx = rows.length - 1;
    for (const [i, row] of rows.entries()) {
      if (i !== lastIdx) {
        expect(collectBlanks(row.boxTree)).toHaveLength(0);
      }
    }

    // The accepted trade-off, pinned: the trailing row in this same scenario IS
    // a leftover (under-filled with room for more), so it alone gets the blank —
    // an identical-content cap-closed row above it stretches to full width.
    expect(collectBlanks(rows[lastIdx]!.boxTree)).toHaveLength(1);
  });
});
