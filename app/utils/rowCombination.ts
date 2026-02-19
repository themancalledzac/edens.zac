/**
 * Row Combination - Template Map Row Building
 *
 * Uses a (hCount, vCount) template map to determine layout structure for each row.
 * Greedy sequential fill determines which items go in each row; the template map
 * determines how those items are arranged (flat chain, DVP, nested quad, etc.).
 *
 * Key concepts:
 * - A "component" is anything that occupies row space: a single image, gif, text, or combined block.
 * - Component value = proportion of row width an item occupies (effectiveRating / rowWidth).
 * - A row is "complete" when total component values >= 0.9 (90% threshold).
 * - Templates are keyed by orientation counts and produce AtomicComponent trees.
 */

import type { AnyContentModel } from '@/app/types/Content';
import {
  getEffectiveRating,
  getItemComponentValue,
} from '@/app/utils/contentRatingUtils';
import { getAspectRatio } from '@/app/utils/contentTypeGuards';

// =============================================================================
// TYPES
// =============================================================================

/** Orientation classification */
export type Orientation = 'horizontal' | 'vertical';

/** Recursive tree structure for rendering combinations */
export type BoxTree =
  | { type: 'leaf'; content: AnyContentModel }
  | {
      type: 'combined';
      direction: 'horizontal' | 'vertical';
      children: [BoxTree, BoxTree];
    };

// =============================================================================
// COMBINATION PATTERN ENUM (backward compatibility — removed in Phase 2)
// =============================================================================

