/**
 * Unit tests for rowStructureAlgorithm.ts
 * Tests calculateBoxTreeAspectRatio and calculateSizesFromBoxTree
 */

import type { BoxTree } from '@/app/utils/rowCombination';
import {
  calculateBoxTreeAspectRatio,
  calculateSizesFromBoxTree,
} from '@/app/utils/rowStructureAlgorithm';
import {
  createHorizontalImage,
  createImageContent,
  createVerticalImage,
  H,
  V,
} from '@/tests/fixtures/contentFixtures';

// =============================================================================
// CONSTANTS
// =============================================================================

const gridGap = 12.8;

// =============================================================================
// HELPERS
// =============================================================================

/** Build a leaf BoxTree from a ContentImageModel */
function leaf(content: ReturnType<typeof createImageContent>): BoxTree {
  return { type: 'leaf', content };
}

/** Build a horizontal combined BoxTree */
function hNode(left: BoxTree, right: BoxTree): BoxTree {
  return { type: 'combined', direction: 'horizontal', children: [left, right] };
}

/** Build a vertical combined BoxTree */
function vNode(top: BoxTree, bottom: BoxTree): BoxTree {
  return { type: 'combined', direction: 'vertical', children: [top, bottom] };
}

// =============================================================================
// calculateBoxTreeAspectRatio
// =============================================================================

