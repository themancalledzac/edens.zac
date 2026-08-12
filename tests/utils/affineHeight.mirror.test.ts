/**
 * The composer↔sizer mirror, pinned.
 *
 * `splitLeftWidth` (rowCombination.ts) is how candidate arrangements are SCORED;
 * `solveHboxSplit` (rowStructureAlgorithm.ts) is how the winner RENDERS. Since the
 * affine-core extraction both delegate every formula to `solveEqualHeightSplit` in
 * `affineHeight.ts`, so what is left to drift — and what this suite pins — is what each
 * adapter feeds the solve: its tree walk, its leaf accessors (`numericAR` via
 * `getAspectRatio` against `getContentDimensions`), and its signature convention (the
 * composer takes the full parent width, the sizer takes width-minus-gap).
 *
 * The sweep drives ~2,000 seeded 2–5-leaf compositions of the leaf classes that can
 * appear in a pinned row (photos, pinned panels and blocks, min-width tiles) across
 * desktop-band widths and both grid gaps, asserting the two splits agree to six decimals.
 * Agreement of the splits transitively pins `heightModel ≡ computeHeightCoeffs` (the
 * solve consumes both models), and the model pair is also asserted directly for better
 * failure locality. Directed cases hit each guarded branch of the solve by construction:
 * the all-pinned declared-AR split, the one-pinned min-width band (floor-binding,
 * ceiling-binding, and a collapsed floor>ceiling band), and a pin buried two levels down.
 *
 * The PRNG is seeded (no Math.random): a failure here must reproduce, because its
 * meaning is "the two halves of the engine disagree about the same row", which is the
 * dead-space bug class — a result to investigate, never to re-roll.
 */
import type { AnyContentModel } from '@/app/types/Content';
import { heightAt } from '@/app/utils/affineHeight';
import {
  acToBoxTree,
  type AtomicComponent,
  heightModel,
  hPair,
  single,
  splitLeftWidth,
  toImageType,
  vStack,
} from '@/app/utils/rowCombination';
import { computeHeightCoeffs, solveHboxSplit } from '@/app/utils/rowStructureAlgorithm';
import { createImageContent, createPanelContent } from '@/tests/fixtures/contentFixtures';

/** toBeCloseTo(x, 6) semantics: agreement to six decimal places. */
const TOLERANCE = 0.5e-6;

/** Desktop-band widths, 390 (phone) through 1274.4 (max desktop content width). */
const WIDTHS = [390, 640, 742.4, 812, 1100, 1274.4];

/** The two shipped grid gaps (mobile 8, desktop 12.8). */
const GAPS = [8, 12.8];

/**
 * Deterministic PRNG (mulberry32). Seed chosen once; every run sweeps the identical
 * composition population.
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d_2b_79_f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Well-formed photo shapes: the classes both leaf-AR chains agree on by construction. */
const PHOTO_DIMS: Array<[number, number]> = [
  [1920, 1080],
  [1080, 1920],
  [2500, 2500],
  [3000, 1000],
  [1600, 2000],
  [1300, 867],
];

/**
 * One random leaf. The mix mirrors what a pinned row can actually carry: plain photos,
 * photos declaring a `minWidth` (nav tiles), PANEL blocks with a pinned height and
 * declared shape (admin panels), and pinned IMAGE blocks whose declared 600×1100 shape
 * deliberately disagrees with the pin — the pin must win, on both sides of the mirror.
 */
function randomLeaf(rand: () => number, id: number): AnyContentModel {
  const roll = rand();

  if (roll < 0.3) {
    const pinnedHeight = 120 + Math.floor(rand() * 980);
    return createPanelContent(id, {
      width: 400 + Math.floor(rand() * 800),
      height: 300 + Math.floor(rand() * 900),
      minHeight: pinnedHeight,
      maxHeight: pinnedHeight,
      ...(rand() < 0.5 ? { minWidth: 200 + Math.floor(rand() * 220) } : {}),
    });
  }

  if (roll < 0.45) {
    const pinnedHeight = 120 + Math.floor(rand() * 600);
    return createImageContent(id, {
      imageWidth: undefined,
      imageHeight: undefined,
      width: 600,
      height: 1100,
      minHeight: pinnedHeight,
      maxHeight: pinnedHeight,
    });
  }

  const [imageWidth, imageHeight] = PHOTO_DIMS[Math.floor(rand() * PHOTO_DIMS.length)]!;
  if (roll < 0.6) {
    return createImageContent(id, {
      imageWidth,
      imageHeight,
      minWidth: 240 + Math.floor(rand() * 200),
    });
  }
  return createImageContent(id, { imageWidth, imageHeight });
}

