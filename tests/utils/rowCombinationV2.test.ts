/**
 * Unit tests for composeV2 — bottom-up adjacent merge composition.
 *
 * Covers spec §6 walked example, the two visible bug regressions
 * (panorama squashing, item-1-on-right), and the size-1/size-2 edges
 * plus the all-V / all-H orientation-penalty guards.
 */

import { LAYOUT } from '@/app/constants';
import {
  type AtomicComponent,
  hPair,
  type ImageType,
  single,
  toImageType,
  vStack,
} from '@/app/utils/rowCombination';
import { composeV2 } from '@/app/utils/rowCombinationV2';
import { createHorizontalImage, createPanorama, H, V } from '@/tests/fixtures/contentFixtures';

const DESKTOP = LAYOUT.desktopSlotWidth; // 8
const TARGET_AR = 1.5;

// ===================== Helpers =====================

/** Walk the AtomicComponent tree left-to-right and collect leaf ids. */
function leafIds(ac: AtomicComponent): number[] {
  if (ac.type === 'single') {
    return [ac.img.source.id ?? 0];
  }
  return [...leafIds(ac.children[0]), ...leafIds(ac.children[1])];
}

/** Find the depth (root=0) at which a given leaf id appears, or -1. */
function leafDepth(ac: AtomicComponent, leafId: number, depth = 0): number {
  if (ac.type === 'single') {
    return (ac.img.source.id ?? 0) === leafId ? depth : -1;
  }
  const left = leafDepth(ac.children[0], leafId, depth + 1);
  if (left >= 0) return left;
  return leafDepth(ac.children[1], leafId, depth + 1);
}

/** True if `ac` is a vStack with both children being pure-V single leaves. */
function isVStackOfPureV(ac: AtomicComponent): boolean {
  if (ac.type !== 'pair' || ac.direction !== 'V') return false;
  const [l, r] = ac.children;
  return l.type === 'single' && l.img.ar === 'V' && r.type === 'single' && r.img.ar === 'V';
}

/** True if `ac` is a top-level vStack (the row's root direction is vertical). */
function isVStackRoot(ac: AtomicComponent): boolean {
  return ac.type === 'pair' && ac.direction === 'V';
}

/** Recursively check that no node in `ac` satisfies `predicate`. */
function noNodeSatisfies(ac: AtomicComponent, predicate: (n: AtomicComponent) => boolean): boolean {
  if (predicate(ac)) return false;
  if (ac.type === 'single') return true;
  return noNodeSatisfies(ac.children[0], predicate) && noNodeSatisfies(ac.children[1], predicate);
}

/** Convert a list of fixture items to ImageType[] for composeV2. */
function asImages(items: { id: number }[]): ImageType[] {
  // Fixture items are AnyContentModel-compatible; cast through unknown to satisfy
  // the helper signature without re-importing the union type here.
  return items.map(item => toImageType(item as never, DESKTOP));
}

/** Render a compact string of the AtomicComponent tree for debugging. */
function shape(ac: AtomicComponent): string {
  if (ac.type === 'single') return `L${ac.img.source.id ?? '?'}`;
  return `${ac.direction}(${shape(ac.children[0])},${shape(ac.children[1])})`;
}

// ===================== Walked example (spec §6) =====================

describe('composeV2 — spec §6 walked example [V5, H1, V4, V3, H2]', () => {
  it('produces hPair(hPair(V5, vStack(H1, V4)), vStack(V3, H2))', () => {
    const items = [V(1, 5), H(2, 1), V(3, 4), V(4, 3), H(5, 2)];
    const imgs = asImages(items);
    const tree = composeV2(imgs, TARGET_AR, DESKTOP);

    // Build the expected tree from the same ImageType refs to guarantee deep equality.
    const [v5, h1, v4, v3, h2] = imgs;
    const expected = hPair(
      hPair(single(v5!), vStack(single(h1!), single(v4!))),
      vStack(single(v3!), single(h2!))
    );

    expect(tree).toEqual(expected);
  });

  it('preserves input order across leaves (no swaps applied)', () => {
    const items = [V(1, 5), H(2, 1), V(3, 4), V(4, 3), H(5, 2)];
    const tree = composeV2(asImages(items), TARGET_AR, DESKTOP);

    expect(leafIds(tree)).toEqual([1, 2, 3, 4, 5]);
  });
});

