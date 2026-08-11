/**
 * Pinned-height blocks in the BoxTree sizer.
 *
 * A block that declares `minHeight === maxHeight` has a height that does NOT vary with its
 * rendered width — the admin hub's panels, whose height is `chrome + rowCount × rowHeight`.
 * In the sizer's affine model `H(W) = a·W + b` that is exactly the point `a = 0`, so the
 * existing equal-height solve already handles it; these tests pin the three places it did not:
 * the leaf coefficient, the degenerate `aL + aR === 0` division, and the vbox gap scaling that
 * used to shrink a pinned block below its declared height.
 *
 * The distinction that keeps the blast radius small: a `maxHeight` on its own is a CAP (height
 * still tracks width below it) and its behaviour is unchanged. Only a min===max PIN takes the
 * new path. `rowStructureAlgorithm.shape.test.ts` continues to pin the cap semantics.
 */
import type { AnyContentModel } from '@/app/types/Content';
import { type BoxTree } from '@/app/utils/rowCombination';
import { calculateSizesFromBoxTree, computeHeightCoeffs } from '@/app/utils/rowStructureAlgorithm';
import { createImageContent } from '@/tests/fixtures/contentFixtures';

const GAP = 12.8;

const leaf = (content: AnyContentModel): BoxTree => ({ type: 'leaf', content });
const hbox = (a: BoxTree, b: BoxTree): BoxTree => ({
  type: 'combined',
  direction: 'horizontal',
  children: [a, b],
});
const vbox = (a: BoxTree, b: BoxTree): BoxTree => ({
  type: 'combined',
  direction: 'vertical',
  children: [a, b],
});

/**
 * A panel-shaped block whose height is pinned to `h` px regardless of width. The declared
 * 600×1100 ratio is deliberately left in place and deliberately inconsistent with `h` — a pin
 * must win over the declared AR, which is the entire point of the feature.
 */
const pinned = (id: number, h: number, extra?: Record<string, unknown>) =>
  createImageContent(id, {
    imageWidth: undefined,
    imageHeight: undefined,
    width: 600,
    height: 1100,
    minHeight: h,
    maxHeight: h,
    ...extra,
  });

/** A 1920×1080 photo: AR 1.778, so 1/AR = 0.5625 exactly. */
const photo = (id: number) => createImageContent(id, { imageWidth: 1920, imageHeight: 1080 });

describe('computeHeightCoeffs — pinned-height leaves', () => {
  it('models a pinned leaf as a = 0, b = pinned height', () => {
    expect(computeHeightCoeffs(leaf(pinned(1, 300)), GAP)).toEqual({ a: 0, b: 300 });
  });

  it('leaves a maxHeight-only CAP on the pure-AR path (a stays 1/AR)', () => {
    const capped = createImageContent(1, {
      imageWidth: undefined,
      imageHeight: undefined,
      width: 600,
      height: 1100,
      maxHeight: 300,
    });

    const coeffs = computeHeightCoeffs(leaf(capped), GAP);
    expect(coeffs.a).toBeCloseTo(1100 / 600, 12);
    expect(coeffs.b).toBe(0);
  });

  it('an hbox of pinned + flexible renders at the pinned height', () => {
    const coeffs = computeHeightCoeffs(hbox(leaf(pinned(1, 300)), leaf(photo(2))), GAP);

    expect(coeffs.a).toBe(0);
    expect(coeffs.b).toBeCloseTo(300, 10);
  });

  it('an hbox of two pinned leaves does not divide by zero — it takes the taller', () => {
    const coeffs = computeHeightCoeffs(hbox(leaf(pinned(1, 300)), leaf(pinned(2, 180))), GAP);

    expect(Number.isNaN(coeffs.a)).toBe(false);
    expect(Number.isNaN(coeffs.b)).toBe(false);
    expect(coeffs).toEqual({ a: 0, b: 300 });
  });

  it('a vbox of two pinned leaves adds the gap — nothing flexible can absorb it', () => {
    expect(computeHeightCoeffs(vbox(leaf(pinned(1, 300)), leaf(pinned(2, 180))), GAP)).toEqual({
      a: 0,
      b: 300 + 180 + GAP,
    });
  });

  it('a vbox of pinned + flexible stays affine, with the pin in b', () => {
    const coeffs = computeHeightCoeffs(vbox(leaf(pinned(1, 300)), leaf(photo(2))), GAP);

    expect(coeffs.a).toBeCloseTo(0.5625, 10);
    expect(coeffs.b).toBeCloseTo(300, 10);
  });
});