/** Random order-preserving binary composition; the root is a forced hPair (rows are horizontal). */
function randomComposition(
  leaves: AnyContentModel[],
  rand: () => number,
  isRoot: boolean
): AtomicComponent {
  if (leaves.length === 1) return single(toImageType(leaves[0]!));
  const split = 1 + Math.floor(rand() * (leaves.length - 1));
  const left = randomComposition(leaves.slice(0, split), rand, false);
  const right = randomComposition(leaves.slice(split), rand, false);
  if (isRoot) return hPair(left, right);
  return rand() < 0.5 ? hPair(left, right) : vStack(left, right);
}

/**
 * Assert the mirror on one composition at one (width, gap): the composer's split of the
 * FULL width equals the sizer's split of width-minus-gap, and the two height models agree
 * coefficient for coefficient. Returns a description of the disagreement, or null.
 */
function mirrorMismatch(component: AtomicComponent, width: number, gap: number): string | null {
  const tree = acToBoxTree(component);
  if (tree.type !== 'combined') throw new Error('mirror cases must be composed pairs');

  const composerSplit = splitLeftWidth(component, width, gap);
  const sizerSplit = solveHboxSplit(tree, width - gap, gap);
  if (Math.abs(composerSplit - sizerSplit) > TOLERANCE) {
    return `split W=${width} g=${gap}: composer ${composerSplit} vs sizer ${sizerSplit}`;
  }

  const composerModel = heightModel(component, gap);
  const sizerModel = computeHeightCoeffs(tree, gap);
  if (
    Math.abs(composerModel.a - sizerModel.a) > TOLERANCE ||
    Math.abs(composerModel.b - sizerModel.b) > TOLERANCE
  ) {
    return (
      `model g=${gap}: composer {a: ${composerModel.a}, b: ${composerModel.b}} ` +
      `vs sizer {a: ${sizerModel.a}, b: ${sizerModel.b}}`
    );
  }

  return null;
}

const pinnedPanel = (id: number, pinnedHeight: number, extra?: Record<string, unknown>) =>
  createPanelContent(id, {
    minHeight: pinnedHeight,
    maxHeight: pinnedHeight,
    ...extra,
  });

const photo = (id: number, extra?: Record<string, unknown>) =>
  createImageContent(id, { imageWidth: 1920, imageHeight: 1080, ...extra });

const pair = (left: AnyContentModel, right: AnyContentModel) =>
  hPair(single(toImageType(left)), single(toImageType(right)));

describe('affine-height mirror — seeded sweep', () => {
  it('agrees on the equal-height split and the height model across ~2k compositions', () => {
    const rand = mulberry32(0x02_46);
    const failures: string[] = [];
    let allPinnedRoots = 0;
    let onePinnedRoots = 0;
    let flexibleRoots = 0;

    for (let index = 0; index < 2000; index++) {
      const leafCount = 2 + Math.floor(rand() * 4);
      const leaves = Array.from({ length: leafCount }, (_, i) =>
        randomLeaf(rand, index * 10 + i + 1)
      );
      const component = randomComposition(leaves, rand, true);
      if (component.type !== 'pair') throw new Error('root must be a pair');

      const leftA = heightModel(component.children[0], GAPS[0]!).a;
      const rightA = heightModel(component.children[1], GAPS[0]!).a;
      if (leftA === 0 && rightA === 0) allPinnedRoots++;
      else if (leftA === 0 || rightA === 0) onePinnedRoots++;
      else flexibleRoots++;

      for (const gap of GAPS) {
        for (const width of WIDTHS) {
          const mismatch = mirrorMismatch(component, width, gap);
          if (mismatch) failures.push(`composition #${index}: ${mismatch}`);
        }
      }
    }

    expect(failures.slice(0, 10)).toEqual([]);

    // The sweep must actually reach every solve branch, or agreement is vacuous.
    expect(allPinnedRoots).toBeGreaterThan(50);
    expect(onePinnedRoots).toBeGreaterThan(200);
    expect(flexibleRoots).toBeGreaterThan(200);
  });
});