// ===================== Issue #1 — panorama placement =====================

describe('composeV2 — Issue #1 panorama gets a shallow cluster slot', () => {
  it('places a high-cv panorama no deeper than depth 2 from the root', () => {
    // Items: H3, panorama(rating 4), H3, H3
    // Panorama has the highest cv → should be merged last (shallow).
    const items = [H(10, 3), createPanorama(11, 4), H(12, 3), H(13, 3)];
    const tree = composeV2(asImages(items), TARGET_AR, DESKTOP);

    const depth = leafDepth(tree, 11);
    expect(depth).toBeGreaterThanOrEqual(0);
    // Depth 0 = root single (only for n=1). Depth 1 = direct child of root.
    // Depth 2 = grandchild. We require panorama to live at depth <= 2 — i.e., it
    // does not get buried inside a sub-cell on the right.
    expect(depth).toBeLessThanOrEqual(2);
  });
});

// ===================== Issue #2 — item 1 stays leftmost =====================

describe('composeV2 — Issue #2 highest-rated item-0 stays leftmost', () => {
  it('keeps the highest-rated leaf at the front of the left-DFS leaf order', () => {
    // Item 1 (H5) is highest-rated and first in input order.
    const items = [H(1, 5), V(2, 3), V(3, 3), H(4, 3)];
    const tree = composeV2(asImages(items), TARGET_AR, DESKTOP);

    const order = leafIds(tree);
    expect(order[0]).toBe(1);
  });
});

// ===================== Edge cases =====================

