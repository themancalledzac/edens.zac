/**
 * Unit tests for composeV3 — two-phase composition with AR-driven direction.
 *
 * These cover the behaviours that drove V3's design: input order is preserved,
 * dom-stacked variety emerges on all-H rows without an explicit rule, V+V
 * vStacks are NOT produced on all-V rows because their AR is too far from
 * target, and the user's row-7 example resolves the way the AR math predicts.
 */

import { LAYOUT } from '@/app/constants';
import { acToBoxTree, type AtomicComponent, toImageType } from '@/app/utils/rowCombination';
import { composeV3 } from '@/app/utils/rowCombinationV3';
import {
  calculateBoxTreeAspectRatio,
  calculateSizesFromBoxTree,
} from '@/app/utils/rowStructureAlgorithm';
import {
  createHorizontalImage,
  createImageContent,
  createVerticalImage,
} from '@/tests/fixtures/contentFixtures';

const DESKTOP = LAYOUT.desktopSlotWidth;
const TARGET_AR = 1.5;

/** Render the tree shape as `h(L1,v(L2,L3))` for assertion readability. */
function shapeOf(ac: AtomicComponent): string {
  if (ac.type === 'single') return `L${ac.img.source.id ?? '?'}`;
  const dir = ac.direction === 'H' ? 'h' : 'v';
  return `${dir}(${shapeOf(ac.children[0])},${shapeOf(ac.children[1])})`;
}

/** Flatten leaves left-to-right for order-preservation checks. */
function leafIds(ac: AtomicComponent): number[] {
  if (ac.type === 'single') {
    const id = ac.img.source.id;
    if (typeof id !== 'number') throw new Error('leaf has no numeric id');
    return [id];
  }
  return [...leafIds(ac.children[0]), ...leafIds(ac.children[1])];
}

describe('composeV3 — degenerate cases', () => {
  it('returns a single() for one image', () => {
    const img = toImageType(createHorizontalImage(1, 3), DESKTOP);
    const result = composeV3([img], TARGET_AR, DESKTOP);
    expect(result.type).toBe('single');
    if (result.type === 'single') expect(result.img.source.id).toBe(1);
  });

  it('returns hPair at the root for two images regardless of orientations', () => {
    const items = [createHorizontalImage(1, 3), createVerticalImage(2, 3)].map(it =>
      toImageType(it, DESKTOP)
    );
    const result = composeV3(items, TARGET_AR, DESKTOP);
    expect(result.type).toBe('pair');
    if (result.type === 'pair') expect(result.direction).toBe('H');
    expect(leafIds(result)).toEqual([1, 2]);
  });
});

