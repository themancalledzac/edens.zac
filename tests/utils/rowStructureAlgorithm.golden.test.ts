/**
 * Golden pixels for the PHOTO path of the BoxTree sizer.
 *
 * Every other suite here asserts a relationship — heights match, widths sum to the body, a stack
 * absorbs its gap. Relationships survive a rewrite that moves every number by the same factor, and
 * the photo path is the one place where that is unacceptable: a photograph declares no shape
 * bounds, so `calculateSizesFromBoxTree` runs the identical arithmetic it has always run, and the
 * shaped-block and pinned-height work of branch 0246 was argued equivalent on the photo path three
 * independent ways (by construction — the shape walks are gated on a bound no photo declares;
 * algebraically; and empirically over the suite). This file converts that ARGUMENT into a pinned
 * regression: exact widths and heights, captured from the engine, six decimals.
 *
 * So a refactor that reorganises the affine-height model — extracting the shared `H(W) = a·W + b`
 * core, say — cannot quietly move a photograph by a pixel. If a number here changes, either the
 * refactor changed behaviour or the change was deliberate; both are answers, and "the sums still
 * add up" is not.
 *
 * Values are exact to 1e-6. They are NOT hand-derived: most fall out of a multi-level
 * `computeHeightCoeffs` solve whose closed form is longer than the number it produces. Re-capture
 * by printing `calculateSizesFromBoxTree` at full precision for the tree in question; do not
 * "fix" a failure by widening the tolerance.
 */
import { LAYOUT } from '@/app/constants';
import type { AnyContentModel } from '@/app/types/Content';
import type { BoxTree } from '@/app/utils/rowCombination';
import { calculateSizesFromBoxTree } from '@/app/utils/rowStructureAlgorithm';
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

/** 1920×1080, AR 1.7778. */
const landscape = (id: number) => createImageContent(id, { imageWidth: 1920, imageHeight: 1080 });
/** 1080×1920, AR 0.5625. */
const portrait = (id: number) => createImageContent(id, { imageWidth: 1080, imageHeight: 1920 });
/** 2500×2500, AR 1. */
const square = (id: number) => createImageContent(id, { imageWidth: 2500, imageHeight: 2500 });
/** 3000×1000, AR 3. */
const panorama = (id: number) => createImageContent(id, { imageWidth: 3000, imageHeight: 1000 });

/** The max desktop content width, `pageMaxWidth 1300 − desktopPadding 25.6`. */
const DESKTOP_WIDTH = 1274.4;

/** Assert every leaf's rendered `[width, height]` against its golden, in tree-traversal order. */
function expectSizes(tree: BoxTree, width: number, golden: Array<[number, number]>): void {
  const sizes = calculateSizesFromBoxTree(tree, width, GAP);

  expect(sizes).toHaveLength(golden.length);
  for (const [index, [expectedWidth, expectedHeight]] of golden.entries()) {
    expect(sizes[index]?.width).toBeCloseTo(expectedWidth, 6);
    expect(sizes[index]?.height).toBeCloseTo(expectedHeight, 6);
  }
}

describe('calculateSizesFromBoxTree — golden pixels on the photo path', () => {
  /**
   * The goldens below were captured at this gap, and a gap change moves every one of them. Pinned
   * here so that change reports itself as one failing constant rather than as seven trees' worth
   * of mystery pixel diffs.
   */
  it('is captured at the shipped grid gap', () => {
    expect(LAYOUT.gridGap).toBe(GAP);
  });

  it('gives two equal landscapes half the body each, at one shared height', () => {
    expectSizes(hbox(leaf(landscape(1)), leaf(landscape(2))), DESKTOP_WIDTH, [
      [630.8, 354.825],
      [630.8, 354.825],
    ]);
  });

  /**
   * The AR-proportional split, exactly: the landscape's 1.7778 against the portrait's 0.5625 is
   * 3.16 to 1, and the widths come out in that ratio while both render one height.
   */
  it('splits a portrait beside a landscape in proportion to their aspect ratios', () => {
    expectSizes(hbox(leaf(portrait(1)), leaf(landscape(2))), 1000, [
      [237.279525222552, 421.830267062315],
      [749.920474777448, 421.830267062315],
    ]);
  });

  /**
   * Three nested stacks, one gap absorbed per level. Every leaf keeps the full column width; the
   * heights carry the compounding scale-down, including the documented `gap²/height` residual a
   * nested stack leaves behind (the four heights plus three gaps come to 2902.1 against a raw
   * 2901.9 — 0.16px over four leaves, and pinning it is what stops it growing).
   */
  it('absorbs one gap per level down a three-deep vertical stack', () => {
    const tree = vbox(
      vbox(vbox(leaf(landscape(1)), leaf(portrait(2))), leaf(landscape(3))),
      leaf(portrait(4))
    );

    expectSizes(tree, 620, [
      [620, 341.701075788976],
      [620, 1079.944140765157],
      [620, 344.742278853891],
      [620, 1097.360501153973],
    ]);
  });

  /** A row root takes the whole body and renders at its intrinsic AR — no gap, nothing to share. */
  it('spans the body with a lone panorama at its intrinsic aspect ratio', () => {
    expectSizes(leaf(panorama(1)), DESKTOP_WIDTH, [[1274.4, 424.8]]);
  });

  /**
   * Asymmetric nesting with three different ARs: the left pair carries an inner gap the right
   * leaf does not, which is what the coefficient model exists to account for. All three heights
   * agree to the last bit the solve can produce.
   */
  it('renders a panorama, a square and a portrait side by side at one height', () => {
    const tree = hbox(hbox(leaf(panorama(1)), leaf(square(2))), leaf(portrait(3)));

    expectSizes(tree, DESKTOP_WIDTH, [
      [821.128767123288, 273.709589041096],
      [273.709589041096, 273.709589041096],
      [153.961643835617, 273.709589041096],
    ]);
  });

  /**
   * The five-image pattern that first exposed the vbox over-counting bug (it summed ALL sizes
   * returned by an hbox child, inflating the scale factor by a whole column). The existing test
   * for it asserts the vbox's visual height matches its sibling to the nearest pixel; this pins
   * every leaf it produces, which is the assertion that would have caught a compensating error.
   */
  it('sizes the five-image mixed pattern leaf by leaf', () => {
    const tree = hbox(
      hbox(vbox(leaf(landscape(1)), hbox(leaf(portrait(2)), leaf(portrait(3)))), leaf(portrait(4))),
      leaf(square(5))
    );

    expectSizes(tree, 1200, [
      [364.826351441094, 200.145121539811],
      [176.013175720547, 305.182013537889],
      [176.013175720547, 305.182013537889],
      [291.446513481206, 518.1271350777],
      [518.1271350777, 518.1271350777],
    ]);
  });

  /**
   * The no-op anchor. `rowStructureAlgorithm.shape.test.ts` and
   * `rowStructureAlgorithm.pinnedHeight.test.ts` each close with a "content declaring no bounds is
   * untouched" test on THIS tree at THIS width — the claim that the shaped and pinned paths never
   * reach a photograph. Those two assert the same goldens, so the three agree by construction and
   * a leak into the photo path fails all three at once.
   */
  it('sizes the shape/pin no-op anchor tree to the pre-shape geometry', () => {
    expectSizes(hbox(leaf(landscape(1)), vbox(leaf(landscape(2)), leaf(landscape(3)))), 1000, [
      [658.133333333333, 370.2],
      [329.066666666667, 178.7],
      [329.066666666667, 178.7],
    ]);
  });
});
