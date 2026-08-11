/**
 * Shaped-block tests for the BoxTree sizer: `maxWidth` as a render-time width cap and
 * `minHeight`/`maxHeight` as height clamps applied AFTER width allocation.
 *
 * The load-bearing property is the no-op guarantee: content declaring no bounds must come out of
 * `calculateSizesFromBoxTree` bit-identical to the pre-shape code, because every photograph on the
 * site runs through this function. The whole-suite regression run is the broad gate; the
 * equal-allocation test here pins the specific mechanism (clamps must not leak into width math).
 */
import type { AnyContentModel } from '@/app/types/Content';
import { type BoxTree } from '@/app/utils/rowCombination';
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

/** A 600×1100 panel-shaped block (the hub's declared placeholder ratio). */
const panelBlock = (id: number, overrides?: Parameters<typeof createImageContent>[1]) =>
  createImageContent(id, {
    imageWidth: undefined,
    imageHeight: undefined,
    width: 600,
    height: 1100,
    ...overrides,
  });

describe('calculateSizesFromBoxTree — shaped blocks', () => {
  it('maxHeight caps a solo leaf’s rendered height; width is untouched', () => {
    const [size] = calculateSizesFromBoxTree(leaf(panelBlock(1, { maxHeight: 320 })), 800, GAP);

    expect(size?.width).toBe(800);
    expect(size?.height).toBe(320);
  });

  it('minHeight floors a bar-shaped leaf at every width, and minHeight wins a conflict', () => {
    const bar = createImageContent(1, {
      imageWidth: undefined,
      imageHeight: undefined,
      width: 1200,
      height: 56,
      minHeight: 56,
      maxHeight: 56,
    });

    for (const width of [1274.4, 768, 390]) {
      const [size] = calculateSizesFromBoxTree(leaf(bar), width, GAP);
      expect(size?.height).toBe(56);
    }
  });

  /**
   * The cap binds against a ROW-MATE, so a block that has none keeps the whole row. This
   * reverses what shipped with the shape model, where a lone capped block rendered at
   * `min(rowWidth, maxWidth)` and left the remainder empty — 42px of dead strip beside a
   * 700px Users panel at a 742px body, 200px at 900px, across a whole band of narrow desktops
   * that no test covered. Nothing can absorb that width: `buildAtomic` short-circuits
   * single-item rows before any composition runs, and `padRowToWidth` refuses a row carrying a
   * `minWidth` member. Degrading the cap is the same trade `minWidth` already makes for a lone
   * item — a bound that costs a neighbour nothing is not worth a hole in the page.
   */
  it('does not cap a LONE block — with no row-mate to take the width, the cap degrades', () => {
    const [size] = calculateSizesFromBoxTree(
      leaf(panelBlock(1, { maxWidth: 400, minHeight: 56, maxHeight: 56 })),
      1274.4,
      GAP
    );

    expect(size?.width).toBe(1274.4);
    expect(size?.height).toBe(56);
  });

  /**
   * The other half of the same rule, and the reason the degradation above is narrow rather than
   * a retreat: with a row-mate present the cap binds exactly as it always has, and the clamped
   * height still derives from the capped width. Only the ROW ROOT is exempt.
   */
  it('caps a leaf that HAS a row-mate, height clamped from the capped width', () => {
    const sizes = calculateSizesFromBoxTree(
      hbox(
        leaf(panelBlock(1, { maxWidth: 400, minHeight: 56, maxHeight: 56 })),
        leaf(panelBlock(2))
      ),
      1274.4,
      GAP
    );

    expect(sizes[0]?.width).toBe(400);
    expect(sizes[0]?.height).toBe(56);
  });

  /**
   * A nested hbox of capped leaves may use both caps AND the gap between them. The sizer hands a
   * subtree `min(solvedWidth, subtreeMaxWidth)`, and that ceiling used to be `left + right` while
   * the composer's `consumedWidth` charged the same subtree `left + gap + right`. One gap of
   * disagreement per horizontal node: the composer scored the arrangement as spanning the body,
   * the sizer then squeezed the pair into a gap less width, and every leaf under it rendered
   * short of a cap it had been promised.
   */
  it('lets a nested pair of capped leaves use both caps plus the gap between them', () => {
    const capped = (id: number) => panelBlock(id, { maxWidth: 400, minHeight: 56, maxHeight: 56 });
    const sizes = calculateSizesFromBoxTree(
      hbox(hbox(leaf(capped(1)), leaf(capped(2))), leaf(panelBlock(3))),
      1600,
      GAP
    );

    expect(sizes[0]?.width).toBe(400);
    expect(sizes[1]?.width).toBe(400);
  });

  it('clamps do not change width allocation between hbox siblings', () => {
    const unclamped = calculateSizesFromBoxTree(
      hbox(leaf(panelBlock(1)), leaf(panelBlock(2))),
      1000,
      GAP
    );
    const clamped = calculateSizesFromBoxTree(
      hbox(leaf(panelBlock(1, { maxHeight: 300 })), leaf(panelBlock(2))),
      1000,
      GAP
    );

    expect(clamped.map(s => s.width)).toEqual(unclamped.map(s => s.width));
    expect(clamped[0]?.height).toBe(300);
    expect(clamped[1]?.height).toBe(unclamped[1]?.height);
  });

  it('a clamped leaf inside a vbox contributes its clamped height to the stack’s scaling', () => {
    const tall = panelBlock(1, { maxHeight: 700 });
    const short = panelBlock(2, { maxHeight: 200 });
    const sizes = calculateSizesFromBoxTree(vbox(leaf(tall), leaf(short)), 416, GAP);

    // Raw stack: 700 + 200; the CSS gap scales both down by (900 - gap) / 900.
    const scale = (900 - GAP) / 900;
    expect(sizes[0]?.height).toBeCloseTo(700 * scale, 5);
    expect(sizes[1]?.height).toBeCloseTo(200 * scale, 5);
  });

  /**
   * The no-op guarantee, asserted rather than gestured at. This test used to claim it pinned exact
   * values and then check that three widths and heights were positive and finite — true of any
   * arithmetic whatsoever, and true of a shape path that had leaked into every photograph on the
   * site. The goldens are the pre-shape geometry of three 1920×1080 leaves at 1000px, shared
   * verbatim with `rowStructureAlgorithm.golden.test.ts` and with the pinned-height suite's
   * no-op test, so a leak fails all three at once.
   */
  it('leaves content with no declared bounds at the exact pre-shape geometry', () => {
    const tree = hbox(
      leaf(createImageContent(1)),
      vbox(leaf(createImageContent(2)), leaf(createImageContent(3)))
    );

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
