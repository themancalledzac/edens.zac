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
import { getEffectiveRating, getItemComponentValue } from '@/app/utils/contentRatingUtils';
import { getAspectRatio } from '@/app/utils/contentTypeGuards';
import { calculateBoxTreeAspectRatio } from '@/app/utils/rowStructureAlgorithm';

// =============================================================================
// TYPES
// =============================================================================

/** Recursive tree structure for rendering combinations */
export type BoxTree =
  | { type: 'leaf'; content: AnyContentModel }
  | {
      type: 'combined';
      direction: 'horizontal' | 'vertical';
      children: [BoxTree, BoxTree];
    };

// =============================================================================
// TEMPLATE KEY — structural identity for row compositions
// =============================================================================

/** Structural key for template map lookup: counts of H and V images in a row */
export interface TemplateKey {
  h: number;
  v: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate the total component value of a set of items.
 */
function getTotalCV(components: AnyContentModel[], rowWidth: number): number {
  return components.reduce((sum, item) => sum + getItemComponentValue(item, rowWidth), 0);
}

// =============================================================================
// isRowComplete
// =============================================================================

/** Minimum fill ratio for a row to be considered complete */
export const MIN_FILL_RATIO = 0.9;
/** Maximum fill ratio — rows exceeding this are rejected to prevent item squeezing */
export const MAX_FILL_RATIO = 1.15;
/** Effective rating at or below which an item is considered low-rated for standalone skip */
export const LOW_RATED_THRESHOLD = 2;

/**
 * Check if a set of components fills a row within acceptable bounds.
 *
 * A row is "complete" when fill is between 90% and 115% of row width.
 *
 * @param components - Items to check
 * @param rowWidth - Row width budget (e.g., 5 for desktop)
 * @returns true if total component value is within 90-115% of row width
 */
export function isRowComplete(components: AnyContentModel[], rowWidth: number): boolean {
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
  templateKey: TemplateKey;
  label: string;
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

// =============================================================================
// ARCHITECTURE HELPERS
// =============================================================================

/** Convert AnyContentModel to ImageType for composition decisions */
export function toImageType(item: AnyContentModel, rowWidth: number): ImageType {
  const ar: OrientationShort = getAspectRatio(item) > 1.0 ? 'H' : 'V';
  const effectiveRating = getEffectiveRating(item);
  const componentValue = getItemComponentValue(item, rowWidth);
  const title = 'title' in item ? String(item.title) : `item-${item.id}`;

  return { source: item, title, ar, effectiveRating, componentValue };
}

/** Create a single-image AtomicComponent */
export function single(img: ImageType): AtomicComponent {
  return { type: 'single', img };
}

/** Create a horizontal pair */
export function hPair(left: AtomicComponent, right: AtomicComponent): AtomicComponent {
  return { type: 'pair', direction: 'H', children: [left, right] };
}

/** Create a vertical stack */
export function vStack(top: AtomicComponent, bottom: AtomicComponent): AtomicComponent {
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
// buildAtomic — AR-target scoring for tree structure selection
// =============================================================================

/** A component being iteratively merged in bottom-up composition */
interface MergeComponent {
  ac: AtomicComponent;
  maxRating: number;
}

/**
 * Build an AR-aware AtomicComponent tree using bottom-up atomic composition.
 *
 * Iteratively merges the two lowest-maxRating nearby components:
 * 1. Start with every image as a single atom, in natural input order
 * 2. Score all adjacent pairs (and skip-one pairs with a penalty)
 * 3. Merge the best pair — try both hPair and vStack, pick closest to targetAR
 * 4. The merged component inherits the max rating of its children
 * 5. Repeat until 1 component remains
 *
 * This ensures higher-rated images are merged last (occupying more space)
 * while preserving natural input order with minimal positional shifts.
 */
export function buildAtomic(
  images: ImageType[],
  targetAR: number,
  rowWidth: number
): AtomicComponent {
  if (images.length === 0) throw new Error('buildAtomic requires at least 1 image');
  if (images.length === 1) return single(images[0]!);

  const components: MergeComponent[] = images.map(img => ({
    ac: single(img),
    maxRating: img.effectiveRating,
  }));

  while (components.length > 1) {
    let bestIdx = 0;
    let bestScore = Infinity;

    // Score adjacent pairs (distance 1) — merge lowest-rated adjacent pair first
    for (let i = 0; i < components.length - 1; i++) {
      const score = Math.max(components[i]!.maxRating, components[i + 1]!.maxRating);
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    const left = components[bestIdx]!;
    const right = components[bestIdx + 1]!;

    // Final merge (top level) always uses hPair — rows are horizontal.
    // Inner merges pick best of hPair/vStack for sub-component compaction.
    const merged =
      components.length === 2
        ? hPair(left.ac, right.ac)
        : pickBestMerge(left.ac, right.ac, targetAR, rowWidth);

    components.splice(bestIdx, 2, {
      ac: merged,
      maxRating: Math.max(left.maxRating, right.maxRating),
    });
  }

  return components[0]!.ac;
}

/**
 * Merge two AtomicComponents, picking the better of hPair vs vStack by AR fit.
 */
function pickBestMerge(
  left: AtomicComponent,
  right: AtomicComponent,
  targetAR: number,
  rowWidth: number
): AtomicComponent {
  const h = hPair(left, right);
  const v = vStack(left, right);
  const hAR = calculateBoxTreeAspectRatio(acToBoxTree(h), rowWidth);
  const vAR = calculateBoxTreeAspectRatio(acToBoxTree(v), rowWidth);
  return Math.abs(hAR - targetAR) <= Math.abs(vAR - targetAR) ? h : v;
}

// =============================================================================
// compose — composition dispatcher
// =============================================================================

/**
 * Composition dispatcher — delegates to buildAtomic for all sizes.
 */
export function compose(images: ImageType[], targetAR: number, rowWidth: number): AtomicComponent {
  return buildAtomic(images, targetAR, rowWidth);
}

// =============================================================================
// estimateRowAR — quick AR estimate for a set of images
// =============================================================================

/** AR floor multiplier: row AR must be at least targetAR * this value */
export const AR_FLOOR_MULTIPLIER = 0.7;

/** Maximum images per row (safety cap for AR-aware fill) */
export const MAX_ROW_IMAGES = 8;

/**
 * Estimate the combined aspect ratio of a set of images when composed together.
 * Uses compose() to build the tree, then calculates AR from the BoxTree.
 */
export function estimateRowAR(images: ImageType[], targetAR: number, rowWidth: number): number {
  const composition = compose(images, targetAR, rowWidth);
  return calculateBoxTreeAspectRatio(acToBoxTree(composition), rowWidth);
}

// =============================================================================
// COMPOSITION LOOKUP
// =============================================================================

/** Result of a template map lookup */
export interface CompositionResult {
  composition: AtomicComponent;
  templateKey: TemplateKey;
  label: string;
}

/** Count horizontal and vertical orientations in a set of images */
function countOrientations(images: ImageType[]): TemplateKey {
  let h = 0;
  let v = 0;
  for (const img of images) {
    if (img.ar === 'H') h++;
    else v++;
  }
  return { h, v };
}

/**
 * Build a composition for a set of images using bottom-up atomic composition.
 *
 * @param images - ImageType[] assigned to this row (already determined by greedy fill)
 * @param targetAR - Target aspect ratio for AR-aware composition (default 1.5)
 * @param rowWidth - Row width budget for AR calculation
 * @returns CompositionResult with AtomicComponent tree, structural key, and label
 */
export function lookupComposition(
  images: ImageType[],
  targetAR: number = 1.5,
  rowWidth: number = 5
): CompositionResult {
  const templateKey = countOrientations(images);
  const composition = buildAtomic(images, targetAR, rowWidth);
  return { composition, templateKey, label: `compose-${images.length}` };
}

// =============================================================================
// buildRows
// =============================================================================

/** Collect non-skipped items from a window for row building */
function collectRowItems(
  window: AnyContentModel[],
  count: number,
  skippedStandalones: number[]
): AnyContentModel[] {
  const items: AnyContentModel[] = [];
  let taken = 0;
  for (let i = 0; i < window.length && taken < count; i++) {
    if (!skippedStandalones.includes(i)) {
      items.push(window[i]!);
      taken++;
    }
  }
  return items;
}

/** Derive direction from AtomicComponent root for RowResult */
export function deriveDirection(ac: AtomicComponent): 'horizontal' | 'vertical' | null {
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
 * Standalone promotion: if the next item would overfill AND it fills a row on its
 * own (cv >= rowWidth * MIN_FILL_RATIO), skip it so it gets its own row on a
 * subsequent iteration. This replaces the old reorderLonelyVerticals pre-pass.
 *
 * On mobile (rowWidth <= 2), the AR-floor check is disabled entirely. Mobile renders
 * items full-width or stacked, so single vertical images naturally have low AR.
 * Without this, the AR override pulls 3-4+ items into a single row, creating
 * excessively cramped images.
 *
 * @param items - All content items to layout
 * @param rowWidth - Row width budget (5 for desktop, 4 for tablet, etc.)
 * @param targetAR - Target aspect ratio for AR-aware fill (default 1.5)
 * @returns Array of rows, each with components and their combination direction
 */
export function buildRows(
  items: AnyContentModel[],
  rowWidth: number,
  targetAR: number = 1.5
): RowResult[] {
  const rows: RowResult[] = [];
  const remaining = [...items];

  while (remaining.length > 0) {
    const window = remaining.slice(0, 5);

    const item0Rating = getEffectiveRating(window[0]!);

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

        const heroKey = countOrientations([heroImg]);
        rows.push({
          components: [heroItem],
          direction: null,
          templateKey: heroKey,
          label: 'hero',
          boxTree,
        });

        remaining.splice(heroIdx, 1);
        continue;
      }
    }

    const arFloor = rowWidth <= 2 ? 0 : targetAR * AR_FLOOR_MULTIPLIER;
    const expandedWindow = remaining.slice(0, MAX_ROW_IMAGES);
    let seqTotal = 0;
    let seqCount = 0;
    let seqFailed = false;
    const skippedStandalones: number[] = [];
    let slotCountComplete = false;

    for (let i = 0; i < expandedWindow.length; i++) {
      const cv = getItemComponentValue(expandedWindow[i]!, rowWidth);
      const newFill = (seqTotal + cv) / rowWidth;

      if (newFill > MAX_FILL_RATIO && !slotCountComplete) {
        if (seqCount > 0 && cv / rowWidth >= MIN_FILL_RATIO) {
          skippedStandalones.push(i);
          continue;
        }
        seqFailed = seqTotal / rowWidth < MIN_FILL_RATIO;
        break;
      }

      if (slotCountComplete) {
        seqTotal += cv;
        seqCount += 1;

        // Re-check AR with the expanded set
        const expandedItems = collectRowItems(expandedWindow, seqCount, skippedStandalones);
        const expandedImgs = expandedItems.map(item => toImageType(item, rowWidth));
        const expandedAR = estimateRowAR(expandedImgs, targetAR, rowWidth);
        if (expandedAR >= arFloor) break;
        continue;
      }

      seqTotal += cv;
      seqCount += 1;

      if (newFill >= MIN_FILL_RATIO) {
        const rowItems = collectRowItems(expandedWindow, seqCount, skippedStandalones);
        const rowImgs = rowItems.map(item => toImageType(item, rowWidth));
        const rowAR = estimateRowAR(rowImgs, targetAR, rowWidth);

        if (rowAR >= arFloor) {
          break;
        }
        slotCountComplete = true;
      }
    }

    if (!seqFailed && seqCount > 0) {
      const rowItems = collectRowItems(expandedWindow, seqCount, skippedStandalones);
      const rowImgs = rowItems.map(item => toImageType(item, rowWidth));
      const { composition, templateKey, label } = lookupComposition(rowImgs, targetAR, rowWidth);
      const boxTree = acToBoxTree(composition);

      rows.push({
        components: rowItems,
        direction: deriveDirection(composition),
        templateKey,
        label,
        boxTree,
      });

      const usedIndices = new Set<number>();
      let t = 0;
      for (let i = 0; i < expandedWindow.length && t < seqCount; i++) {
        if (!skippedStandalones.includes(i)) {
          usedIndices.add(i);
          t++;
        }
      }
      const sortedUsed = [...usedIndices].sort((a, b) => b - a);
      for (const idx of sortedUsed) {
        remaining.splice(idx, 1);
      }
      continue;
    }

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

        const candidateCV = getItemComponentValue(window[bestIndex]!, rowWidth);
        const newTotal = currentTotal + candidateCV;
        const newFill = newTotal / rowWidth;

        if (newFill > MAX_FILL_RATIO) {
          const currentFill = currentTotal / rowWidth;
          const underfillDistance = Math.abs(1.0 - currentFill);
          const overfillDistance = Math.abs(1.0 - newFill);

          if (currentFill >= MIN_FILL_RATIO || underfillDistance <= overfillDistance) {
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

    const bfImgs = bfComponents.map(item => toImageType(item, rowWidth));
    const {
      composition,
      templateKey: bfKey,
      label: bfLabel,
    } = lookupComposition(bfImgs, targetAR, rowWidth);
    const boxTree = acToBoxTree(composition);

    rows.push({
      components: bfComponents,
      direction: deriveDirection(composition),
      templateKey: bfKey,
      label: bfLabel,
      boxTree,
    });

    const sortedIndices = [...bfUsedIndices].sort((a, b) => b - a);
    for (const idx of sortedIndices) {
      remaining.splice(idx, 1);
    }
  }

  return rows;
}
