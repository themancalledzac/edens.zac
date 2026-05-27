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

/** True if `ac` is a vStack with both children being pure-H single leaves. */
function isVStackOfPureH(ac: AtomicComponent): boolean {
  if (ac.type !== 'pair' || ac.direction !== 'V') return false;
  const [l, r] = ac.children;
  return l.type === 'single' && l.img.ar === 'H' && r.type === 'single' && r.img.ar === 'H';
}

/**
 * Recursive "effective orientation" of a subtree:
 * - single leaf → that leaf's orientation ('H' or 'V')
 * - pair where both children's effective orient agree (and aren't 'M') → that orient
 * - otherwise → 'M' (mixed)
 *
 * This is the same propagation rule the merge loop should use internally so
 * the vStack same-orient penalty applies to clusters, not just leaves.
 */
function effectiveOrient(ac: AtomicComponent): 'H' | 'V' | 'M' {
  if (ac.type === 'single') return ac.img.ar;
  const l = effectiveOrient(ac.children[0]);
  const r = effectiveOrient(ac.children[1]);
  return l === r && l !== 'M' ? l : 'M';
}

/**
 * True if `ac` is a vStack whose two SUBTREES are predominantly the same
 * orientation. Catches `vStack(hPair(H,H), single(H))` etc., not just
 * `vStack(leaf, leaf)`.
 */
function isSameOrientVStack(ac: AtomicComponent): boolean {
  if (ac.type !== 'pair' || ac.direction !== 'V') return false;
  const l = effectiveOrient(ac.children[0]);
  const r = effectiveOrient(ac.children[1]);
  return l === r && l !== 'M';
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

  it('all-H row of 4: no vStack node has two pure-H single children', () => {
    const items = [
      createHorizontalImage(1, 4),
      createHorizontalImage(2, 3),
      createHorizontalImage(3, 3),
      createHorizontalImage(4, 3),
    ];
    const tree = composeV2(asImages(items), TARGET_AR, DESKTOP);

    expect(noNodeSatisfies(tree, isVStackOfPureH)).toBe(true);
  });

  // -- Regression: /2020-protests bug 2026-05-27 -------------------------
  // The leaf-only checks above missed the case where one side of a vStack
  // is itself a cluster of same-orientation leaves. composeV2 was producing
  // `vStack(hPair(H,H), single(H))` for all-H rows because the orientation
  // penalty in `scoreMerge` excluded merged clusters (orient='M'). The
  // user-visible effect was a page of "1-image on top, 2-images below"
  // pseudo-rows where the spec calls for horizontal chains.
  //
  // Strengthened to walk subtree orientations recursively.

  it('all-H row of 3: no vStack node has two same-orient subtrees (cluster or leaf)', () => {
    const items = [
      createHorizontalImage(1, 3),
      createHorizontalImage(2, 3),
      createHorizontalImage(3, 3),
    ];
    const tree = composeV2(asImages(items), TARGET_AR, DESKTOP);

    expect(noNodeSatisfies(tree, isSameOrientVStack)).toBe(true);
  });

  it('all-H row of 4: no vStack node has two same-orient subtrees (cluster or leaf)', () => {
    const items = [
      createHorizontalImage(1, 4),
      createHorizontalImage(2, 3),
      createHorizontalImage(3, 3),
      createHorizontalImage(4, 3),
    ];
    const tree = composeV2(asImages(items), TARGET_AR, DESKTOP);

    expect(noNodeSatisfies(tree, isSameOrientVStack)).toBe(true);
  });

  it('all-V row of 4: no vStack node has two same-orient subtrees (cluster or leaf)', () => {
    const items = [V(1, 4), V(2, 3), V(3, 3), V(4, 3)];
    const tree = composeV2(asImages(items), TARGET_AR, DESKTOP);

    expect(noNodeSatisfies(tree, isSameOrientVStack)).toBe(true);
  });

  it('does not throw and returns a valid tree for the walked example (smoke)', () => {
    const items = [V(1, 5), H(2, 1), V(3, 4), V(4, 3), H(5, 2)];
    const tree = composeV2(asImages(items), TARGET_AR, DESKTOP);
    // Sanity: shape() walks the whole tree without errors.
    expect(typeof shape(tree)).toBe('string');
  });
});