describe('composeV2 — edge cases', () => {
  it('n=1: returns single(items[0])', () => {
    const items = [H(1, 5)];
    const imgs = asImages(items);
    const tree = composeV2(imgs, TARGET_AR, DESKTOP);

    expect(tree).toEqual(single(imgs[0]!));
  });

  it('n=2 (H+H): picks hPair over vStack to avoid H+H stacking', () => {
    const items = [H(1, 3), H(2, 3)];
    const imgs = asImages(items);
    const tree = composeV2(imgs, TARGET_AR, DESKTOP);

    expect(tree).toEqual(hPair(single(imgs[0]!), single(imgs[1]!)));
  });

  it('n=2 (V+V): picks hPair over vStack to avoid V+V stacking', () => {
    const items = [V(1, 3), V(2, 3)];
    const imgs = asImages(items);
    const tree = composeV2(imgs, TARGET_AR, DESKTOP);

    expect(tree).toEqual(hPair(single(imgs[0]!), single(imgs[1]!)));
  });

  it('all-V row of 4: no vStack node has two pure-V single children', () => {
    const items = [V(1, 4), V(2, 3), V(3, 3), V(4, 3)];
    const tree = composeV2(asImages(items), TARGET_AR, DESKTOP);

    expect(noNodeSatisfies(tree, isVStackOfPureV)).toBe(true);
  });

  // -- Row root is always horizontal (top-level hard rule) ------------------
  // Rows are horizontal by definition. The final merge becomes the BoxTree
  // root; a vStack root creates a vertical-strip "sub-page" that breaks the
  // row's flow. Regression source: /2020-protests row 12 (HHVH) used to
  // render as `v(h(L1000,L1001), v(L1002,L1003))` even after the same-orient
  // hard-skip landed — the mixed-orient `v(V,H)` child slipped through the
  // "same orient on both children" gate. Now blocked unconditionally when
  // atoms.length === 2.

  it('all-H row of 3: tree root is hPair, not vStack', () => {
    const items = [
      createHorizontalImage(1, 3),
      createHorizontalImage(2, 3),
      createHorizontalImage(3, 3),
    ];
    const tree = composeV2(asImages(items), TARGET_AR, DESKTOP);

    expect(isVStackRoot(tree)).toBe(false);
  });

  it('all-H row of 4: tree root is hPair, not vStack', () => {
    const items = [
      createHorizontalImage(1, 4),
      createHorizontalImage(2, 3),
      createHorizontalImage(3, 3),
      createHorizontalImage(4, 3),
    ];
    const tree = composeV2(asImages(items), TARGET_AR, DESKTOP);

    expect(isVStackRoot(tree)).toBe(false);
  });

  it('all-V row of 4: tree root is hPair, not vStack', () => {
    const items = [V(1, 4), V(2, 3), V(3, 3), V(4, 3)];
    const tree = composeV2(asImages(items), TARGET_AR, DESKTOP);

    expect(isVStackRoot(tree)).toBe(false);
  });

  it('mixed-orient row (HHVH) does not produce a top-level vStack', () => {
    // Regression for /2020-protests row 12 — items 1000(H), 1001(H), 1002(V),
    // 1003(H). The earlier same-orient hard-skip let `v(h(H,H), v(V,H))`
    // through because the mixed-orient cluster on the right didn't share an
    // orient with the H-cluster on the left. Top-level rule must be
    // unconditional.
    const items = [
      createHorizontalImage(1000, 3),
      createHorizontalImage(1001, 3),
      V(1002, 3),
      createHorizontalImage(1003, 3),
    ];
    const tree = composeV2(asImages(items), TARGET_AR, DESKTOP);

    expect(isVStackRoot(tree)).toBe(false);
  });

  // -- Dominant-stacked variety emergence (positive case) ------------------
  // V1's compose-3h emits `h(v(low, low), dominant)` for all-H 3-item rows
  // by generating candidates and picking the best AR fit. Asymmetric
  // orientation cost (V+V penalized, H+H allowed) lets composeV2 emerge the
  // same pattern: the inner H+H pair wins as vStack on AR, then the top-
  // level constraint forces hPair against the remaining leaf. Without this
  // property, all-H rows collapse to uniform hChain (the 2026-05-27 regression
  // visible on /2020-protests as "uniform 3-wide").

  it('all-H row of 4 at rowWidth=12: emerges as 2×2 grid (no vStack contains another vStack)', () => {
    // High density should keep using vertical depth — but capped at 2 tiers
    // so the row forms balanced 2×N grids, not 3+ tier vertical strips.
    const items = [
      createHorizontalImage(1, 3),
      createHorizontalImage(2, 3),
      createHorizontalImage(3, 3),
      createHorizontalImage(4, 3),
    ];
    const tree = composeV2(asImages(items), TARGET_AR, 12);

    // No vStack node should contain another vStack as either child (would be 3+ tiers).
    const containsNestedVStack = (ac: AtomicComponent): boolean => {
      if (ac.type === 'single') return false;
      if (ac.direction === 'V') {
        const [l, r] = ac.children;
        const lIsVStack = l.type === 'pair' && l.direction === 'V';
        const rIsVStack = r.type === 'pair' && r.direction === 'V';
        if (lIsVStack || rIsVStack) return true;
      }
      return containsNestedVStack(ac.children[0]) || containsNestedVStack(ac.children[1]);
    };
    expect(containsNestedVStack(tree)).toBe(false);

    // For 4 H items the expected emerging shape is `h(v(L1,L2), v(L3,L4))`.
    expect(tree.type).toBe('pair');
    if (tree.type !== 'pair') throw new Error('unreachable');
    expect(tree.direction).toBe('H');
    const [left, right] = tree.children;
    const isVStackOfTwoLeaves = (n: AtomicComponent): boolean =>
      n.type === 'pair' &&
      n.direction === 'V' &&
      n.children[0].type === 'single' &&
      n.children[1].type === 'single';
    expect(isVStackOfTwoLeaves(left)).toBe(true);
    expect(isVStackOfTwoLeaves(right)).toBe(true);
  });

  it('mixed prominence row [r4, r4, r3, r3]: 3★s vStack, 4★s never inside a vStack', () => {
    // Prominence rule: no vStack contains a leaf with effRating ≥ 4. Stacking
    // a 4★ shrinks it to match the narrow column — defeats prominence. So
    // the 3★s pair up as vStack, the 4★s pair up as hPair, and the row reads
    // [4-4-[3/3]] with the 4★s visibly wider than the stacked 3★ column.
    const items = [
      createHorizontalImage(1, 4),
      createHorizontalImage(2, 4),
      createHorizontalImage(3, 3),
      createHorizontalImage(4, 3),
    ];
    const tree = composeV2(asImages(items), TARGET_AR, 12);

    // No vStack node should contain a 4★ leaf anywhere in its subtree.
    const leafIdsIn = (n: AtomicComponent): number[] =>
      n.type === 'single'
        ? [n.img.source.id ?? -1]
        : [...leafIdsIn(n.children[0]), ...leafIdsIn(n.children[1])];
    const containsProminentVStack = (n: AtomicComponent): boolean => {
      if (n.type === 'single') return false;
      if (n.direction === 'V') {
        const ids = leafIdsIn(n);
        if (ids.includes(1) || ids.includes(2)) return true;
      }
      return containsProminentVStack(n.children[0]) || containsProminentVStack(n.children[1]);
    };
    expect(containsProminentVStack(tree)).toBe(false);

    // And the row should contain a vStack of the two 3★s.
    const hasVStackOf3s = (n: AtomicComponent): boolean => {
      if (n.type !== 'pair' || n.direction !== 'V') {
        return n.type === 'pair'
          ? hasVStackOf3s(n.children[0]) || hasVStackOf3s(n.children[1])
          : false;
      }
      const ids = leafIdsIn(n);
      return ids.length === 2 && ids.includes(3) && ids.includes(4);
    };
    expect(hasVStackOf3s(tree)).toBe(true);
  });

  it('±1 displacement bound: no leaf moves more than 1 position from input order', () => {
    // Regression for the cluster-swap displacement bug. Each leaf must end
    // up at most 1 position away from its input slot, per spec P6. Cluster
    // swaps used to bypass this — a singleton swapping with a 4-leaf cluster
    // moved 4 positions in one operation while only consuming 1 swap budget.
    // 6 items chosen to give the algorithm room to build clusters that
    // could swap with singletons.
    const items = [
      createHorizontalImage(1, 3),
      createHorizontalImage(2, 4),
      createHorizontalImage(3, 3),
      createHorizontalImage(4, 3),
      createHorizontalImage(5, 4),
      V(6, 5),
    ];
    const tree = composeV2(asImages(items), TARGET_AR, 14);

    const renderedOrder = (() => {
      const out: number[] = [];
      const walk = (n: AtomicComponent): void => {
        if (n.type === 'single') {
          out.push(n.img.source.id ?? -1);
        } else {
          walk(n.children[0]);
          walk(n.children[1]);
        }
      };
      walk(tree);
      return out;
    })();

    const inputOrder = items.map(i => i.id);
    for (const id of inputOrder) {
      const inputPos = inputOrder.indexOf(id);
      const renderedPos = renderedOrder.indexOf(id);
      expect(Math.abs(renderedPos - inputPos)).toBeLessThanOrEqual(1);
    }
  });

  it('all-H row of 3: emerges as dom-stacked (root hPair with an inner vStack of two H leaves)', () => {
    const items = [
      createHorizontalImage(1, 3),
      createHorizontalImage(2, 3),
      createHorizontalImage(3, 3),
    ];
    const tree = composeV2(asImages(items), TARGET_AR, DESKTOP);

    expect(tree.type).toBe('pair');
    if (tree.type !== 'pair') throw new Error('unreachable');
    expect(tree.direction).toBe('H');

    const isVStackOfTwoHLeaves = (node: AtomicComponent): boolean =>
      node.type === 'pair' &&
      node.direction === 'V' &&
      node.children[0].type === 'single' &&
      node.children[0].img.ar === 'H' &&
      node.children[1].type === 'single' &&
      node.children[1].img.ar === 'H';

    const [leftChild, rightChild] = tree.children;
    expect(isVStackOfTwoHLeaves(leftChild) || isVStackOfTwoHLeaves(rightChild)).toBe(true);
  });

  it('does not throw and returns a valid tree for the walked example (smoke)', () => {
    const items = [V(1, 5), H(2, 1), V(3, 4), V(4, 3), H(5, 2)];
    const tree = composeV2(asImages(items), TARGET_AR, DESKTOP);
    // Sanity: shape() walks the whole tree without errors.
    expect(typeof shape(tree)).toBe('string');
  });
});