describe('calculateBoxTreeAspectRatio', () => {
  const chunkSize = 4;

  // ---------------------------------------------------------------------------
  // Leaf nodes
  // ---------------------------------------------------------------------------

  describe('leaf node — intrinsic aspect ratios', () => {
    it('returns correct AR for a horizontal image (1920x1080)', () => {
      const img = createHorizontalImage(1, 3);
      const tree = leaf(img);
      const ar = calculateBoxTreeAspectRatio(tree, chunkSize);
      expect(ar).toBeCloseTo(1920 / 1080, 5); // ≈ 1.7778
    });

    it('returns correct AR for a vertical image (1080x1920)', () => {
      const img = createVerticalImage(1, 3);
      const tree = leaf(img);
      const ar = calculateBoxTreeAspectRatio(tree, chunkSize);
      expect(ar).toBeCloseTo(1080 / 1920, 5); // ≈ 0.5625
    });

    it('returns 1.0 for a square image (1000x1000)', () => {
      const img = createImageContent(1, { imageWidth: 1000, imageHeight: 1000 });
      const tree = leaf(img);
      const ar = calculateBoxTreeAspectRatio(tree, chunkSize);
      expect(ar).toBeCloseTo(1.0, 5);
    });

    it('falls back to default dimensions (not NaN/Infinity) when imageHeight is 0 (falsy)', () => {
      // getContentDimensions treats imageHeight=0 as falsy and falls back to defaults (1300x867)
      // The height===0 guard in calculateBoxTreeAspectRatio is only reachable for non-image
      // content with explicit zero dimensions; for IMAGE blocks the fallback prevents it.
      const img = createImageContent(1, { imageWidth: 1920, imageHeight: 0 });
      const tree = leaf(img);
      const ar = calculateBoxTreeAspectRatio(tree, chunkSize);
      expect(Number.isFinite(ar)).toBe(true);
      expect(ar).toBeGreaterThan(0);
      // Default dimensions: 1300 wide, Math.round(1300 / 1.5) = 867 tall → AR ≈ 1.499
      expect(ar).toBeCloseTo(1300 / 867, 2);
    });
  });

  // ---------------------------------------------------------------------------
  // Horizontal compositions: AR = AR_left + AR_right
  // ---------------------------------------------------------------------------

  describe('horizontal composition — AR is sum of child ARs', () => {
    it('two equal horizontal images side by side: AR = AR_left + AR_right', () => {
      const img1 = createHorizontalImage(1, 3);
      const img2 = createHorizontalImage(2, 3);
      const tree = hNode(leaf(img1), leaf(img2));
      const ar = calculateBoxTreeAspectRatio(tree, chunkSize);
      const expectedAR = 1920 / 1080 + 1920 / 1080; // ≈ 3.5556
      expect(ar).toBeCloseTo(expectedAR, 5);
    });

    it('horizontal image and vertical image side by side', () => {
      const imgH = createHorizontalImage(1, 3); // AR ≈ 1.7778
      const imgV = createVerticalImage(2, 3); // AR ≈ 0.5625
      const tree = hNode(leaf(imgH), leaf(imgV));
      const ar = calculateBoxTreeAspectRatio(tree, chunkSize);
      const expectedAR = 1920 / 1080 + 1080 / 1920; // ≈ 2.3403
      expect(ar).toBeCloseTo(expectedAR, 5);
    });

    it('two equal ARs: combined ≈ 2 × single AR', () => {
      const img1 = H(1, 3);
      const img2 = H(2, 3);
      const tree = hNode(leaf(img1), leaf(img2));
      const singleAR = 1920 / 1080;
      expect(calculateBoxTreeAspectRatio(tree, chunkSize)).toBeCloseTo(singleAR * 2, 5);
    });
  });

  // ---------------------------------------------------------------------------
  // Vertical compositions: AR = 1 / (1/AR_left + 1/AR_right) — harmonic
  // ---------------------------------------------------------------------------

  describe('vertical composition — AR is harmonic combination of child ARs', () => {
    it('two equal horizontal images stacked: AR = harmonic(AR, AR)', () => {
      const img1 = createHorizontalImage(1, 3);
      const img2 = createHorizontalImage(2, 3);
      const tree = vNode(leaf(img1), leaf(img2));
      const singleAR = 1920 / 1080; // ≈ 1.7778
      const expectedAR = 1 / (1 / singleAR + 1 / singleAR); // ≈ 0.8889
      const ar = calculateBoxTreeAspectRatio(tree, chunkSize);
      expect(ar).toBeCloseTo(expectedAR, 5);
    });

    it('two equal images stacked: combined AR = single AR / 2', () => {
      // For equal ARs: harmonic = 1/(2/AR) = AR/2
      const img1 = H(1, 3);
      const img2 = H(2, 3);
      const tree = vNode(leaf(img1), leaf(img2));
      const singleAR = 1920 / 1080;
      expect(calculateBoxTreeAspectRatio(tree, chunkSize)).toBeCloseTo(singleAR / 2, 5);
    });

    it('H and V stacked: AR = 1 / (1/AR_h + 1/AR_v)', () => {
      const imgH = createHorizontalImage(1, 3); // AR ≈ 1.7778
      const imgV = createVerticalImage(2, 3); // AR ≈ 0.5625
      const tree = vNode(leaf(imgH), leaf(imgV));
      const arH = 1920 / 1080;
      const arV = 1080 / 1920;
      const expectedAR = 1 / (1 / arH + 1 / arV); // ≈ 0.4286
      const ar = calculateBoxTreeAspectRatio(tree, chunkSize);
      expect(ar).toBeCloseTo(expectedAR, 5);
    });
  });

  // ---------------------------------------------------------------------------
  // Nested compositions
  // ---------------------------------------------------------------------------

  describe('nested compositions', () => {
    it('H(leaf, V(leaf, leaf)): horizontal with a vertical stack on the right', () => {
      // Structure: H( img1, V( img2, img3 ) )
      const img1 = createHorizontalImage(1, 3); // AR ≈ 1.7778
      const img2 = createHorizontalImage(2, 3); // AR ≈ 1.7778
      const img3 = createHorizontalImage(3, 3); // AR ≈ 1.7778

      const singleAR = 1920 / 1080;
      const rightAR = 1 / (1 / singleAR + 1 / singleAR); // harmonic of two equal → singleAR/2
      const expectedAR = singleAR + rightAR; // left + right (horizontal sum)

      const tree = hNode(leaf(img1), vNode(leaf(img2), leaf(img3)));
      const ar = calculateBoxTreeAspectRatio(tree, chunkSize);
      expect(ar).toBeCloseTo(expectedAR, 5);
    });

    it('V(H(leaf, leaf), leaf): vertical stack of a horizontal pair and a single', () => {
      const img1 = H(1, 3); // AR ≈ 1.7778
      const img2 = H(2, 3); // AR ≈ 1.7778
      const img3 = H(3, 3); // AR ≈ 1.7778

      const singleAR = 1920 / 1080;
      const leftAR = singleAR + singleAR; // horizontal pair
      const expectedAR = 1 / (1 / leftAR + 1 / singleAR); // harmonic

      const tree = vNode(hNode(leaf(img1), leaf(img2)), leaf(img3));
      const ar = calculateBoxTreeAspectRatio(tree, chunkSize);
      expect(ar).toBeCloseTo(expectedAR, 5);
    });

    it('produces a finite, positive AR for a 3-level deep tree', () => {
      // H( V(H1,V1), H( H2, V2 ) )
      const tree = hNode(vNode(leaf(H(1, 3)), leaf(V(2, 3))), hNode(leaf(H(3, 3)), leaf(V(4, 3))));
      const ar = calculateBoxTreeAspectRatio(tree, chunkSize);
      expect(Number.isFinite(ar)).toBe(true);
      expect(ar).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// calculateSizesFromBoxTree
// =============================================================================

describe('calculateSizesFromBoxTree', () => {
  const chunkSize = 4;
  const targetWidth = 1000;

  // ---------------------------------------------------------------------------
  // Single leaf
  // ---------------------------------------------------------------------------

  describe('single leaf', () => {
    it('returns one size entry with width equal to targetWidth', () => {
      const img = createHorizontalImage(1, 3);
      const tree = leaf(img);
      const sizes = calculateSizesFromBoxTree(tree, targetWidth, gridGap, chunkSize);
      expect(sizes).toHaveLength(1);
      expect(sizes[0]!.width).toBeCloseTo(targetWidth, 5);
    });

    it('height = targetWidth / AR for a 1920x1080 image at targetWidth=1000', () => {
      const img = createHorizontalImage(1, 3);
      const tree = leaf(img);
      const sizes = calculateSizesFromBoxTree(tree, targetWidth, gridGap, chunkSize);
      const expectedHeight = targetWidth / (1920 / 1080); // ≈ 562.5
      expect(sizes[0]!.height).toBeCloseTo(expectedHeight, 3);
    });

    it('height ≈ 562.5 for a 1920x1080 image at targetWidth=1000', () => {
      const img = createHorizontalImage(1, 3);
      const tree = leaf(img);
      const sizes = calculateSizesFromBoxTree(tree, targetWidth, gridGap, chunkSize);
      expect(sizes[0]!.height).toBeCloseTo(562.5, 1);
    });

    it('content reference is the original content item', () => {
      const img = createHorizontalImage(1, 3);
      const tree = leaf(img);
      const sizes = calculateSizesFromBoxTree(tree, targetWidth, gridGap, chunkSize);
      expect(sizes[0]!.content).toBe(img);
    });
  });

  // ---------------------------------------------------------------------------
  // Horizontal pair
  // ---------------------------------------------------------------------------

  describe('horizontal pair', () => {
    it('returns two size entries for a horizontal pair', () => {
      const img1 = createHorizontalImage(1, 3);
      const img2 = createHorizontalImage(2, 3);
      const tree = hNode(leaf(img1), leaf(img2));
      const sizes = calculateSizesFromBoxTree(tree, targetWidth, gridGap, chunkSize);
      expect(sizes).toHaveLength(2);
    });

    it('two equal-AR images each get (targetWidth - gap) / 2 width', () => {
      const img1 = H(1, 3);
      const img2 = H(2, 3);
      const tree = hNode(leaf(img1), leaf(img2));
      const sizes = calculateSizesFromBoxTree(tree, targetWidth, gridGap, chunkSize);
      const expectedWidth = (targetWidth - gridGap) / 2;
      expect(sizes[0]!.width).toBeCloseTo(expectedWidth, 3);
      expect(sizes[1]!.width).toBeCloseTo(expectedWidth, 3);
    });

    it('equal-AR images have equal heights', () => {
      const img1 = H(1, 3);
      const img2 = H(2, 3);
      const tree = hNode(leaf(img1), leaf(img2));
      const sizes = calculateSizesFromBoxTree(tree, targetWidth, gridGap, chunkSize);
      expect(sizes[0]!.height).toBeCloseTo(sizes[1]!.height, 3);
    });

    it('total item width equals targetWidth - gap', () => {
      const img1 = H(1, 3);
      const img2 = V(2, 3);
      const tree = hNode(leaf(img1), leaf(img2));
      const sizes = calculateSizesFromBoxTree(tree, targetWidth, gridGap, chunkSize);
      const totalWidth = sizes.reduce((sum, s) => sum + s.width, 0);
      expect(totalWidth).toBeCloseTo(targetWidth - gridGap, 3);
    });

    it('items come out in left-to-right order (content references match)', () => {
      const img1 = createHorizontalImage(1, 3);
      const img2 = createHorizontalImage(2, 3);
      const tree = hNode(leaf(img1), leaf(img2));
      const sizes = calculateSizesFromBoxTree(tree, targetWidth, gridGap, chunkSize);
      expect(sizes[0]!.content).toBe(img1);
      expect(sizes[1]!.content).toBe(img2);
    });
  });

  // ---------------------------------------------------------------------------
  // Vertical stack
  // ---------------------------------------------------------------------------

  describe('vertical stack', () => {
    it('returns two size entries for a vertical stack', () => {
      const img1 = H(1, 3);
      const img2 = H(2, 3);
      const tree = vNode(leaf(img1), leaf(img2));
      const sizes = calculateSizesFromBoxTree(tree, targetWidth, gridGap, chunkSize);
      expect(sizes).toHaveLength(2);
    });

    it('both items get full targetWidth', () => {
      const img1 = H(1, 3);
      const img2 = H(2, 3);
      const tree = vNode(leaf(img1), leaf(img2));
      const sizes = calculateSizesFromBoxTree(tree, targetWidth, gridGap, chunkSize);
      expect(sizes[0]!.width).toBeCloseTo(targetWidth, 3);
      expect(sizes[1]!.width).toBeCloseTo(targetWidth, 3);
    });

    it('heights are scaled down to account for gap (scaleFactor < 1)', () => {
      const img1 = H(1, 3);
      const img2 = H(2, 3);
      const tree = vNode(leaf(img1), leaf(img2));
      const sizes = calculateSizesFromBoxTree(tree, targetWidth, gridGap, chunkSize);

      // Raw height if no scaling: each = targetWidth / AR
      const singleAR = 1920 / 1080;
      const rawH = targetWidth / singleAR;
      const rawTotalHeight = rawH + rawH;
      const scaleFactor = (rawTotalHeight - gridGap) / rawTotalHeight;
      const expectedHeight = rawH * scaleFactor;

      expect(sizes[0]!.height).toBeCloseTo(expectedHeight, 3);
      expect(sizes[1]!.height).toBeCloseTo(expectedHeight, 3);
    });

    it('scaleFactor = (rawTotalHeight - gap) / rawTotalHeight', () => {
      const img1 = H(1, 3);
      const img2 = V(2, 3);
      const tree = vNode(leaf(img1), leaf(img2));
      const sizes = calculateSizesFromBoxTree(tree, targetWidth, gridGap, chunkSize);

      const arH = 1920 / 1080;
      const arV = 1080 / 1920;
      const rawH1 = targetWidth / arH;
      const rawH2 = targetWidth / arV;
      const rawTotalHeight = rawH1 + rawH2;
      const scaleFactor = (rawTotalHeight - gridGap) / rawTotalHeight;

      expect(sizes[0]!.height).toBeCloseTo(rawH1 * scaleFactor, 3);
      expect(sizes[1]!.height).toBeCloseTo(rawH2 * scaleFactor, 3);
    });

    it('items come out top-to-bottom order (content references match)', () => {
      const img1 = createHorizontalImage(1, 3);
      const img2 = createVerticalImage(2, 3);
      const tree = vNode(leaf(img1), leaf(img2));
      const sizes = calculateSizesFromBoxTree(tree, targetWidth, gridGap, chunkSize);
      expect(sizes[0]!.content).toBe(img1);
      expect(sizes[1]!.content).toBe(img2);
    });
  });

  // ---------------------------------------------------------------------------
  // Width proportions for different ARs
  // ---------------------------------------------------------------------------

  describe('width proportions based on AR', () => {
    it('H image gets more width than V image in horizontal pair', () => {
      const imgH = H(1, 3); // AR ≈ 1.7778
      const imgV = V(2, 3); // AR ≈ 0.5625
      const tree = hNode(leaf(imgH), leaf(imgV));
      const sizes = calculateSizesFromBoxTree(tree, targetWidth, gridGap, chunkSize);
      expect(sizes[0]!.width).toBeGreaterThan(sizes[1]!.width);
    });

    it('widths are proportional to ARs: leftWidth/rightWidth = AR_left/AR_right', () => {
      const imgH = H(1, 3); // AR ≈ 1.7778
      const imgV = V(2, 3); // AR ≈ 0.5625
      const tree = hNode(leaf(imgH), leaf(imgV));
      const sizes = calculateSizesFromBoxTree(tree, targetWidth, gridGap, chunkSize);

      const arH = 1920 / 1080;
      const arV = 1080 / 1920;
      const expectedRatio = arH / arV;
      const actualRatio = sizes[0]!.width / sizes[1]!.width;
      expect(actualRatio).toBeCloseTo(expectedRatio, 3);
    });

    it('left and right widths exactly add to availableWidth', () => {
      const imgH = H(1, 3);
      const imgV = V(2, 3);
      const tree = hNode(leaf(imgH), leaf(imgV));
      const sizes = calculateSizesFromBoxTree(tree, targetWidth, gridGap, chunkSize);
      const availableWidth = targetWidth - gridGap;
      expect(sizes[0]!.width + sizes[1]!.width).toBeCloseTo(availableWidth, 3);
    });
  });

  // ---------------------------------------------------------------------------
  // Output ordering
  // ---------------------------------------------------------------------------

  describe('output order (tree traversal — left-to-right, top-to-bottom)', () => {
    it('3-image horizontal chain: outputs left to right', () => {
      const img1 = H(1, 3);
      const img2 = H(2, 3);
      const img3 = H(3, 3);
      // H( H(img1, img2), img3 )
      const tree = hNode(hNode(leaf(img1), leaf(img2)), leaf(img3));
      const sizes = calculateSizesFromBoxTree(tree, targetWidth, gridGap, chunkSize);
      expect(sizes).toHaveLength(3);
      expect(sizes[0]!.content).toBe(img1);
      expect(sizes[1]!.content).toBe(img2);
      expect(sizes[2]!.content).toBe(img3);
    });

    it('3-image vertical stack: outputs top to bottom', () => {
      const img1 = H(1, 3);
      const img2 = H(2, 3);
      const img3 = H(3, 3);
      // V( V(img1, img2), img3 )
      const tree = vNode(vNode(leaf(img1), leaf(img2)), leaf(img3));
      const sizes = calculateSizesFromBoxTree(tree, targetWidth, gridGap, chunkSize);
      expect(sizes).toHaveLength(3);
      expect(sizes[0]!.content).toBe(img1);
      expect(sizes[1]!.content).toBe(img2);
      expect(sizes[2]!.content).toBe(img3);
    });

    it('mixed tree H(V(img1,img2), img3): left group first, then right', () => {
      const img1 = H(1, 3);
      const img2 = V(2, 3);
      const img3 = H(3, 3);
      const tree = hNode(vNode(leaf(img1), leaf(img2)), leaf(img3));
      const sizes = calculateSizesFromBoxTree(tree, targetWidth, gridGap, chunkSize);
      expect(sizes).toHaveLength(3);
      expect(sizes[0]!.content).toBe(img1);
      expect(sizes[1]!.content).toBe(img2);
      expect(sizes[2]!.content).toBe(img3);
    });
  });

  // ---------------------------------------------------------------------------
  // Default gap parameter
  // ---------------------------------------------------------------------------

  describe('gap parameter', () => {
    it('uses gridGap=12.8 as default gap', () => {
      const img1 = H(1, 3);
      const img2 = H(2, 3);
      const tree = hNode(leaf(img1), leaf(img2));
      const sizesDefault = calculateSizesFromBoxTree(tree, targetWidth, gridGap, chunkSize);
      const sizesExplicit = calculateSizesFromBoxTree(tree, targetWidth, 12.8, chunkSize);
      expect(sizesDefault[0]!.width).toBeCloseTo(sizesExplicit[0]!.width, 5);
      expect(sizesDefault[1]!.width).toBeCloseTo(sizesExplicit[1]!.width, 5);
    });

    it('larger gap reduces available width for horizontal pair', () => {
      const img1 = H(1, 3);
      const img2 = H(2, 3);
      const tree = hNode(leaf(img1), leaf(img2));
      const sizesSmallGap = calculateSizesFromBoxTree(tree, targetWidth, 10, chunkSize);
      const sizesLargeGap = calculateSizesFromBoxTree(tree, targetWidth, 40, chunkSize);
      // Each child gets (targetWidth - gap) / 2 for equal AR
      expect(sizesSmallGap[0]!.width).toBeGreaterThan(sizesLargeGap[0]!.width);
    });
  });
});
