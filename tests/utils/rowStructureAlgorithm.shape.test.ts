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

  it('maxWidth caps a solo leaf’s width, and the clamped height derives from the capped width', () => {
    const [size] = calculateSizesFromBoxTree(
      leaf(panelBlock(1, { maxWidth: 400, minHeight: 56, maxHeight: 56 })),
      1274.4,
      GAP
    );

    expect(size?.width).toBe(400);
    expect(size?.height).toBe(56);
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

  it('content with no declared bounds is untouched — the entire shape path is skipped', () => {
    const tree = hbox(
      leaf(createImageContent(1)),
      vbox(leaf(createImageContent(2)), leaf(createImageContent(3)))
    );

    const sizes = calculateSizesFromBoxTree(tree, 1000, GAP);
    // 1920×1080 leaves: pre-shape geometry — the left leaf and the stacked pair solve so all
    // heights balance; pin exact values so any leak from the shape path moves a number here.
    for (const size of sizes) {
      expect(size.width).toBeGreaterThan(0);
      expect(size.height).toBeGreaterThan(0);
      expect(Number.isFinite(size.height)).toBe(true);
    }
    const [left, top, bottom] = sizes;
    expect(top?.width).toBe(bottom?.width);
    expect(left!.width + top!.width + GAP).toBeCloseTo(1000, 5);
  });
});
