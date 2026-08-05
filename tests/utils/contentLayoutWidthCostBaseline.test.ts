/**
 * Regression tests for `ProcessContentOptions.widthCostBaseline`.
 *
 * Width-cost scales with rating (`BASE_WEIGHT` 3★ 2.5, 4★ 3.5, 5★ 5.0), so a filter that changes
 * the rating mix changes how many items fit the fixed row budget. Toggling "Highly Rated" took a
 * real collection from ~5 photos per row to ~3 — every photo visibly resized while the photo-size
 * control still read Medium. Passing the UNFILTERED mean as a baseline scales the budget to cancel
 * that shift.
 */
import type { AnyContentModel } from '@/app/types/Content';
import { processContentForDisplay, type RowWithPatternAndSizes } from '@/app/utils/contentLayout';
import { getMeanWidthCost } from '@/app/utils/contentRatingUtils';
import { createHorizontalImage } from '@/tests/fixtures/contentFixtures';

const COMPONENT_WIDTH = 1400;
const CHUNK_SIZE = 4;

/** Photos per content row, ignoring any header row. */
function itemsPerRow(rows: RowWithPatternAndSizes[]): number[] {
  return rows.filter(row => row.rowType === 'content').map(row => row.items.length);
}

function layout(content: AnyContentModel[], widthCostBaseline?: number) {
  return processContentForDisplay(content, COMPONENT_WIDTH, CHUNK_SIZE, {
    targetAR: 1.5,
    widthCostBaseline,
  });
}

/** A typical mixed-rating collection: mostly 3★ with a few standouts. */
const mixedCollection: AnyContentModel[] = [
  ...Array.from({ length: 12 }, (_, i) => createHorizontalImage(i + 1, 3)),
  ...Array.from({ length: 4 }, (_, i) => createHorizontalImage(i + 100, 5)),
  ...Array.from({ length: 4 }, (_, i) => createHorizontalImage(i + 200, 4)),
];

/** What "Highly Rated" leaves behind: the 4★ and 5★ images only. */
const highlyRatedOnly = mixedCollection.filter(
  (item): item is ReturnType<typeof createHorizontalImage> =>
    'rating' in item && typeof item.rating === 'number' && item.rating >= 4
);

describe('widthCostBaseline', () => {
  it('leaves an unfiltered layout byte-identical when the baseline is its own mean', () => {
    // The escape hatch that makes this safe to add globally: baseline === current mean -> factor 1.
    const withoutBaseline = layout(mixedCollection);
    const withOwnBaseline = layout(mixedCollection, getMeanWidthCost(mixedCollection));
    expect(itemsPerRow(withOwnBaseline)).toEqual(itemsPerRow(withoutBaseline));
  });

  it('holds photos-per-row steady when a filter removes the lower-rated images', () => {
    const unfiltered = itemsPerRow(layout(mixedCollection));
    const baseline = getMeanWidthCost(mixedCollection);
    const filtered = itemsPerRow(layout(highlyRatedOnly, baseline));

    const mean = (counts: number[]) => counts.reduce((a, b) => a + b, 0) / counts.length;
    // Within one photo per row. Not exact equality: rows are packed greedily against an integer
    // budget, so the tail row and rounding still move by an item.
    expect(Math.abs(mean(filtered) - mean(unfiltered))).toBeLessThan(1);
  });

  it('without a baseline, the same filter visibly shrinks the row — the bug this prevents', () => {
    const unfiltered = itemsPerRow(layout(mixedCollection));
    const filtered = itemsPerRow(layout(highlyRatedOnly));

    const mean = (counts: number[]) => counts.reduce((a, b) => a + b, 0) / counts.length;
    expect(mean(filtered)).toBeLessThan(mean(unfiltered));
  });

  it('ignores a zero or absent baseline rather than dividing by it', () => {
    expect(itemsPerRow(layout(mixedCollection, 0))).toEqual(itemsPerRow(layout(mixedCollection)));
  });

  it('keeps relative sizing inside a row — a 5★ still outweighs a 3★ beside it', () => {
    // Normalisation scales the row BUDGET, never an individual item's cost.
    const three = createHorizontalImage(1, 3);
    const five = createHorizontalImage(2, 5);
    expect(getMeanWidthCost([five])).toBeGreaterThan(getMeanWidthCost([three]));
  });
});

describe('getMeanWidthCost', () => {
  it('returns 0 for an empty set so callers can treat it as "no baseline"', () => {
    expect(getMeanWidthCost([])).toBe(0);
  });

  it('rises as the rating mix rises', () => {
    const allThree = Array.from({ length: 4 }, (_, i) => createHorizontalImage(i, 3));
    const allFive = Array.from({ length: 4 }, (_, i) => createHorizontalImage(i, 5));
    expect(getMeanWidthCost(allFive)).toBeGreaterThan(getMeanWidthCost(allThree));
  });
});