describe('composeV3 — input order is preserved', () => {
  it('leaves the row 7 of /2020-protests in input order [1004,1005,1006,1007]', () => {
    // Row 7 from the 2026-05-27 layout trace at density 10:
    // input cv: 3.5, 3.196, 2.282, 2.415; ARs: 1.503, 1.251, 1.25, 0.714
    const items = [
      createImageContent(1004, { imageWidth: 1503, imageHeight: 1000, rating: 4 }),
      createImageContent(1005, { imageWidth: 1251, imageHeight: 1000, rating: 4 }),
      createImageContent(1006, { imageWidth: 1250, imageHeight: 1000, rating: 3 }),
      createImageContent(1007, { imageWidth: 714, imageHeight: 1000, rating: 5 }),
    ].map(it => toImageType(it, 14));
    const result = composeV3(items, TARGET_AR, 14);
    expect(leafIds(result)).toEqual([1004, 1005, 1006, 1007]);
  });

  it('preserves order on a 6-item all-H row', () => {
    const items = [1, 2, 3, 4, 5, 6]
      .map(id => createHorizontalImage(id, 3))
      .map(it => toImageType(it, DESKTOP));
    const result = composeV3(items, TARGET_AR, DESKTOP);
    expect(leafIds(result)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('composeV3 — emergence without rules', () => {
  it('produces a dom-stacked shape (not a flat 3-wide hChain) for 3 same-rated H images', () => {
    // 3 H4★ images at desktop target 1.5 — a flat hChain has AR ≈ 5.3,
    // dom-stacked variant h(v(H,H), H) has AR ≈ 2.7 (much closer).
    const items = [1, 2, 3]
      .map(id => createHorizontalImage(id, 4))
      .map(it => toImageType(it, DESKTOP));
    const result = composeV3(items, TARGET_AR, DESKTOP);
    expect(result.type).toBe('pair');
    if (result.type !== 'pair') return;
    expect(result.direction).toBe('H');
    // Tree should contain at least one vStack node (the dom-stacked column).
    const shape = shapeOf(result);
    expect(shape).toContain('v(');
  });

  it('produces a flat hChain on an all-V row of 3 items (no V+V vStack)', () => {
    // 3 V3★ images. vStack of two V atoms is roughly square (AR≈0.5),
    // unattractive vs target 1.5. The algorithm should keep them flat.
    const items = [1, 2, 3]
      .map(id => createVerticalImage(id, 3))
      .map(it => toImageType(it, DESKTOP));
    const result = composeV3(items, TARGET_AR, DESKTOP);
    const shape = shapeOf(result);
    // No 'v(' substring → all internal nodes are hPair.
    expect(shape).not.toContain('v(');
  });

  it('produces a 2x2 grid when 4 same-rated H items are given (target 1.5)', () => {
    // [H,H,H,H] all rating 3, AR 1.78 each.
    // Flat hChain AR ≈ 7.1 (way above target).
    // 2x2 grid h(v(H,H), v(H,H)) AR ≈ 1.78 — much closer to target 1.5.
    const items = [1, 2, 3, 4]
      .map(id => createHorizontalImage(id, 3))
      .map(it => toImageType(it, DESKTOP));
    const result = composeV3(items, TARGET_AR, DESKTOP);
    expect(result.type).toBe('pair');
    if (result.type !== 'pair') return;
    expect(result.direction).toBe('H');
    // Both children should be vStacks → 2x2 grid emerges.
    expect(result.children[0].type).toBe('pair');
    expect(result.children[1].type).toBe('pair');
    if (result.children[0].type === 'pair') {
      expect(result.children[0].direction).toBe('V');
    }
    if (result.children[1].type === 'pair') {
      expect(result.children[1].direction).toBe('V');
    }
  });
});

describe('composeV3 — AR fitness', () => {
  it('produces a row AR within reasonable bounds of the target', () => {
    // For a typical mixed row, V3 should produce a tree whose AR is within
    // a factor of ~3 of the target. This is loose because no single tree
    // shape can always hit 1.5 exactly, but it should never produce
    // pathological shapes (AR > 10 or AR < 0.2).
    const items = [
      createHorizontalImage(1, 4),
      createHorizontalImage(2, 3),
      createVerticalImage(3, 4),
      createHorizontalImage(4, 3),
    ].map(it => toImageType(it, DESKTOP));
    const result = composeV3(items, TARGET_AR, DESKTOP);
    const ar = calculateBoxTreeAspectRatio(acToBoxTree(result), DESKTOP);
    expect(ar).toBeGreaterThan(0.5);
    expect(ar).toBeLessThan(5.0);
  });

  it('forces hPair at the root even when a vStack would be closer to target', () => {
    // Two H images. hPair AR ≈ 3.56, vStack AR ≈ 0.89. Target 1.5.
    // vStack is closer to target (distance 0.61 vs 2.06) but rows are
    // horizontal by definition, so root MUST be hPair.
    const items = [1, 2]
      .map(id => createHorizontalImage(id, 3))
      .map(it => toImageType(it, DESKTOP));
    const result = composeV3(items, TARGET_AR, DESKTOP);
    expect(result.type).toBe('pair');
    if (result.type === 'pair') expect(result.direction).toBe('H');
  });

  it('lands close to target 1.0 on a high-density mixed-orient row', () => {
    // Simulates /2020-protests row 6 (8 items mixed V+H at rowWidth=14).
    // V3 enumerates direction assignments and picks the candidate closest to
    // square that still satisfies the floor (AR >= 1.0, never taller than wide).
    const items = [
      createVerticalImage(1, 4),
      createVerticalImage(2, 4),
      createVerticalImage(3, 3),
      createImageContent(4, { imageWidth: 1503, imageHeight: 1000, rating: 3 }),
      createImageContent(5, { imageWidth: 2000, imageHeight: 1000, rating: 3 }),
      createVerticalImage(6, 3),
      createImageContent(7, { imageWidth: 1250, imageHeight: 1000, rating: 3 }),
      createImageContent(8, { imageWidth: 1503, imageHeight: 1000, rating: 4 }),
    ].map(it => toImageType(it, 14));
    const result = composeV3(items, 1.0, 14);
    const ar = calculateBoxTreeAspectRatio(acToBoxTree(result), 14);
    // Floor guarantees AR >= 1.0 (never taller than wide); upper bound asserts
    // the row stays reasonably close to square, not pathologically wide.
    expect(ar).toBeGreaterThanOrEqual(1.0);
    expect(ar).toBeLessThan(1.5);
  });

  it('keeps row AR >= target on a 6-item all-H row with target 1.0', () => {
    // 6 H images at AR 1.5 each. The "ideal" near-square shape would put 3
    // vStack pairs side by side (AR=2.67) or 2 vStack-of-3s (AR=1.0). The
    // algorithm should pick something AT OR ABOVE 1.0, never below.
    const items = [1, 2, 3, 4, 5, 6]
      .map(id => createHorizontalImage(id, 3))
      .map(it => toImageType(it, 14));
    const result = composeV3(items, 1.0, 14);
    const ar = calculateBoxTreeAspectRatio(acToBoxTree(result), 14);
    expect(ar).toBeGreaterThanOrEqual(1.0);
  });

  it('lands near 1.0 (not far above) on a 6-item all-H row with target 1.0', () => {
    // Stronger version of the previous test: enumeration should find a
    // candidate whose AR is close to 1.0, not just barely above. For 6 H
    // items at AR 1.78 each (createHorizontalImage default), an unconstrained
    // algorithm might land at AR > 2.5 (e.g. 3 vStack pairs); enumeration
    // should find the shape that's closest to target 1.0 while staying ≥ 1.0.
    const items = [1, 2, 3, 4, 5, 6]
      .map(id => createHorizontalImage(id, 3))
      .map(it => toImageType(it, 14));
    const result = composeV3(items, 1.0, 14);
    const ar = calculateBoxTreeAspectRatio(acToBoxTree(result), 14);
    // Should land within ~50% of target — far better than V2's ~3x overshoot.
    expect(ar).toBeLessThan(1.6);
  });

  it('builds a balanced [[H,H],[V,V]] tree for two H + two V at same rating', () => {
    // The /a-mariners-game row 0 case: 4 items rated 3 with mixed orientation.
    // Old sum-cv merge produced [H, [H, [V, V]]] (right-spine with one H
    // dominating). Point-balance splits at the H/V boundary (equal-effRating
    // halves) → balanced 2x2 grid → all 4 items at depth 2.
    const items = [
      createHorizontalImage(693, 3),
      createHorizontalImage(680, 3),
      createVerticalImage(662, 3),
      createVerticalImage(663, 3),
    ].map(it => toImageType(it, 8));
    const result = composeV3(items, 1.0, 8);
    // Tree shape: h(<left-cluster>, <right-cluster>); both clusters are
    // 2-leaf merges. Each H pairs with its sibling, each V pairs with its
    // sibling.
    expect(result.type).toBe('pair');
    if (result.type !== 'pair') return;
    expect(result.direction).toBe('H');
    const [leftChild, rightChild] = result.children;
    expect(leftChild.type).toBe('pair');
    expect(rightChild.type).toBe('pair');
    if (leftChild.type === 'pair' && leftChild.children[0].type === 'single') {
      expect(leftChild.children[0].img.source.id).toBe(693);
    }
    if (leftChild.type === 'pair' && leftChild.children[1].type === 'single') {
      expect(leftChild.children[1].img.source.id).toBe(680);
    }
    if (rightChild.type === 'pair' && rightChild.children[0].type === 'single') {
      expect(rightChild.children[0].img.source.id).toBe(662);
    }
    if (rightChild.type === 'pair' && rightChild.children[1].type === 'single') {
      expect(rightChild.children[1].img.source.id).toBe(663);
    }
  });

  it('keeps the /a-mariners-game row 0 (2V+2H) at AR >= 1.0, rejecting the sub-1.0 nested-quad', () => {
    // Floor enforcement (user decision 2026-05-28). Real row-0 content:
    // [V5 ar0.665, H3 ar1.25, V5 ar0.665, H4 ar1.601]. Point-balance → [[V,H],[V,H]].
    // The squarest Phase-2 candidate is h(v(V,H),v(V,H)) at AR ~0.904, but a row
    // must never be taller than wide, so the floor rejects it and V3 picks the
    // closest >= 1.0 candidate (h(h(V,H),v(V,H)) at AR ~2.385) instead. This is a
    // non-vacuous guard: a real sub-1.0 candidate exists and is excluded.
    const items = [
      createImageContent(720, { imageWidth: 665, imageHeight: 1000, rating: 5 }),
      createImageContent(709, { imageWidth: 1250, imageHeight: 1000, rating: 3 }),
      createImageContent(695, { imageWidth: 665, imageHeight: 1000, rating: 5 }),
      createImageContent(727, { imageWidth: 1601, imageHeight: 1000, rating: 4 }),
    ].map(it => toImageType(it, 10));
    const result = composeV3(items, 1.0, 10);
    const ar = calculateBoxTreeAspectRatio(acToBoxTree(result), 10);
    expect(ar).toBeGreaterThanOrEqual(1.0);
  });

  it('builds a balanced [[H4,H4],[H3,V5]] tree for the user-described 4-item row', () => {
    // [H4★, H4★, H3★, V5★] effectiveRatings = [4, 4, 3, 4] = 15 total.
    // Splits: idx 0 → 4|11 (diff 14), idx 1 → 8|7 (diff 2), idx 2 → 11|4 (diff 14).
    // Best is idx 1 → balanced grid [[H4,H4],[H3,V5]] with all 4 leaves at depth 2.
    // Per user's revised mental model: tree-depth balance over outlier isolation.
    const items = [
      createImageContent(1004, { imageWidth: 1503, imageHeight: 1000, rating: 4 }),
      createImageContent(1005, { imageWidth: 1251, imageHeight: 1000, rating: 4 }),
      createImageContent(1006, { imageWidth: 1250, imageHeight: 1000, rating: 3 }),
      createImageContent(1007, { imageWidth: 714, imageHeight: 1000, rating: 5 }),
    ].map(it => toImageType(it, 14));
    const result = composeV3(items, 1.0, 14);
    expect(result.type).toBe('pair');
    if (result.type !== 'pair') return;
    const [leftChild, rightChild] = result.children;
    // Left cluster: [1004, 1005] both rendered as a 2-leaf pair.
    expect(leftChild.type).toBe('pair');
    if (leftChild.type === 'pair') {
      if (leftChild.children[0].type === 'single') {
        expect(leftChild.children[0].img.source.id).toBe(1004);
      }
      if (leftChild.children[1].type === 'single') {
        expect(leftChild.children[1].img.source.id).toBe(1005);
      }
    }
    // Right cluster: [1006, 1007] both rendered as a 2-leaf pair.
    expect(rightChild.type).toBe('pair');
    if (rightChild.type === 'pair') {
      if (rightChild.children[0].type === 'single') {
        expect(rightChild.children[0].img.source.id).toBe(1006);
      }
      if (rightChild.children[1].type === 'single') {
        expect(rightChild.children[1].img.source.id).toBe(1007);
      }
    }
  });

  it('builds a balanced [[V4,H4],[H2,V2]] tree for row 3 of /a-mariners-game', () => {
    // The failure case surfaced 2026-05-28: items [V4★, H4★, H2★, V2★] with
    // AR-gap split produced `h(v(L660, h(L667, L665)), L685)` — a 2★ vertical
    // alone at root, getting full prominence over the 4★ items.
    // effectiveRatings = [3, 4, 2, 1] = 10 total.
    // idx 0 → 3|7 (diff 4), idx 1 → 7|3 (diff 4), idx 2 → 9|1 (diff 8).
    // Tied at idx 0/idx 1; middle tiebreak picks idx 1 → [[V4,H4],[H2,V2]].
    // All 4 items at depth 2 — visual sizes determined by direction choice,
    // not by tree position.
    const items = [
      createImageContent(660, { imageWidth: 666, imageHeight: 1000, rating: 4 }),
      createImageContent(667, { imageWidth: 1250, imageHeight: 1000, rating: 4 }),
      createImageContent(665, { imageWidth: 1251, imageHeight: 1000, rating: 2 }),
      createImageContent(685, { imageWidth: 666, imageHeight: 1000, rating: 2 }),
    ].map(it => toImageType(it, 8));
    const result = composeV3(items, 1.0, 8);
    expect(result.type).toBe('pair');
    if (result.type !== 'pair') return;
    const [leftChild, rightChild] = result.children;
    expect(leftChild.type).toBe('pair');
    expect(rightChild.type).toBe('pair');
    if (leftChild.type === 'pair') {
      if (leftChild.children[0].type === 'single') {
        expect(leftChild.children[0].img.source.id).toBe(660);
      }
      if (leftChild.children[1].type === 'single') {
        expect(leftChild.children[1].img.source.id).toBe(667);
      }
    }
    if (rightChild.type === 'pair') {
      if (rightChild.children[0].type === 'single') {
        expect(rightChild.children[0].img.source.id).toBe(665);
      }
      if (rightChild.children[1].type === 'single') {
        expect(rightChild.children[1].img.source.id).toBe(685);
      }
    }
  });

  it('builds a middle-split tree for 6 uniform-AR items (balanced depth)', () => {
    // All 6 items have identical AR → all adjacent gaps tied at zero.
    // Tiebreaker picks the gap closest to the middle, producing balanced
    // recursive splits. Result: every leaf at depth 3 (perfectly balanced
    // for 6 items isn't possible — 4 at depth 3, 2 at depth 3 — but all
    // splits happen at middles).
    const items = [1, 2, 3, 4, 5, 6]
      .map(id => createHorizontalImage(id, 3))
      .map(it => toImageType(it, 14));
    const result = composeV3(items, 1.0, 14);
    expect(result.type).toBe('pair');
    if (result.type !== 'pair') return;
    // Root should split 3|3, not 1|5 or 5|1.
    const leafCount = (ac: typeof result | (typeof result.children)[0]): number => {
      if (ac.type === 'single') return 1;
      return leafCount(ac.children[0]) + leafCount(ac.children[1]);
    };
    const leftLeaves = leafCount(result.children[0]);
    const rightLeaves = leafCount(result.children[1]);
    expect(leftLeaves).toBe(3);
    expect(rightLeaves).toBe(3);
  });

  it('lands near square on row 6 of /2020-protests (8 mixed H+V items)', () => {
    // 8 mixed H+V items. With both orientations available, the squarest
    // candidate that satisfies the floor (AR >= 1.0, never taller than wide)
    // lands just above square.
    const items = [
      createVerticalImage(1, 4),
      createVerticalImage(2, 4),
      createVerticalImage(3, 3),
      createImageContent(4, { imageWidth: 1503, imageHeight: 1000, rating: 3 }),
      createImageContent(5, { imageWidth: 2000, imageHeight: 1000, rating: 3 }),
      createVerticalImage(6, 3),
      createImageContent(7, { imageWidth: 1250, imageHeight: 1000, rating: 3 }),
      createImageContent(8, { imageWidth: 1503, imageHeight: 1000, rating: 4 }),
    ].map(it => toImageType(it, 14));
    const result = composeV3(items, 1.0, 14);
    const ar = calculateBoxTreeAspectRatio(acToBoxTree(result), 14);
    // Floor keeps it >= 1.0; the equity tiebreak may pick a slightly wider tree
    // than the pure AR-optimum (within AR_EQUITY_BAND) when it sizes the images
    // more evenly — so the upper bound allows a little above target.
    expect(ar).toBeGreaterThanOrEqual(1.0);
    expect(ar).toBeLessThan(1.4);
  });
});

describe('composeV3 — equitable sizing', () => {
  it('sizes equal-rated images comparably in a mixed row (no runaway dominance)', () => {
    // /chamonix?layout=v3 density 8 (rowWidth 20) row 0: a 7-item row that was
    // rendering one 4★ image ~25× larger than two other 4★ images, because
    // Phase 2 optimised only the row AR and let one subtree go narrow (cramming
    // its images) while another went wide. The Phase 2 equity tiebreak should
    // keep equal-rated images within a sane size ratio.
    const items = [
      createImageContent(754, { imageWidth: 1501, imageHeight: 1000, rating: 2 }),
      createImageContent(762, { imageWidth: 666, imageHeight: 1000, rating: 4 }),
      createImageContent(1216, { imageWidth: 1452, imageHeight: 1000, rating: 4 }),
      createImageContent(765, { imageWidth: 1501, imageHeight: 1000, rating: 4 }),
      createImageContent(753, { imageWidth: 1501, imageHeight: 1000, rating: 4 }),
      createImageContent(760, { imageWidth: 1501, imageHeight: 1000, rating: 4 }),
      createImageContent(761, { imageWidth: 1501, imageHeight: 1000, rating: 4 }),
    ].map(it => toImageType(it, 20));
    const result = composeV3(items, 1.457, 20);
    const sizes = calculateSizesFromBoxTree(acToBoxTree(result), 1215, LAYOUT.gridGap, 20);

    // The five horizontal 4★ images should render at comparable sizes; pre-fix
    // the biggest was ~25× the smallest.
    const fourStarHIds = new Set([1216, 765, 753, 760, 761]);
    const areas = sizes
      .filter(s => {
        const id = (s.content as { id?: number }).id;
        return id !== undefined && fourStarHIds.has(id);
      })
      .map(s => s.width * s.height);
    expect(areas).toHaveLength(5);
    const ratio = Math.max(...areas) / Math.min(...areas);
    expect(ratio).toBeLessThan(8);
  });
});