describe('affine-height mirror — directed branch cases', () => {
  const GAP = 12.8;

  it('all-pinned pair: both sides split the width by the DECLARED shapes', () => {
    const component = pair(
      pinnedPanel(1, 300, { width: 600, height: 1100 }),
      pinnedPanel(2, 180, { width: 1200, height: 400 })
    );

    for (const width of WIDTHS) {
      expect(mirrorMismatch(component, width, GAP)).toBeNull();

      const available = width - GAP;
      const arLeft = 600 / 1100;
      const arRight = 1200 / 400;
      const expected = available * (arLeft / (arLeft + arRight));
      expect(splitLeftWidth(component, width, GAP)).toBeCloseTo(expected, 6);
    }
  });

  it('all-pinned pair with identical pins and shapes: the declared split is half', () => {
    const component = pair(
      pinnedPanel(1, 300, { width: 600, height: 1100 }),
      pinnedPanel(2, 300, { width: 600, height: 1100 })
    );

    expect(mirrorMismatch(component, 900, GAP)).toBeNull();
    expect(splitLeftWidth(component, 900, GAP)).toBeCloseTo((900 - GAP) / 2, 6);
  });

  it('all-pinned NESTED: a stack of pins beside a pin, declared ARs combining harmonically', () => {
    const component = hPair(
      vStack(
        single(toImageType(pinnedPanel(1, 300, { width: 600, height: 1100 }))),
        single(toImageType(pinnedPanel(2, 180, { width: 800, height: 500 })))
      ),
      single(toImageType(pinnedPanel(3, 420, { width: 1200, height: 400 })))
    );

    for (const width of WIDTHS) {
      expect(mirrorMismatch(component, width, GAP)).toBeNull();
    }

    const model = heightModel(component, GAP);
    expect(model.a).toBe(0);
    expect(heightAt(model, 1000)).toBe(model.b);
  });

  it('one-pinned band, floor-binding: a tall pin beside a photo lands on the pin minWidth', () => {
    const component = pair(
      pinnedPanel(1, 1418, { width: 600, height: 1100, minWidth: 400 }),
      photo(2)
    );

    expect(mirrorMismatch(component, 900, GAP)).toBeNull();
    expect(splitLeftWidth(component, 900, GAP)).toBeCloseTo(400, 6);
  });

  it('one-pinned band, ceiling-binding: the flexible minWidth caps the pinned side', () => {
    const component = pair(
      pinnedPanel(1, 300, { width: 600, height: 1100 }),
      photo(2, { minWidth: 600 })
    );

    const width = 1274.4;
    const available = width - GAP;
    expect(mirrorMismatch(component, width, GAP)).toBeNull();
    expect(splitLeftWidth(component, width, GAP)).toBeCloseTo(available - 600, 6);
  });

  it('degenerate band, floor above ceiling: the floor wins and both sides say so', () => {
    const component = pair(
      pinnedPanel(1, 300, { width: 600, height: 1100, minWidth: 600 }),
      photo(2, { minWidth: 500 })
    );

    expect(mirrorMismatch(component, 900, GAP)).toBeNull();
    expect(splitLeftWidth(component, 900, GAP)).toBeCloseTo(600, 6);
  });

  it('a pin two levels down: the stacked-gap b-term flows through both solves identically', () => {
    const component = hPair(
      vStack(
        single(toImageType(photo(1))),
        vStack(
          single(toImageType(pinnedPanel(2, 240, { width: 600, height: 1100 }))),
          single(toImageType(photo(3, { imageWidth: 1080, imageHeight: 1920 })))
        )
      ),
      single(toImageType(photo(4)))
    );

    for (const gap of GAPS) {
      for (const width of WIDTHS) {
        expect(mirrorMismatch(component, width, gap)).toBeNull();
      }
    }
  });

  it('pure photos: the pre-pin solve is the same solve on both sides', () => {
    const component = hPair(
      pair(photo(1), photo(2, { imageWidth: 1080, imageHeight: 1920 })),
      single(toImageType(photo(3, { imageWidth: 3000, imageHeight: 1000 })))
    );

    for (const gap of GAPS) {
      for (const width of WIDTHS) {
        expect(mirrorMismatch(component, width, gap)).toBeNull();
      }
    }
  });
});