export enum CombinationPattern {
  STANDALONE = 'STANDALONE',
  HORIZONTAL_PAIR = 'HORIZONTAL_PAIR',
  VERTICAL_PAIR = 'VERTICAL_PAIR',
  DOMINANT_SECONDARY = 'DOMINANT_SECONDARY',
  TRIPLE_HORIZONTAL = 'TRIPLE_HORIZONTAL',
  MULTI_SMALL = 'MULTI_SMALL',
  DOMINANT_VERTICAL_PAIR = 'DOMINANT_VERTICAL_PAIR',
  FORCE_FILL = 'FORCE_FILL',
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the orientation of a content item.
 * Horizontal: aspect ratio > 1.0
 * Vertical: aspect ratio <= 1.0 (includes square)
 */
export function getOrientation(item: AnyContentModel): Orientation {
  const ar = getAspectRatio(item);
  return ar > 1.0 ? 'horizontal' : 'vertical';
}

/**
 * Get the effective rating for a content item in the context of row building.
 */
function getItemRating(item: AnyContentModel, rowWidth: number): number {
  return getEffectiveRating(item, rowWidth);
}

/**
 * Calculate the total component value of a set of items.
 */
function getTotalCV(components: AnyContentModel[], rowWidth: number): number {
  return components.reduce(
    (sum, item) => sum + getItemComponentValue(item, rowWidth),
    0
  );
}

// =============================================================================
// isRowComplete
// =============================================================================

/** Minimum fill ratio for a row to be considered complete */
export const MIN_FILL_RATIO = 0.9;
/** Maximum fill ratio — rows exceeding this are rejected to prevent item squeezing */
export const MAX_FILL_RATIO = 1.15;

/**
 * Check if a set of components fills a row within acceptable bounds.
 *
 * A row is "complete" when fill is between 90% and 115% of row width.
 *
 * @param components - Items to check
 * @param rowWidth - Row width budget (e.g., 5 for desktop)
 * @returns true if total component value is within 90-115% of row width
 */
export function isRowComplete(
  components: AnyContentModel[],
  rowWidth: number
): boolean {
  if (components.length === 0) return false;

  const totalValue = components.reduce(
    (sum, item) => sum + getItemComponentValue(item, rowWidth),
    0
  );

  const fill = totalValue / rowWidth;
  return fill >= MIN_FILL_RATIO && fill <= MAX_FILL_RATIO;
}

// =============================================================================
// ROW RESULT
// =============================================================================

/** A row result from the row-building algorithm */
export interface RowResult {
  components: AnyContentModel[];
  direction: 'horizontal' | 'vertical' | null;
  patternName: CombinationPattern;
  boxTree: BoxTree;
}

// =============================================================================
// ARCHITECTURE TYPES
// =============================================================================

/** Orientation shorthand for composition decisions */
export type OrientationShort = 'H' | 'V';

/** Thin view over AnyContentModel — pre-computed fields for composition */
export interface ImageType {
  source: AnyContentModel;
  title: string;
  ar: OrientationShort;
  effectiveRating: number;
  componentValue: number;
}

/** Recursive composition structure */
export type AtomicComponent =
  | { type: 'single'; img: ImageType }
  | {
      type: 'pair';
      direction: OrientationShort;
      children: [AtomicComponent, AtomicComponent];
    };

/** Row building state — for debugging and inspection */
export interface TreeNodeState {
  images: ImageType[];
  currentValue: number;
  maxValue: number;
}

/** A completed row with composition and state */
export interface TreeNode {
  state: TreeNodeState;
  composition: AtomicComponent;
}

// =============================================================================
// ARCHITECTURE HELPERS
// =============================================================================

/** Convert AnyContentModel to ImageType for composition decisions */
export function toImageType(
  item: AnyContentModel,
  rowWidth: number
): ImageType {
  const ar: OrientationShort = getAspectRatio(item) > 1.0 ? 'H' : 'V';
  const effectiveRating = getEffectiveRating(item, rowWidth);
  const componentValue = getItemComponentValue(item, rowWidth);
  const title = 'title' in item ? String(item.title) : `item-${item.id}`;

  return { source: item, title, ar, effectiveRating, componentValue };
}

/** Create a single-image AtomicComponent */
export function single(img: ImageType): AtomicComponent {
  return { type: 'single', img };
}

/** Create a horizontal pair */
export function hPair(
  left: AtomicComponent,
  right: AtomicComponent
): AtomicComponent {
  return { type: 'pair', direction: 'H', children: [left, right] };
}

/** Create a vertical stack */
export function vStack(
  top: AtomicComponent,
  bottom: AtomicComponent
): AtomicComponent {
  return { type: 'pair', direction: 'V', children: [top, bottom] };
}

/** Create a left-heavy horizontal chain from 2+ images */
export function hChain(images: ImageType[]): AtomicComponent {
  if (images.length === 0) {
    throw new Error('hChain requires at least 1 image');
  }
  if (images.length === 1) {
    return single(images[0]!);
  }

  let tree: AtomicComponent = hPair(single(images[0]!), single(images[1]!));
  for (let i = 2; i < images.length; i++) {
    tree = hPair(tree, single(images[i]!));
  }
  return tree;
}

/** Convert AtomicComponent tree to BoxTree for rendering */
export function acToBoxTree(ac: AtomicComponent): BoxTree {
  if (ac.type === 'single') {
    return { type: 'leaf', content: ac.img.source };
  }
  return {
    type: 'combined',
    direction: ac.direction === 'H' ? 'horizontal' : 'vertical',
    children: [acToBoxTree(ac.children[0]), acToBoxTree(ac.children[1])],
  };
}

/** Find the dominant image in a set (highest effective rating) */
export function findDominant(
  images: ImageType[]
): { dominant: ImageType; rest: ImageType[] } {
  if (images.length === 0) {
    throw new Error('findDominant requires at least 1 image');
  }
  let dominantIdx = 0;
  for (let i = 1; i < images.length; i++) {
    if (images[i]!.effectiveRating > images[dominantIdx]!.effectiveRating) {
      dominantIdx = i;
    }
  }
  const dominant = images[dominantIdx]!;
  const rest = images.filter((_, i) => i !== dominantIdx);
  return { dominant, rest };
}

/** Generate the template map key for a set of images: "hCount-vCount" */
export function getTemplateKey(images: ImageType[]): string {
  let h = 0;
  let v = 0;
  for (const img of images) {
    if (img.ar === 'H') h++;
    else v++;
  }
  return `${h}-${v}`;
}

// =============================================================================
// TEMPLATE MAP
// =============================================================================

/** A layout template that builds an AtomicComponent from a set of ImageTypes */
interface LayoutTemplate {
  label: string;
  build: (images: ImageType[]) => AtomicComponent;
}

/**
 * Build a dominant-stacked composition: H(dominant, V(rest[0], rest[1]))
 * Used when a high-rated horizontal image dominates 2 secondaries.
 * Falls back to flat hChain if no dominant H with effectiveRating >= 4.
 */
function buildDominantStacked(images: ImageType[]): AtomicComponent {
  const { dominant, rest } = findDominant(images);
  if (dominant.effectiveRating >= 4 && dominant.ar === 'H') {
    return hPair(
      single(dominant),
      vStack(single(rest[0]!), single(rest[1]!))
    );
  }
  return hChain(images);
}

/**
 * Build a nested-quad composition: H(main, V(H(topPair), bottom))
 * Used when 4 items have 3+ verticals — dominant vertical gets full height.
 * Falls back to flat hChain if < 3 verticals.
 */
function buildNestedQuad(images: ImageType[]): AtomicComponent {
  const verticals = images.filter((i) => i.ar === 'V');
  if (verticals.length >= 3) {
    const sorted = [...verticals].sort(
      (a, b) => b.effectiveRating - a.effectiveRating
    );
    const main = sorted[0]!;
    const rest = images.filter((i) => i !== main);
    const restVerticals = rest
      .filter((i) => i.ar === 'V')
      .sort((a, b) => a.effectiveRating - b.effectiveRating);
    const topPair = restVerticals.slice(0, 2);
    const bottom = rest.find((i) => !topPair.includes(i))!;

    return hPair(
      single(main),
      vStack(
        hPair(single(topPair[0]!), single(topPair[1]!)),
        single(bottom)
      )
    );
  }
  return hChain(images);
}

/** Static template map: (hCount, vCount) → layout builder */
export const TEMPLATE_MAP: Record<string, LayoutTemplate> = {
  // --- 1-item ---
  '1-0': { label: 'hero', build: (imgs) => single(imgs[0]!) },
  '0-1': { label: 'single-v', build: (imgs) => single(imgs[0]!) },

  // --- 2-item ---
  '2-0': {
    label: 'h-pair',
    build: (imgs) => hPair(single(imgs[0]!), single(imgs[1]!)),
  },
  '1-1': {
    label: 'dom-sec',
    build: (imgs) => hPair(single(imgs[0]!), single(imgs[1]!)),
  },
  '0-2': {
    label: 'v-pair',
    build: (imgs) => hPair(single(imgs[0]!), single(imgs[1]!)),
  },

  // --- 3-item ---
  '3-0': { label: 'triple-h', build: (imgs) => hChain(imgs) },
  '2-1': { label: 'dom-stacked-2h1v', build: buildDominantStacked },
  '1-2': { label: 'dom-stacked-1h2v', build: buildDominantStacked },
  '0-3': { label: 'chain-3v', build: (imgs) => hChain(imgs) },

  // --- 4-item ---
  '4-0': { label: 'chain-4h', build: (imgs) => hChain(imgs) },
  '3-1': { label: 'chain-3h1v', build: (imgs) => hChain(imgs) },
  '2-2': { label: 'chain-2h2v', build: (imgs) => hChain(imgs) },
  '1-3': { label: 'nested-quad-1h3v', build: buildNestedQuad },
  '0-4': { label: 'nested-quad-0h4v', build: buildNestedQuad },

  // --- 5-item ---
  '5-0': { label: 'chain-5h', build: (imgs) => hChain(imgs) },
  '4-1': { label: 'chain-4h1v', build: (imgs) => hChain(imgs) },
  '3-2': { label: 'chain-3h2v', build: (imgs) => hChain(imgs) },
  '2-3': { label: 'chain-2h3v', build: (imgs) => hChain(imgs) },
  '1-4': { label: 'chain-1h4v', build: (imgs) => hChain(imgs) },
  '0-5': { label: 'chain-0h5v', build: (imgs) => hChain(imgs) },
};

// =============================================================================
// COMPOSITION LOOKUP
// =============================================================================

/** Result of a template map lookup */
export interface CompositionResult {
  composition: AtomicComponent;
  label: string;
}

/**
 * Look up and build a composition for a set of images using the template map.
 *
 * @param images - ImageType[] assigned to this row (already determined by greedy fill)
 * @returns CompositionResult with AtomicComponent tree and template label
 */
export function lookupComposition(images: ImageType[]): CompositionResult {
  const key = getTemplateKey(images);
  const template = TEMPLATE_MAP[key];

  if (!template) {
    console.warn(`No template for key "${key}", falling back to hChain`);
    return { composition: hChain(images), label: 'chain-fallback' };
  }

  return { composition: template.build(images), label: template.label };
}

// =============================================================================
// BACKWARD-COMPATIBLE PATTERN NAME DERIVATION
// =============================================================================

/**
 * Derive a backward-compatible CombinationPattern from a row's images and fill.
 * Replicates the old pattern matching criteria so existing consumers of patternName
 * continue to work. Removed when CombinationPattern is dropped.
 */
function derivePatternName(
  items: AnyContentModel[],
  rowWidth: number
): CombinationPattern {
  const fill =
    items.reduce(
      (sum, item) => sum + getItemComponentValue(item, rowWidth),
      0
    ) / rowWidth;
  const isComplete = fill >= MIN_FILL_RATIO && fill <= MAX_FILL_RATIO;

  if (items.length === 1) {
    const item = items[0]!;
    const rating = getItemRating(item, rowWidth);
    if (getOrientation(item) === 'horizontal' && rating >= 5 && isComplete) {
      return CombinationPattern.STANDALONE;
    }
    return CombinationPattern.FORCE_FILL;
  }

  if (!isComplete) {
    return CombinationPattern.FORCE_FILL;
  }

  if (items.length === 2) {
    const o0 = getOrientation(items[0]!);
    const o1 = getOrientation(items[1]!);
    const r0 = getItemRating(items[0]!, rowWidth);
    const r1 = getItemRating(items[1]!, rowWidth);

    if (
      o0 === 'horizontal' &&
      o1 === 'horizontal' &&
      r0 >= 3 &&
      r0 <= 4 &&
      r1 >= 3 &&
      r1 <= 4 &&
      Math.abs(r0 - r1) <= 1
    ) {
      return CombinationPattern.HORIZONTAL_PAIR;
    }

    if (
      o0 === 'vertical' &&
      o1 === 'vertical' &&
      r0 <= 4 &&
      r1 <= 4 &&
      Math.abs(r0 - r1) <= 2
    ) {
      return CombinationPattern.VERTICAL_PAIR;
    }

    if (o0 === 'horizontal' && r0 >= 4 && o1 === 'vertical' && r1 <= 3) {
      return CombinationPattern.DOMINANT_SECONDARY;
    }

    return CombinationPattern.FORCE_FILL;
  }

  if (items.length === 3) {
    const ratings = items.map((item) => getItemRating(item, rowWidth));
    const orientations = items.map((item) => getOrientation(item));

    if (
      orientations[0] === 'horizontal' &&
      ratings[0]! >= 4 &&
      ratings[1]! <= 3 &&
      ratings[2]! <= 3
    ) {
      return CombinationPattern.DOMINANT_VERTICAL_PAIR;
    }

    if (
      orientations.every((o) => o === 'horizontal') &&
      ratings.every((r) => r! >= 2 && r! <= 3) &&
      Math.max(...(ratings as number[])) -
        Math.min(...(ratings as number[])) <=
        1
    ) {
      return CombinationPattern.TRIPLE_HORIZONTAL;
    }

    if (ratings.every((r) => r! <= 2)) {
      const allSame = ratings.every((r) => r === ratings[0]);
      if (allSame) {
        return CombinationPattern.MULTI_SMALL;
      }
    }

    return CombinationPattern.FORCE_FILL;
  }

  return CombinationPattern.FORCE_FILL;
}

// =============================================================================
// buildRows
// =============================================================================

/** Derive direction from AtomicComponent root for RowResult */
function deriveDirection(
  ac: AtomicComponent
): 'horizontal' | 'vertical' | null {
  if (ac.type === 'single') return null;
  return ac.direction === 'H' ? 'horizontal' : 'vertical';
}

/**
 * Row-first layout algorithm.
 *
 * Builds rows one at a time using a working window (lookahead of 5 items).
 * For each row:
 * 1. Check for STANDALONE skip (hero image past low-rated items)
 * 2. Greedy sequential fill until row is complete or overshoots
 * 3. Best-fit fallback when sequential fill fails
 * 4. Template map lookup for layout structure
 *
 * @param items - All content items to layout
 * @param rowWidth - Row width budget (5 for desktop, 4 for tablet, etc.)
 * @returns Array of rows, each with components and their combination direction
 */
export function buildRows(
  items: AnyContentModel[],
  rowWidth: number
): RowResult[] {
  const rows: RowResult[] = [];
  const remaining = [...items];

  while (remaining.length > 0) {
    const window = remaining.slice(0, 5);

    // --- STANDALONE skip check ---
    // If item 0 is low-rated (effectiveRating ≤ 2), search ahead for a hero
    // that fills the row solo.
    const item0Rating = getItemRating(window[0]!, rowWidth);
    const LOW_RATED_THRESHOLD = 2;

    if (item0Rating <= LOW_RATED_THRESHOLD) {
      const maxSearch = Math.min(3, window.length);
      let heroIdx = -1;

      for (let i = 1; i < maxSearch; i++) {
        const candidate = window[i]!;
        const cv = getItemComponentValue(candidate, rowWidth);
        if (cv / rowWidth >= MIN_FILL_RATIO) {
          heroIdx = i;
          break;
        }
      }

      if (heroIdx >= 0) {
        const heroItem = window[heroIdx]!;
        const heroImg = toImageType(heroItem, rowWidth);
        const composition = single(heroImg);
        const boxTree = acToBoxTree(composition);

        rows.push({
          components: [heroItem],
          direction: null,
          patternName: CombinationPattern.STANDALONE,
          boxTree,
        });

        remaining.splice(heroIdx, 1);
        continue;
      }
    }

    // --- Greedy sequential fill ---
    let seqTotal = 0;
    let seqCount = 0;
    let seqFailed = false;

    for (let i = 0; i < window.length; i++) {
      const cv = getItemComponentValue(window[i]!, rowWidth);
      const newFill = (seqTotal + cv) / rowWidth;

      if (newFill > MAX_FILL_RATIO) {
        seqFailed = seqTotal / rowWidth < MIN_FILL_RATIO;
        break;
      }

      seqTotal += cv;
      seqCount = i + 1;
      if (newFill >= MIN_FILL_RATIO) break;
    }

    if (!seqFailed && seqCount > 0) {
      const rowItems = window.slice(0, seqCount);
      const rowImgs = rowItems.map((item) => toImageType(item, rowWidth));
      const { composition } = lookupComposition(rowImgs);
      const boxTree = acToBoxTree(composition);

      rows.push({
        components: rowItems,
        direction: deriveDirection(composition),
        patternName: derivePatternName(rowItems, rowWidth),
        boxTree,
      });

      remaining.splice(0, seqCount);
      continue;
    }

    // --- Best-fit fallback ---
    const bfComponents: AnyContentModel[] = [];
    const bfUsedIndices: number[] = [];
    const available = new Set(window.map((_, i) => i));

    bfComponents.push(window[0]!);
    bfUsedIndices.push(0);
    available.delete(0);

    if (!isRowComplete(bfComponents, rowWidth)) {
      while (available.size > 0) {
        const currentTotal = getTotalCV(bfComponents, rowWidth);
        const gap = rowWidth - currentTotal;

        let bestIndex = -1;
        let bestDistance = Infinity;

        for (const idx of available) {
          const item = window[idx];
          if (!item) continue;
          const cv = getItemComponentValue(item, rowWidth);
          const distance = Math.abs(cv - gap);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = idx;
          }
        }

        if (bestIndex === -1) break;

        const candidateCV = getItemComponentValue(
          window[bestIndex]!,
          rowWidth
        );
        const newTotal = currentTotal + candidateCV;
        const newFill = newTotal / rowWidth;

        if (newFill > MAX_FILL_RATIO) {
          const currentFill = currentTotal / rowWidth;
          const underfillDistance = Math.abs(1.0 - currentFill);
          const overfillDistance = Math.abs(1.0 - newFill);

          if (
            currentFill >= MIN_FILL_RATIO ||
            underfillDistance <= overfillDistance
          ) {
            break;
          }
          bfComponents.push(window[bestIndex]!);
          bfUsedIndices.push(bestIndex);
          break;
        }

        bfComponents.push(window[bestIndex]!);
        bfUsedIndices.push(bestIndex);
        available.delete(bestIndex);

        if (isRowComplete(bfComponents, rowWidth)) {
          break;
        }
      }
    }

    const bfImgs = bfComponents.map((item) => toImageType(item, rowWidth));
    const { composition } = lookupComposition(bfImgs);
    const boxTree = acToBoxTree(composition);

    rows.push({
      components: bfComponents,
      direction: deriveDirection(composition),
      patternName: derivePatternName(bfComponents, rowWidth),
      boxTree,
    });

    const sortedIndices = [...bfUsedIndices].sort((a, b) => b - a);
    for (const idx of sortedIndices) {
      remaining.splice(idx, 1);
    }
  }

  return rows;
}
