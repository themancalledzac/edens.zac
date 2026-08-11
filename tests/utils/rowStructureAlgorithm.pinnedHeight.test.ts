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

  /**
   * Two pinned siblings state no equation in W, so the equal-height solve is a 0/0 there and the
   * DECLARED shapes share the width instead. The old name for this test said "splits width evenly",
   * which was the original rule and is now only what the proportional rule happens to return for
   * this equal-ratio pair — so the second case declares a 4:1 bar against a 0.545:1 panel and pins
   * the 12/88 split the ratios actually call for.
   */
  it('divides width between two pinned siblings by their declared aspect ratios', () => {
    const equalRatios = calculateSizesFromBoxTree(
      hbox(leaf(pinned(1, 300)), leaf(pinned(2, 180))),
      1000,
      GAP
    );

    expect(equalRatios[0]?.width).toBeCloseTo((1000 - GAP) / 2, 6);
    expect(equalRatios[1]?.width).toBeCloseTo((1000 - GAP) / 2, 6);
    expect(equalRatios[0]?.height).toBe(300);
    expect(equalRatios[1]?.height).toBe(180);

    const wideRight = calculateSizesFromBoxTree(
      hbox(leaf(pinned(1, 300)), leaf(pinned(2, 180, { width: 1200, height: 300 }))),
      1000,
      GAP
    );

    // AR 0.5454 against AR 4: the panel takes 12% of the 987.2px available, the bar 88%.
    expect(wideRight[0]?.width).toBeCloseTo(118.464, 6);
    expect(wideRight[1]?.width).toBeCloseTo(868.736, 6);
    expect(wideRight[0]?.height).toBe(300);
    expect(wideRight[1]?.height).toBe(180);
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

  /**
   * The same gap accounting, one level further out: the stack's flexible member is an hbox, and
   * only ONE of that hbox's two sides hides the pin. `solveHboxSplit` equalises the two sides, so
   * "the taller side" does not identify which one limits the shrink — and since the solve reaches
   * that equality through two different chains of arithmetic, the sides differ by a rounding
   * residual whose SIGN is arbitrary. Reading the basis off the taller side therefore picked
   * correctly or catastrophically at random: over a sweep of 13,968 such trees, 53% took the
   * wrong side and left up to 39.8px of the gap unabsorbed.
   *
   * The widths are the ones that failed, one per orientation, so the case is pinned deterministically
   * rather than left to whichever way the residual happened to fall.
   */
  it.each([
    ['pin on the left', 875, true],
    ['pin on the left', 900, true],
    ['pin on the right', 925, false],
    ['pin on the right', 1000, false],
  ])('absorbs a whole gap through an hbox with the %s at %spx', (_name, width, pinLeft) => {
    const stack = vbox(leaf(pinned(2, 200)), leaf(photo(3)));
    const row = pinLeft ? hbox(stack, leaf(photo(4))) : hbox(leaf(photo(4)), stack);
    const tree = vbox(leaf(pinned(1, 100)), row);

    const sizes = calculateSizesFromBoxTree(tree, width, GAP);
    const { a, b } = computeHeightCoeffs(tree, GAP);
    const byId = new Map(sizes.map(size => [size.content.id, size.height]));
    const stackHeight = byId.get(2)! + GAP + byId.get(3)!;
    const rendered = byId.get(1)! + GAP + Math.max(stackHeight, byId.get(4)!);

    expect(byId.get(1)).toBe(100);
    expect(byId.get(2)).toBe(200);
    expect(Math.abs(rendered - (a * width + b))).toBeLessThan(1);
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

  /**
   * "Bit-identical to the pre-pin code" is a claim about NUMBERS, and this test used to check that
   * two widths were equal, one sum reached 1000, and three heights were finite and positive — none
   * of which a pin leaking into the photo path would have disturbed. The goldens below are the
   * pre-pin geometry of three 1920×1080 leaves at 1000px, shared verbatim with
   * `rowStructureAlgorithm.golden.test.ts` and with the shape suite's no-op test.
   */
  it('leaves content declaring no bounds at the exact pre-pin geometry', () => {
    const tree = hbox(leaf(photo(1)), vbox(leaf(photo(2)), leaf(photo(3))));
    const sizes = calculateSizesFromBoxTree(tree, 1000, GAP);
    const golden: Array<[number, number]> = [
      [658.133333333333, 370.2],
      [329.066666666667, 178.7],
      [329.066666666667, 178.7],
    ];

    expect(sizes).toHaveLength(golden.length);
    for (const [index, [width, height]] of golden.entries()) {
      expect(sizes[index]?.width).toBeCloseTo(width, 6);
      expect(sizes[index]?.height).toBeCloseTo(height, 6);
    }
  });
});