describe('calculateSizesFromBoxTree — pinned-height blocks', () => {
  it('gives a flexible sibling exactly the width at which it matches the pinned height', () => {
    const sizes = calculateSizesFromBoxTree(hbox(leaf(pinned(1, 300)), leaf(photo(2))), 1000, GAP);
    const [panel, image] = sizes;

    expect(panel?.height).toBe(300);
    expect(image?.height).toBeCloseTo(300, 6);
    expect(image?.width).toBeCloseTo(300 * (1920 / 1080), 6);
    expect(panel!.width + image!.width + GAP).toBeCloseTo(1000, 6);
  });

  it('splits width evenly between two pinned siblings instead of returning NaN', () => {
    const sizes = calculateSizesFromBoxTree(
      hbox(leaf(pinned(1, 300)), leaf(pinned(2, 180))),
      1000,
      GAP
    );

    for (const size of sizes) {
      expect(Number.isFinite(size.width)).toBe(true);
      expect(Number.isFinite(size.height)).toBe(true);
    }
    expect(sizes[0]?.width).toBeCloseTo((1000 - GAP) / 2, 6);
    expect(sizes[1]?.width).toBeCloseTo((1000 - GAP) / 2, 6);
    expect(sizes[0]?.height).toBe(300);
    expect(sizes[1]?.height).toBe(180);
  });

  it('never scales a pinned leaf inside a vbox — both keep their declared height', () => {
    const sizes = calculateSizesFromBoxTree(
      vbox(leaf(pinned(1, 300)), leaf(pinned(2, 180))),
      416,
      GAP
    );

    expect(sizes[0]?.height).toBe(300);
    expect(sizes[1]?.height).toBe(180);
  });

  it('makes the flexible member of a vbox absorb the gap, leaving the pin intact', () => {
    const sizes = calculateSizesFromBoxTree(vbox(leaf(pinned(1, 300)), leaf(photo(2))), 400, GAP);
    const [panel, image] = sizes;

    expect(panel?.height).toBe(300);
    // The photo would render 400 × 0.5625 = 225 tall; it gives up the whole gap.
    expect(image?.height).toBeCloseTo(225 - GAP, 6);
  });

  it('absorbs a whole gap around a pin buried two levels down, not a fraction of one', () => {
    // V(pin300, V(pin200, photo)). The outer vbox sees a right child whose coefficient is
    // non-zero — the photo flexes — and used to hand the whole subtree one scale factor sized
    // against its FULL 425px visual height. `applyScale` then re-asserted the buried 200px pin,
    // so only the photo's 225px actually moved and the stack rendered ~6.4px taller than the
    // `a·W + b` model every consumer (the composer's fill and pocket rules included) scored it by.
    const tree = vbox(leaf(pinned(1, 300)), vbox(leaf(pinned(2, 200)), leaf(photo(3))));
    const sizes = calculateSizesFromBoxTree(tree, 400, GAP);
    const [outerPin, innerPin, image] = sizes;

    expect(outerPin?.height).toBe(300);
    expect(innerPin?.height).toBe(200);

    const { a, b } = computeHeightCoeffs(tree, GAP);
    const rendered = outerPin!.height + GAP + innerPin!.height + GAP + image!.height;
    expect(Math.abs(rendered - (a * 400 + b))).toBeLessThan(1);
  });

  it('keeps a tall pinned panel visible beside a short photo instead of collapsing it to zero', () => {
    // 991px of panel beside a photo that can only reach 0.5625 × 800 = 450px at full width.
    // The height equation has no solution, so the old code drove the panel's width negative.
    const sizes = calculateSizesFromBoxTree(
      hbox(leaf(pinned(1, 991, { minWidth: 400 })), leaf(photo(2))),
      800,
      GAP
    );
    const [panel, image] = sizes;

    expect(panel?.width).toBeGreaterThanOrEqual(400);
    expect(panel?.height).toBe(991);
    expect(image?.width).toBeGreaterThan(0);
    expect(panel!.width + image!.width + GAP).toBeCloseTo(800, 6);
  });

  it('leaves content declaring no bounds bit-identical to the pre-pin code', () => {
    const tree = hbox(leaf(photo(1)), vbox(leaf(photo(2)), leaf(photo(3))));
    const sizes = calculateSizesFromBoxTree(tree, 1000, GAP);

    const [left, top, bottom] = sizes;
    expect(top?.width).toBe(bottom?.width);
    expect(left!.width + top!.width + GAP).toBeCloseTo(1000, 5);
    for (const size of sizes) {
      expect(Number.isFinite(size.height)).toBe(true);
      expect(size.height).toBeGreaterThan(0);
    }
  });
});
